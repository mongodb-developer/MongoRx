#!/bin/bash

#------------------------------------------------------------------------------#
# This script sets up the MongoRx demo environment. It performs the following  #
# tasks:                                                                       #
#  - Check and optionally install prerequisits                                 #
#  - Create an Atlas cluster                                                   #
#  - Download the XML dataset from clinicaltrials.gov and converts it to JSON  #
#  - Import JSON dataset to Atlas and execute a number of aggregation          #
#    pipelines to convert string-formatted dates to BSON date types and a few  #
#    other data cleanup tasks
#------------------------------------------------------------------------------#
# Date          Version      Author         Notes                              #
#------------------------------------------------------------------------------#
# 11-01-2021    1.0          Roy Kiesler    Initial version                    #
#------------------------------------------------------------------------------#

#------------------------------------------------------------------------------#
# This function verifies the config settings in env.config and that all CLI    #
# commands used are installed. If any CLI is missing, an option to install it  #
# is presented if one is available.                                            #
#------------------------------------------------------------------------------#
checkPrerequisites() {
    echo "Checking prerequisites..."
    source env.config

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
# This function creates a new Atlas cluster based on the   #
# parameters specified in env.config.                      #
#----------------------------------------------------------#
createAtlasCluster() {
    # create the cluster
    echo "⛅️ Creating the cluster..."
    local cliResp=`mongocli atlas cluster create "${CLUSTER_NAME}" \
    --provider AWS \
    --region "${ATLAS_REGION}" \
    --tier M20 \
    --output json`
    local rc=$?
    if [[ rc -eq 0 ]]; then
        local clusterState=`echo $cliResp | jq -r ".stateName"`
        if [[ -z "$clusterState" || "$clusterState" == "null" ]]; then
            echo "🛑 Error creating cluster"
            echo $cliResp | jq
            exit 1
        else
            echo -e "⌛️ Cluster ${CLUSTER_NAME} is ${clusterState} and will be ready in a few minutes..."
        fi
    else
        echo "🛑 Error creating cluster"
        echo $cliResp | jq
        exit 1
    fi
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

#----------------------------------------------------------#
# This function sets the region, public/private access     #
# keys and output format config settings in aws CLI.       #
#----------------------------------------------------------#
configureAwsCli() {
    echo "🖥  Configuring aws..."
    aws configure set aws_access_key_id ${AWS_ACCESS_KEY_ID}
    aws configure set aws_secret_access_key ${AWS_SECRET_ACCESS_KEY}
    aws configure set region ${AWS_REGION}
    aws configure set output json
    echo ""
}

#----------------------------------------------------------#
# This function sets the public/private API keys config    #
# settings in realm-cli.                                   #
#----------------------------------------------------------#
configureRealmCli() {
    echo "🖥  Configuring realm-cli..."
    realm-cli login -y --api-key "${ATLAS_API_PUBLIC_KEY}" --private-api-key "${ATLAS_API_PRIVATE_KEY}"
    echo ""
}

#----------------------------------------------------------#
# This function creates a new S3 bucket in the AWS region  #
# specified in env.config. It stores the name of the new   #
# bucket in the S3_BUCKET_NEW variable.                    #
#----------------------------------------------------------#
createS3Bucket() {
    # Configure aws CLI
    configureAwsCli

    # S3 bucket names must be globally unique, so we append a UUID to the
    # the bucket prefix "e2e-player-activity". Buckets also cannot have any
    # UPPERCASE letters in them, so we lowercase the UUID
    local uuid=`uuidgen | tr "[:upper:]" "[:lower:]"`
    local s3bucket="${S3_BUCKET_PREFIX}-$uuid"
    
    # ==> need to update the Realm "e2eS3Bucket" value with the new bucket name before importing
    #     realm-cli secrets update -y --name e2eS3Bucket --value <newBucketName>
    #                              --app-id=e2e-game-offers-app-<xxxxx>

    # Note: Regions outside of us-east-1 require the appropriate `LocationConstraint`
    # to be specified in order to create the bucket in the desired region
    echo "🪣  Creating S3 bucket..."
    local cliResp=`aws s3api create-bucket --bucket "$s3bucket" --region "${AWS_REGION}"`
    local rc=$?
    if [[ rc -eq 0 ]]; then
        echo $cliResp | jq
        S3_BUCKET_NEW=${s3bucket}
    else
        echo "🛑 Error creating S3 bucket"
        echo $cliResp | jq
        exit 1
    fi
    echo ""
}

#----------------------------------------------------------#
# This function imports the Realm app into the Atlas       #
# project specified in env.config.                         #
#----------------------------------------------------------#
importRealmApp() {
    # configure realm-cli
    configureRealmCli

    # save current directory
    pushd backend/realm/e2e-game-offers-app >/dev/null 2>&1

    # import the app
    realm-cli import -y --project-id "${ATLAS_GROUP_ID}" --app-name e2e-game-offers-app  --include-dependencies --strategy replace-by-name

    # save realm app ID

    # update values/secrets (e.g., S3 bucket name -> ${S3_BUCKET_NEW})

    # done
    popd >/dev/null 2>&1
    echo -e "\n"
}

#----------------------------------------------------------#
# This function returns the current status of the Atlas    #
# cluster.                                                 #
#----------------------------------------------------------#
getClusterState() {
    local cliResp=`mongocli atlas clusters describe "${CLUSTER_NAME}"`
    local rc=$?
    if [[ rc -eq 0 ]]; then
        local currState=`echo $cliResp | jq -r ".stateName"`
        echo $currState
    else
        echo $cliResp
        exit 1
    fi
}

#----------------------------------------------------------#
# This function returns the current status of the Atlas    #
# cluster.                                                 #
#----------------------------------------------------------#
isClusterPaused() {
    local cliResp=`mongocli atlas clusters describe "${CLUSTER_NAME}"`
    local rc=$?
    if [[ rc -eq 0 ]]; then
        local paused=`echo $cliResp | jq -r ".paused"`
        echo "$paused"
    else
        echo "false"
    fi
}

#----------------------------------------------------------#
# This function displays a simple progress indicator (...) #
# while waiting for the newly created cluster to be ready. #
#----------------------------------------------------------#
waitForClusterReady() {
    # max wait 15 minutes
    local maxLoops=90
    local i=1

    while [ $i -le $maxLoops ]
    do
        # special case -- if cluster is deleted before it's ready
        if [[ `getClusterState` == "IDLE" ]]; then
            echo -e "\n✅ Cluster is ready\n"
            break
        elif [[ `getClusterState` == "CREATING" ]]; then
            printf "."
        elif [[ `getClusterState` == "REPAIRING" ]]; then
            printf "."
        elif [[ `getClusterState` == "DELETING" ]]; then
            echo -e >&2 "\n🛑 Cluster is deleting -- exiting"
            exit 1
        else
            # something else?
            echo >&2 `getClusterState`
            exit 1
        fi
        sleep 10
        ((i++))
    done
}

#----------------------------------------------------------#
# This is the actual setup script driver.                  #
#----------------------------------------------------------#
checkPrerequisites

# configure mongocli
configureMongoCli

# Check if cluster exists
if [[ `getClusterState` == "IDLE" ]]; then
    echo "exists -- check paused"
    # cluster already exists -- check if paused
    if [[ `isClusterPaused` == "true" ]]; then
        echo "⏯ Cluster is paused -- resuming..."
        mongocli atlas clusters start "${CLUSTER_NAME}" >/dev/null 2>&1
    else
        echo "Cluster already exists"
    fi
# special case, fall through -- waitForClusterReady will handle
elif [[ `getClusterState` == "DELETING" ]]; then
    echo
else
    # Cluster does not exist yet -- create it
    createAtlasCluster
fi

# Wait for cluster to be created/resumed
waitForClusterReady

# create a new S3 bucet
createS3Bucket

# TODO: deploy Google project assets

# TODO: import collection data to Atlas (player email/profile/roster, 
#       snapshots of activity and offer collections)

# TODO: import Realm app
#importRealmApp
