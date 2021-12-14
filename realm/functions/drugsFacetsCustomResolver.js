/*
  This function is run when a GraphQL Query is made requesting your
  "facets" custom field name. The return value of this function is
  used to populate the resolver generated from your Payload Type.
*/

exports = async (facetInput) => {
   //const BSON = require('bson');
  const cluster = context.services.get("mongodb-atlas");
  const db = cluster.db("ClinicalTrials");
  const drugsCol = db.collection("drug_data");
  
  const query = facetInput.term || "";
  const filters = facetInput.filters ? facetInput.filters : [];
  const queryString = facetInput.filters ? filtersToQueryString(filters) : "";
  //console.log(`Search term: ${JSON.stringify(query)}`);
  //console.log(`Query string: '${queryString}'`);
  
  let countAllFacets = {
    "$searchMeta": {
      "index": "drugs",
      "exists": {
        "path": "id"
      },
      "count": {
        "type": "total"
      }
    }
  };
  
  let countFacetsWithFilters = {
    "$searchMeta": {
      "index": "drugs",
      "compound": {
        "filter": [{
          "queryString": {
            "defaultPath": "id",
            "query": queryString
          }
        }]
      },
      "count": {
        "type": "total"
      }
    }
  };
  
  let basicFacetsNoTerm = {
    "$searchMeta": {
      "index": "drugs",
      "facet": {
        "operator": {
          "exists": {
            "path": "id"
          }
        },
        "facets": {
          "manufacturers": {
              "type": "string",
              "path": "openfda.manufacturer_name",
              "numBuckets": 10
          },
          "routes": {
              "type": "string",
              "path": "openfda.route",
              "numBuckets": 10
          }
        }
      }
    }
  };
  
  let compoundOperator = {
    "compound": {}
  };
  
  if (queryString && queryString.length > 0) {
    compoundOperator.compound.filter = [{
      "queryString": {
        "defaultPath": "id",
        "query": queryString
      }
    }];
  }
  if (query && query.length > 0) {
    compoundOperator.compound.must = [{
      "text": {
        "query": query,
        "path": [
          'openfda.brand_name', 'openfda.generic_name', 'openfda.manufacturer_name'
        ],
        "fuzzy": {
          "maxEdits": 1,
          "maxExpansions": 100
        }
      }
    }];
  }
          
  let searchFacetsWithFilters = {
    "$searchMeta": {
      "index": "drugs",
      "facet": {
        "operator": compoundOperator,
        "facets": {
          "manufacturers": {
              "type": "string",
              "path": "openfda.manufacturer_name",
              "numBuckets": 10
          },
          "routes": {
              "type": "string",
              "path": "openfda.route",
              "numBuckets": 10
          }
        }
      }
    }
  };
  
  let addFields = {
    '$addFields': {
      count: "$$SEARCH_META.count"
    }
  };
  
  let pipeline = [];
  
  if (facetInput.countOnly) {
    if (queryString && queryString.trim().length > 0) {
      // filters provided
      pipeline.push(countFacetsWithFilters);
    } else {
      // no filters provided
      pipeline.push(countAllFacets);
    }
  } else if (query && query.length > 0) {
    // search term provided
    pipeline.push(searchFacetsWithFilters);
  } else if (queryString && queryString.trim().length > 0) {
      // filters provided
      pipeline.push(searchFacetsWithFilters);
  } else {
    // no search term or filters provided
    pipeline.push(basicFacetsNoTerm);
  }
  //console.log(`Pipeline ${JSON.stringify(pipeline)}`);
  
  pipeline.push(addFields);

  const facets = await drugsCol.aggregate(pipeline).toArray();

  if (!facetInput.countOnly) {
    // reformat to match schema
    //console.log(JSON.stringify(facets[0].facet));
    //console.log(Object.keys(facets[0].facet));
    let buckets = facets[0].facet.manufacturers.buckets;
    let manufacturers = buckets.map(function(bucket) {
      return {name: bucket._id, count: bucket.count};
    });

    buckets = facets[0].facet.routes.buckets;
    let routes = buckets.map(function(bucket) {
      return {name: bucket._id, count: bucket.count};
    });
  
    facets[0].manufacturers = manufacturers;
    facets[0].routes = routes;
    /*
    facets[0].sponsors = sponsors;
    facets[0].genders = genders;
    facets[0].completion_date = cdates;
    facets[0].start_date = sdates;*/
  }
  
  return facets;
};

const filtersToQueryString = (filters) => {
  if (!filters || filters.length === 0) return null;

  return filters.length == 1 ? filters[0] : `(${filters.join(') AND (')})`;
};

