#!/bin/bash

#------------------------------------------------------------------------------#
# This script sets up the MongoRx demo environment. It performs the following  #
# tasks:                                                                       #
#  - Check and optionally install prerequisits                                 #
#  - Download the XML dataset from clinicaltrials.gov and converts it to JSON  #
#  - Import JSON dataset to Atlas and execute a number of aggregation          #
#    pipelines to convert string-formatted dates to BSON date types and a few  #
#    other data cleanup tasks
#------------------------------------------------------------------------------#
# Date          Version      Author         Notes                              #
#------------------------------------------------------------------------------#
# 11-01-2021    1.0          Roy Kiesler    Initial version                    #
# 12-09-2021    1.1          Roy Kiesler    Reduce size of drug dataset        #
#------------------------------------------------------------------------------#

#------------------------------------------------------------------------------#
# This function verifies the config settings in env.config and that all CLI    #
# commands used are installed. If any CLI is missing, an option to install it  #
# is presented if one is available.                                            #
#------------------------------------------------------------------------------#
source ./env.config
checkPrerequisites() {
    echo "Checking prerequisites..."

    # verify Atlas API key
    if [[ "$ATLAS_API_PUBLIC_KEY" =~ ^\[.*\]$ || "$ATLAS_API_PRIVATE_KEY" =~ ^\[.*\]$ ]]; then
        echo >&2 "🛑 An API key is required to access Atlas. Please update env.config"
        echo >&2 "   See see https://docs.atlas.mongodb.com/configure-api-access/"
        exit 1
    else
        echo "✅ Atlas API key"
    fi

    # verify Atlas project
    if [[ "$ATLAS_GROUP_ID" =~ ^\[.*\]$ ]]; then
        echo >&2 "🛑 Please specify your Atlas project ID in env.config"
        exit 1
    else
        echo "✅ Atlas project"
    fi

    # verify Atlas cluster name
    if [[ "$ATLAS_CLUSTER_NAME" =~ ^\[.*\]$ ]]; then
        echo >&2 "🛑 Please specify your Atlas cluster name in env.config"
        exit 1
    else
        echo "✅ Atlas cluster"
    fi

    # verify Atlas cluster connector string
    if [[ "$ATLAS_CONN_STR" =~ ^\[.*\]$ ]]; then
        echo >&2 "🛑 Please specify your Atlas cluster connection string in env.config"
        exit 1
    else
        echo "✅ Atlas cluster connection string"
    fi

    # test curl
    (type curl >/dev/null 2>&1 && echo "✅ curl") || {
        echo >&2 "curl is not installed. Would you like to install it? [y/n]";
        read INSTALL_CURL
        if [[ "$INSTALL_CURL" == "y" || "$INSTALL_CURL" == "Y" ]]; then
            brew install curl
        else
            echo >&2 "🛑 Please install curl and try again"
            echo >&2 "   See https://formulae.brew.sh/formula/curl"
            exit 1
        fi
    }

    # test unzip
    (type unzip >/dev/null 2>&1 && echo "✅ unzip") || {
        echo >&2 "unzip is not installed. Would you like to install it? [y/n]";
        read INSTALL_UNZIP
        if [[ "$INSTALL_UNZIP" == "y" || "$INSTALL_UNZIP" == "Y" ]]; then
            brew install unzip
        else
            echo >&2 "🛑 Please install unzip and try again"
            echo >&2 "   See https://formulae.brew.sh/formula/unzip"
            exit 1
        fi
    }

    # test jq
    (type jq >/dev/null 2>&1 && echo "✅ jq") || {
        echo >&2 "jq is not installed. Would you like to install it? [y/n]";
        read INSTALL_JQ
        if [[ "$INSTALL_JQ" == "y" || "$INSTALL_JQ" == "Y" ]]; then
            brew install jq
        else
            echo >&2 "🛑 Please install jq and try again"
            echo >&2 "   See https://stedolan.github.io/jq/download/"
            exit 1
        fi
    }

    # test mongocli
    (type mongocli >/dev/null 2>&1 && echo "✅ mongocli") || {
        echo >&2 "mongocli is not installed. Would you like to install it? [y/n]"
        read INSTALL_MONGOCLI
        if [[ "$INSTALL_MONGOCLI" == "y" || "$INSTALL_MONGOCLI" == "Y" ]]; then
            brew tap mongodb/brew
            brew install mongocli
        else
            echo >&2 "🛑 Please install mongocli and try again"
            echo >&2 "   See https://docs.mongodb.com/mongocli/stable/install/"
            exit 1
        fi
    }

    # test mongosh
    (type mongosh >/dev/null 2>&1 && echo "✅ mongosh") || {
        echo >&2 "mongosh is not installed. Would you like to install it? [y/n]"
        read INSTALL_MONGOSH
        if [[ "$INSTALL_MONGOSH" == "y" || "$INSTALL_MONGOSH" == "Y" ]]; then
            brew install mongosh
        else
            echo >&2 "🛑 Please install mongosh and try again"
            echo >&2 "   See https://docs.mongodb.com/mongodb-shell/install/"
            exit 1
        fi
    }

    # test node/npm
    (type node >/dev/null 2>&1 && type npm >/dev/null 2>&1 && echo "✅ node/npm") || {
        echo >&2 "🛑 Please install node.js and try again"
        echo >&2 "   See https://nodejs.org/en/download/"
        exit 1
    }

    # test realm-cli
    (type realm-cli >/dev/null 2>&1 && echo "✅ realm-cli") || {
        echo >&2 "realm-cli is not installed. Would you like to install it? [y/n]";
        read INSTALL_REALMCLI
        if [[ "$INSTALL_REALMCLI" == "y" || "$INSTALL_REALMCLI" == "Y" ]]; then
            type npm >/dev/null 2>&1 || {
                echo >&2 "🛑 npm is not installed and is required to install realm-cli. Please install npm and try again"
                echo >&2 "   See https://nodejs.org/en/"
                exit 1
            }
            npm install -g mongodb-realm-cli
        else
            echo >&2 "🛑 Please install realm-cli and try again. See https://docs.mongodb.com/realm/deploy/realm-cli-reference/";
            exit 1;
        fi
    }

    echo ""
}

