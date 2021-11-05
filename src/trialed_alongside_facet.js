// Frequently trialed alongside (top-3 after position 1)
db.trials.aggregate([{
    "$searchMeta": {
        "index": "default",
        "facet": {
            "operator": {
                "compound": {
                    "filter": [{
                        "queryString": {
                            "defaultPath": "intervention_mesh_term",
                            "query": "Dexamethasone"
                        }
                    }]
                }
            },
            "facets": {
                "trialedWithFacet": {
                    "type": "string",
                    "path": "intervention_mesh_term",
                    "numBuckets": 4
                }
            }
        }
    }
}, {
    "$addFields": {
        "meta": "$$SEARCH_META"
    }
}])


db.drugs.aggregate([{
    "$searchMeta": {
        "index": "default",
        "facet": {
            "operator": {
                "exists": {
                    "filter": [{
                        "queryString": {
                            "defaultPath": "intervention_mesh_term",
                            "query": "Dexamethasone"
                        }
                    }]
                }
            },
            "facets": {
                "trialedWithFacet": {
                    "type": "string",
                    "path": "intervention_mesh_term",
                    "numBuckets": 4
                }
            }
        }
    }
}