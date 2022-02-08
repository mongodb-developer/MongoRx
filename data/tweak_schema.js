(async function() {
    var pipeline = [{
        "$match": {
            "$and": [
                { "active_ingredient.0": { "$exists": true } },
                { "active_ingredient.1": { "$exists": false } }
            ]
        }}, {
        "$set": {
            "active_ingredient": { "$arrayElemAt": [ "$active_ingredient", 0 ] }
        }}, {
        "$merge": {
            "into": "drug_data",
            "on": "_id",
            "whenMatched": "replace"
        }}
    ];
    print("Flattening active_ingredient...");
    await db.drug_data.aggregate(pipeline);

    pipeline = [{
        "$match": {
            "$and": [
                { "indications_and_usage.0": { "$exists": true } },
                { "indications_and_usage.1": { "$exists": false } }
            ]
        }}, {
        "$set": {
            "indications_and_usage": { "$arrayElemAt": [ "$indications_and_usage", 0 ] }
        }}, {
        "$merge": {
            "into": "drug_data",
            "on": "_id",
            "whenMatched": "replace"
        }}
    ];
    print("Flattening indications_and_usage...");
    await db.drug_data.aggregate(pipeline);

    pipeline = [{
        "$match": {
            "$and": [
                { "description.0": { "$exists": true } },
                { "description.1": { "$exists": false } }
            ]
        }}, {
        "$set": {
            "description": { "$arrayElemAt": [ "$description", 0 ] }
        }}, {
        "$merge": {
            "into": "drug_data",
            "on": "_id",
            "whenMatched": "replace"
        }}
    ];
    print("Flattening description...");
    await db.drug_data.aggregate(pipeline);

    pipeline = [{
        "$match": {
            "$and": [
                { "openfda.brand_name.0": { "$exists": true } },
                { "openfda.brand_name.1": { "$exists": false } }
            ]
        }}, {
        "$set": {
            "openfda.brand_name": { "$arrayElemAt": [ "$openfda.brand_name", 0 ] }
        }}, {
        "$merge": {
            "into": "drug_data",
            "on": "_id",
            "whenMatched": "replace"
        }}
    ];
    print("Flattening openfda.brand_name...");
    await db.drug_data.aggregate(pipeline);

    pipeline = [{
        "$match": {
            "$and": [
                { "openfda.generic_name.0": { "$exists": true } },
                { "openfda.generic_name.1": { "$exists": false } }
            ]
        }}, {
        "$set": {
            "openfda.generic_name": { "$arrayElemAt": [ "$openfda.generic_name", 0 ] }
        }}, {
        "$merge": {
            "into": "drug_data",
            "on": "_id",
            "whenMatched": "replace"
        }}
    ];
    print("Flattening openfda.generic_name...");
    await db.drug_data.aggregate(pipeline);

    pipeline = [{
        "$match": {
            "$and": [
                { "openfda.manufacturer_name.0": { "$exists": true } },
                { "openfda.manufacturer_name.1": { "$exists": false } }
            ]
        }}, {
        "$set": {
            "openfda.manufacturer_name": { "$arrayElemAt": [ "$openfda.manufacturer_name", 0 ] }
        }}, {
        "$merge": {
            "into": "drug_data",
            "on": "_id",
            "whenMatched": "replace"
        }}
    ];
    print("Flattening openfda.manufacturer_name...");
    await await db.drug_data.aggregate(pipeline);
/*
    pipeline = [{
        "$match": {
            "$and": [
                { "openfda.route.0": { "$exists": true } },
                { "openfda.route.1": { "$exists": false } }
            ]
        }}, {
        "$set": {
            "openfda.route": { "$arrayElemAt": [ "$openfda.route", 0 ] }
        }}, {
        "$merge": {
            "into": "drug_data",
            "on": "_id",
            "whenMatched": "replace"
        }}
    ];
    print("Flattening openfda.route...");
    await db.drug_data.aggregate(pipeline);
*/
    pipeline = [{
        "$match": {
            "completion_date": {"$type": "string"}
        }}, {
        "$set": {
            "effective_time": { "$dateFromString": { "dateString": "$effective_time" } }
        }}, {
        "$merge": {
            "into": "drug_data",
            "on": "_id",
            "whenMatched": "replace"
        }
    }];
    print("Converting effective_time from string to date...");
    await db.drug_data.aggregate(pipeline);

    pipeline = [{
        "$match": {
            "completion_date": {"$type": "string"}
        }
    }, {
        "$set": {
            "completion_date": { "$dateFromString": { "dateString": "$completion_date" } }
        }
    }, {
        "$merge": {
            into: "trials",
            on: "_id",
            whenMatched: "replace"
        }
    }];
    print("Converting completion_date from string to date...");
    await db.trials.aggregate(pipeline, { allowDiskUse: true });

    pipeline = [{
        "$match": {
            "start_date": {"$type": "string"}
        }
    }, {
        "$set": {
            "start_date": { "$dateFromString": { "dateString": "$start_date" } }
        }
    }, {
        "$merge": {
            into: "trials",
            on: "_id",
            whenMatched: "replace"
        }
    }];
    print("Converting start_date from string to date...");
    await db.trials.aggregate(pipeline, { allowDiskUse: true });

    pipeline = [{
        "$match": {
            "completion_date": {"$exists": false}
        }
    }, {
        "$set": {
            "completion_date": ISODate("1970-01-01T00:00:00Z")
        }
    }, {
        "$merge": {
            into: "trials",
            on: "_id",
            whenMatched: "replace"
        }
    }];
    print("Setting default completion_date...");
    await db.trials.aggregate(pipeline, { allowDiskUse: true });

    pipeline = [{
        "$match": {
            "$and": [
                { "condition": { "$type": "string" } },
                { "condition.0": { "$exists": false } }
            ]
        }}, {
        "$set": {
            "condition": [ "$condition" ]
        }}, {
        "$merge": {
            "into": "trials",
            "on": "_id",
            "whenMatched": "replace"
        }}
    ];
    print("Converting condition from string to array...");
    await db.trials.aggregate(pipeline, { allowDiskUse: true });

    pipeline = [{
        "$match": {
            "condition.0": {
                "$type": "array"
            }
        }
    }, {
        "$set": {
            "condition": {
                "$arrayElemAt": [
                "$condition", 0
                ]
            }
        }
    }, {
        "$merge": {
            "into": "trials", 
            "on": "_id", 
            "whenMatched": "replace"
        }
    }];
    print("Converting condition from array-of-arrays to array...");
    await db.trials.aggregate(pipeline, { allowDiskUse: true });

    pipeline = [{
        "$match": {
            "enrollment": null
        }
    }, {
        "$set": {
            "enrollment": 0
        }
    }, {
        "$merge": {
            "into": "trials", 
            "on": "_id", 
            "whenMatched": "replace"
        }
    }];
    print("Setting enrollment count default...");
    await db.trials.aggregate(pipeline, { allowDiskUse: true });
})();