#----------------------------------------------------------#
# This function sets the project ID and public/private API #
# key config settings in mongocli.
#----------------------------------------------------------#
configureMongoCli() {
    echo "🖥  Configuring mongocli..."
    mongocli config set project_id ${ATLAS_GROUP_ID}
    mongocli config set public_api_key ${ATLAS_API_PUBLIC_KEY}
    mongocli config set private_api_key ${ATLAS_API_PRIVATE_KEY}
    echo ""
}

#-----------------------------------------------------------#
# This function sets the public/private API keys config     #
# settings in realm-cli.                                    #
#-----------------------------------------------------------#
configureRealmCli() {
    echo "🖥  Configuring realm-cli..."
    realm-cli login -y --api-key "${ATLAS_API_PUBLIC_KEY}" --private-api-key "${ATLAS_API_PRIVATE_KEY}"
    echo ""
}

#-----------------------------------------------------------#
# This function imports the Realm app into the Atlas        #
# project specified in env.config.                          #
#-----------------------------------------------------------#
importRealmApp() {
    # configure realm-cli
    configureRealmCli

    # change cluster name in app's config.json
    pushd ../realm/data_sources/mongodb-atlas >/dev/null 2>&1
    jsonStr=`cat config.json | jq`  >/dev/null 2>&1
    jsonStr=$(jq '.config.clusterName = env.ATLAS_CLUSTER_NAME' <<<"$jsonStr")  >/dev/null 2>&1
    echo $jsonStr | jq > config.tmp && mv config.tmp config.json
    popd >/dev/null 2>&1

    # import the app
    realm-cli push --local ../realm --remote ClinTrialGQL -y
    echo -e "Updated app ID: `realm-cli apps list -f json | jq -r '.data[]'`"

    # done
    popd >/dev/null 2>&1
    echo -e "\n"
}

#-----------------------------------------------------------#
# This function downloads the trial dataset from            #
# clinicaltrials.gov and extracts the XML data              #
#-----------------------------------------------------------#
downloadTrialDataset() {
    pushd ../data 1> /dev/null
    mkdir -p trials
    echo -e "\n💾 Downloading trial dataset..."
    curl https://clinicaltrials.gov/AllPublicXML.zip --output trials/AllPublicXML.zip
    echo -e "\n🗜 Extracting archive...\n"
    pushd trials 1> /dev/null
    unzip -o -q AllPublicXML.zip
    popd 1> /dev/null
    popd 1> /dev/null
}

