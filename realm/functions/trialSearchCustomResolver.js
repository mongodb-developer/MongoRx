/*
  This function is run when a GraphQL Query is made requesting your
  "search" custom field name. The return value of this function is
  used to populate the resolver generated from your Payload Type.
*/

exports = async (searchInput) => {
  console.log("trialSearchCustomResolver");
  
  const cluster = context.services.get("mongodb-atlas");
  const db = cluster.db("ClinicalTrials");
  const trialsCol = db.collection("trials");
  
  const query = searchInput.term || "";  // TODO: change to no-op filter if no term
  const limit = searchInput.limit || 12;
  const skip = searchInput.skip || 0;
  const sort = searchInput.sort || "";
  const filters = searchInput.filters ? searchInput.filters : [];
  const rangeQuery = filtersToRangeQuery(filters);
  console.log(`Range: ${JSON.stringify(rangeQuery)}`);
  
  //console.log(`Term: ${query}`);
  //console.log(`Limit: ${limit}`);
  //console.log(`Skip: ${skip}`);
  //console.log(`Filters: ${filters}`);
  
  const defaultFilterField = searchInput.filters && searchInput.filters.length > 0 ? searchInput.filters[0].split(":")[0] : "";
  //console.log(`Default filter: '${defaultFilterField}'`);
  const queryString = filtersToQueryString(filters);
  console.log(`Query string: '${queryString}'`);
  
  let basicSearchNoTerm = {
    '$search': {
      index: 'default',
      compound: {
        filter: [{
          exists: {
            path: 'nct_id'
          }
        }]
      },
      count: {
        "type": "total"
      }
    }
  };
  
  let basicSearch = {
    '$search': {
      index: 'default',
      compound: {
        filter: [{
          exists: {
            path: 'nct_id'
          }
        }],
        must: [{
          text: {
            query: query,
            path: [
              'brief_title',
              'official_title',
              'brief_summary',
              'detailed_description'
            ],
            fuzzy: {
              maxEdits: 1,
              maxExpansions: 100
            }
          }
        }]
      },
      count: {
        "type": "total"
      },
      highlight: {
        path: [
          'brief_summary',
          'detailed_description'
        ]
      }
    }
  };
  
  let searchWithFilters = {
    '$search': {
      index: 'default',
      compound: {
        must: [{
          text: {
            query: query,
            path: [
              'brief_title',
              'official_title',
              'brief_summary',
              'detailed_description'
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
          'brief_summary',
          'brief_title',
          'official_title',
          'detailed_description'
        ]
      }
    }
  };

  let searchNoTermWithFilters = {
    '$search': {
      index: 'default',
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
  

  if (rangeQuery) {
    basicSearch.$search.compound.filter.push(rangeQuery);
    basicSearchNoTerm.$search.compound.filter.push(rangeQuery);
    searchNoTermWithFilters.$search.compound.filter.push(rangeQuery);
    searchWithFilters.$search.compound.filter.push(rangeQuery);
  }

  
  let pipeline = [];
  if (query.length > 0) {
    if (queryString && queryString.trim().length > 0) {
      pipeline.push(searchWithFilters);
      console.log("using searchWithFilters");
    } else {
      pipeline.push(basicSearch);
      console.log("using basicSearch");
    }
  } else {
    if (queryString && queryString.trim().length > 0) {
      pipeline.push(searchNoTermWithFilters)
      console.log("using searchNoTermWithFilters");
    } else {
      pipeline.push(basicSearchNoTerm);
      console.log("using basicSearchNoTerm");
    }
  }
  //console.log(`Pipeline ${JSON.stringify(pipeline)}`);
  
  // sorting
  // TODO: replace hard-code date for origin with aggregated max date
  switch(sort) {
    case "start_date":
      let sortByDateDesc = {
        "near": {
          "path": "start_date",
          "origin": new Date("2023-02-03T00:00:00.000+00:00"),
          "pivot": 31556952000
        }
      };
      console.log(`pipeline[0]: ${JSON.stringify(pipeline[0])}`);
      pipeline[0]["$search"].compound.should = sortByDateDesc;
      console.log()
      break;
      
    case "relevance":
    case "":
      // do nothing
  }
  
  pipeline.push(addFields);
  pipeline.push({'$skip': skip});
  pipeline.push({'$limit': limit});
  
  const trials = await trialsCol.aggregate(pipeline).toArray();
    
  return trials;
};

const filtersToQueryString = (filters) => {
  if (!filters || filters.length === 0) return null;

  // skip date fields
  let filtersNoDates = filters.filter((f) => !f.startsWith("start_date:"));
  return filters.length == 1 ? filtersNoDates[0] : `(${filtersNoDates.join(') AND (')})`;
};

const filtersToRangeQuery = (filters) => {
  if (!filters || filters.length === 0) return null;

  // skip non-date fields
  let dateFilters = filters.filter((f) => f.startsWith("start_date:"));

  let startDate, endDate;
  if (dateFilters.length > 0) {
    let parts = dateFilters[0].split(":");
    let p0 = parts[0];
    let p1 = parts[1];
    if (p1 && p1.startsWith("\"")) {
      p1 = p1.slice(1);
    }
    p1 = p1.substring(0, 10);
    startDate = new Date(p1);
    endDate = new Date(startDate.getTime());
    endDate.setDate(endDate.getDate() + 365);
    
    let rangeQuery = {
      range: {
        path: "start_date",
        gte: startDate,
        lt: endDate
      }
    };
  
    return rangeQuery;
  } else {
    return null;
  }
};
