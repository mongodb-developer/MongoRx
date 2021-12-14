/*
  This function is run when a GraphQL Query is made requesting your
  "search" custom field name. The return value of this function is
  used to populate the resolver generated from your Payload Type.
*/

exports = async (searchInput) => {
  const cluster = context.services.get("mongodb-atlas");
  const db = cluster.db("ClinicalTrials");
  const drugsCol = db.collection("drug_data");
  
  const query = searchInput.term || "";  // TODO: change to no-op filter if no term
  const limit = searchInput.limit || 12;
  const skip = searchInput.skip || 0;
  const filters = searchInput.filters ? searchInput.filters : [];
  
  //console.log(`Term: ${query}`);
  //console.log(`Limit: ${limit}`);
  //console.log(`Skip: ${skip}`);
  //console.log(`Filters: ${filters}`);
  
  const defaultFilterField = searchInput.filters && searchInput.filters.length > 0 ? searchInput.filters[0].split(":")[0] : "";
  //console.log(`Default filter: '${defaultFilterField}'`);
  const queryString = filtersToQueryString(filters);
  //console.log(`Query string: '${queryString}'`);
  
  let basicSearchNoTerm = {
    '$search': {
      index: 'drugs',
      exists: {
        path: 'id'
      },
      count: {
        "type": "total"
      }
    }
  };
  
  let basicSearch = {
    '$search': {
      index: 'drugs',
      text: {
        query: query,
        path: [
          'openfda.brand_name', 'openfda.generic_name', 'openfda.manufacturer_name'
        ],
        fuzzy: {
          maxEdits: 1,
          maxExpansions: 100
        }
      },
      count: {
        "type": "total"
      },
      highlight: {
        path: [
          'openfda.brand_name', 'openfda.generic_name', 'openfda.manufacturer_name'
        ]
      }
    }
  };
  
  let searchWithFilters = {
    '$search': {
      index: 'drugs',
      compound: {
        must: [{
          text: {
            query: query,
            path: [
              'openfda.brand_name', 'openfda.generic_name', 'openfda.manufacturer_name'
            ],
            fuzzy: {
              maxEdits: 1,
              maxExpansions: 100
            }
          }
        }],
        filter: [{
          queryString: {
            defaultPath: defaultFilterField,
            query: queryString
          }
        }]
      },
      count: {
        "type": "total"
      },
      highlight: {
        path: [
          'openfda.brand_name', 'openfda.generic_name', 'openfda.manufacturer_name'
        ]
      }
    }
  };

  let searchNoTermWithFilters = {
    '$search': {
      index: 'drugs',
      compound: {
        filter: [{
          queryString: {
            defaultPath: defaultFilterField,
            query: queryString
          }
        }]
      },
      count: {
        "type": "total"
      }
    }
  };
  
  let addFields = {
    '$addFields': {
      score: {'$meta': 'searchScore'},
      highlights: {'$meta': 'searchHighlights'},
      count: "$$SEARCH_META.count"
    }
  };
  
  let pipeline = [];
  if (query.length > 0) {
    pipeline.push(queryString && queryString.trim().length > 0 ? searchWithFilters : basicSearch);
  } else {
    pipeline.push(queryString && queryString.trim().length > 0 ? searchNoTermWithFilters : basicSearchNoTerm);
  }
  //console.log(`Pipeline ${JSON.stringify(pipeline)}`);
  
  pipeline.push(addFields);
  pipeline.push({'$skip': skip});
  pipeline.push({'$limit': limit});
  
  const drugs = await drugsCol.aggregate(pipeline).toArray();
    
  return drugs;
};

const filtersToQueryString = (filters) => {
  if (!filters || filters.length === 0) return null;

  return filters.length == 1 ? filters[0] : `(${filters.join(') AND (')})`;
};