#-----------------------------------------------------------#
# This function downloads the drug datasets from            #
# ope.fda.gov and extracts the JSON data                    #
#-----------------------------------------------------------#
downloadDrugDatasets() {
    pushd ../data 1> /dev/null
    mkdir -p drugs
    echo -e "\n💾 Downloading drug datasets...\n"
    for i in {1..10}
    do
        if [ "$i" -lt 10 ]; then
            curl "https://download.open.fda.gov/drug/label/drug-label-000${i}-of-0010.json.zip" --output drugs/${i}of10.zip
        else
            curl "https://download.open.fda.gov/drug/label/drug-label-00${i}-of-0010.json.zip" --output drugs/${i}of10.zip
        fi
    done
    pushd drugs 1> /dev/null
    echo -e "\n🗜 Extracting archives...\n"
    for i in {1..10}
    do
        unzip -o -q ${i}of10.zip
    done
    popd 1> /dev/null
    popd 1> /dev/null
}

#-----------------------------------------------------------#
# This function imports the drug data files into Atlas.     #
# Drugs without a brand name property are excluded. Also,   #
# the fields containing the HTML rendition of raw data are  #
# removed to keep the dataset size as small as possible.    #
#-----------------------------------------------------------#
importDrugData() {
    pushd ../data/drugs 1> /dev/null
    for i in {1..9}
    do
        echo -e "\n🌱 Importing drug data part ${i} of 10...\n"
        cat drug-label-000${i}-of-0010.json | jq -r -c '.results[] | select(.openfda.brand_name != null) | {id, active_ingredient, effective_time, indications_and_usage, description, openfda}' | mongoimport "${ATLAS_CONN_STR}" --db ClinicalTrials --collection drug_data --numInsertionWorkers=6
    done
    echo -e "\n🌱 Importing drug data part 10 of 10...\n"
    cat drug-label-0010-of-0010.json | jq -r -c '.results[] | select(.openfda.brand_name != null) | {id, active_ingredient, effective_time, indications_and_usage, description, openfda}' | mongoimport "${ATLAS_CONN_STR}" --db ClinicalTrials --collection drug_data --numInsertionWorkers=6
    popd 1> /dev/null
}

#-----------------------------------------------------------#
# This function creates database indexes on selected fields #
#-----------------------------------------------------------#
createDBIndexes() {
    echo -e "\n🗂  Creating index on openfda.brand_name..."
    mongocli atlas clusters index create --clusterName ${ATLAS_CLUSTER_NAME} --db ClinicalTrials --collection drug_data --key openfda.brand_name:1
    echo -e "\n🗂  Creating index on openfda.generic_name..."
    mongocli atlas clusters index create --clusterName ${ATLAS_CLUSTER_NAME} --db ClinicalTrials --collection drug_data --key openfda.generic_name:1
    echo -e "\n🗂  Creating index on openfda.manufacturer_name..."
    mongocli atlas clusters index create --clusterName ${ATLAS_CLUSTER_NAME} --db ClinicalTrials --collection drug_data --key openfda.manufacturer_name:1
    echo -e "\n🗂  Creating index on openfda.route..."
    mongocli atlas clusters index create --clusterName ${ATLAS_CLUSTER_NAME} --db ClinicalTrials --collection drug_data --key openfda.route:1
    echo -e "\n🗂  Creating index on start_date, completion_date..."
    mongocli atlas clusters index create --clusterName ${ATLAS_CLUSTER_NAME} --db ClinicalTrials --collection trials --key start_date:1,completion_date:1
    echo -e "\n🗂  Creating index on gender..."
    mongocli atlas clusters index create --clusterName ${ATLAS_CLUSTER_NAME} --db ClinicalTrials --collection trials --key gender:1
    echo -e "\n🗂  Creating index on nct_id..."
    mongocli atlas clusters index create --clusterName ${ATLAS_CLUSTER_NAME} --db ClinicalTrials --collection trials --key nct_id:1
    echo -e "\n🗂  Creating index on sponsors.agency..."
    mongocli atlas clusters index create --clusterName ${ATLAS_CLUSTER_NAME} --db ClinicalTrials --collection trials --key sponsors.agency:1
    echo -e "\n🗂  Creating index on condition..."
    mongocli atlas clusters index create --clusterName ${ATLAS_CLUSTER_NAME} --db ClinicalTrials --collection trials --key condition:1
    echo -e "\n🗂  Creating index on condition_mesh_term..."
    mongocli atlas clusters index create --clusterName ${ATLAS_CLUSTER_NAME} --db ClinicalTrials --collection trials --key condition_mesh_term:1
    echo -e "\n🗂  Creating index on intervention, intervention_mesh_term..."
    mongocli atlas clusters index create --clusterName ${ATLAS_CLUSTER_NAME} --db ClinicalTrials --collection trials --key intervention:1,intervention_mesh_term:1
}

#-----------------------------------------------------------#
# This function transforms the trial XML data into JSON and #
# imports it into Atlas.                                    #
#-----------------------------------------------------------#
importTrialData() {
    pushd ../data 1> /dev/null
    echo -e "\n📦 Installing node.js dependencies..."
    npm install --save
    echo -e "\n🏭 Converting XML data to JSON..."
    node parseTrialData.js > trials/trials.json
    echo -e "`cat trials/trials.json | wc -l` trials parsed"
    echo -e "\n🌱 Importing trial data...\n"
    cat trials/trials.json | mongoimport "${ATLAS_CONN_STR}" --db ClinicalTrials --collection trials --numInsertionWorkers=6
    popd 1> /dev/null
}

#-----------------------------------------------------------#
# This function creates Atlas Search indexes on the trials  #
# and drug_data collections.                                #
#-----------------------------------------------------------#
createSearchIndexes() {
    pushd .. 1> /dev/null
    echo -e "\n🔍 Creating drugs search index..."
    resp=`curl -s --digest -u ${ATLAS_API_PUBLIC_KEY}:${ATLAS_API_PRIVATE_KEY} \
        -H "Content-Type: application/json" \
        -d @data/drugs_search_index.json \
        "https://cloud.mongodb.com/api/atlas/v1.0/groups/${ATLAS_GROUP_ID}/clusters/${ATLAS_CLUSTER_NAME}/fts/indexes"`
    echo -e "Index `echo $resp | jq -r '.indexID'` is created"

    echo -e "\n🔍 Creating trials search index..."
    resp=`curl -s --digest -u ${ATLAS_API_PUBLIC_KEY}:${ATLAS_API_PRIVATE_KEY} \
        -H "Content-Type: application/json" \
        -d @data/trials_search_index.json \
        "https://cloud.mongodb.com/api/atlas/v1.0/groups/${ATLAS_GROUP_ID}/clusters/${ATLAS_CLUSTER_NAME}/fts/indexes"`
    echo -e "Index `echo $resp | jq -r '.indexID'` is created"
    popd 1> /dev/null
}

#-----------------------------------------------------------#
# This is the actual setup script driver.                   #
#-----------------------------------------------------------#
checkPrerequisites

# configure mongocli
configureMongoCli

# download and expand trial dataset
#downloadTrialDataset

# download and expand drug datasets
#downloadDrugDatasets

# import drug data into Atlas
importDrugData

# import trial data into Atlas
importTrialData

# create DB indexes
createDBIndexes

# tweak schema -- array[1] => string, effective_time str => date
mongosh ${ATLAS_CONN_STR}ClinicalTrials ../data/tweak_schema.js

# create search indexes using
#       `mongocli atlas clusters search indexes create -- bug w/ --file?`
createSearchIndexes

# import Realm app
importRealmApp

# create realm user demo@gmail.com|Passw0rd
realm-cli users create -a ClinTrialGQL --type email --email "demo@gmail.com" --password "Passw0rd"

# TODO: clean data -- active_ingredient (drugs), completion_date (trials)
# check saved aggregations on my cluster

# Charts dashboard must be imported manually
echo -e "📊 NOTE: You need to manually import the dashboard file charts/Clinical Trials.charts to MongoDB Charts, then update the chart IDs and base URL in src/app/dashboard/dashboard.component.ts"

# change graphql auth URL in src/app/graphql.module.ts
echo -e "🔗 NOTE: You need to manually update the GraphQL endpoint URL in src/app/graphql.module.ts to match your Realm application"
