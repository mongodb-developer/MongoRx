/*
  This function is run when a GraphQL Query is made requesting your
  "facets" custom field name. The return value of this function is
  used to populate the resolver generated from your Payload Type.
*/
exports = async (facetInput) => {
  console.log("trialsFacetsCustomResolver");

  const cluster = context.services.get("mongodb-atlas");
  const db = cluster.db("ClinicalTrials");
  const trialsCol = db.collection("trials");
  const endpoint = "https://scalethebrain.com/rest_vector"; // vectoring encoder hosted by engineering/PM. Contact @marcus.eagan for any issues.

  const query = facetInput.term || "";
  const filters = facetInput.filters ? facetInput.filters : [];
  const queryString = facetInput.filters ? filtersToQueryString(filters) : "";
  const useVector = facetInput.useVector;
  const k = facetInput.k || 1000;
  //console.log(`Search term: ${JSON.stringify(query)}`);
  //console.log(`Query string: '${queryString}'`);
  //console.log(`Use vector: '${useVector}'`);

  const rangeQuery = filtersToRangeQuery(filters);
  //console.log(`Range: ${JSON.stringify(rangeQuery)}`);

  let countAllFacets = {
    "$searchMeta": {
      "index": "default",
      "exists": {
        "path": "nct_id"
      },
      "count": {
        "type": "total"
      }
    }
  };

  let countFacetsWithFilters = {
    "$searchMeta": {
      "compound": {
        "filter": [{
          "queryString": {
            "defaultPath": "condition",
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
      "index": "default",
      "facet": {
        /*
        "operator": {
          "exists": {
            "path": "nct_id"
          }
        },*/
        "facets": {
            "completion_date": {
                "type": "date",
                "path": "completion_date",
                "boundaries": [
                    new Date("2011-01-01"),
                    new Date("2012-01-01"),
                    new Date("2013-01-01"),
                    new Date("2014-01-01"),
                    new Date("2015-01-01"),
                    new Date("2016-01-01"),
                    new Date("2017-01-01"),
                    new Date("2018-01-01"),
                    new Date("2019-01-01"),
                    new Date("2020-01-01"),
                    new Date("2021-01-01"),
                    new Date("2022-01-01")
                ],
                "default": "other"
            },
            "conditions": {
                "type": "string",
                "path": "condition",
                "numBuckets": 10
            },
            "intervention_types": {
                "type": "string",
                "path": "intervention",
                "numBuckets": 10
            },
            "interventions": {
                "type": "string",
                "path": "intervention_mesh_term",
                "numBuckets": 10
            },
            "genders": {
                "type": "string",
                "path": "gender",
                "numBuckets": 10
            },
            "sponsors": {
                "type": "string",
                "path": "sponsors.agency",
                "numBuckets": 10
            },
            "start_date": {
                "type": "date",
                "path": "start_date",
                "boundaries": [
                    new Date("2011-01-01"),
                    new Date("2012-01-01"),
                    new Date("2013-01-01"),
                    new Date("2014-01-01"),
                    new Date("2015-01-01"),
                    new Date("2016-01-01"),
                    new Date("2017-01-01"),
                    new Date("2018-01-01"),
                    new Date("2019-01-01"),
                    new Date("2020-01-01"),
                    new Date("2021-01-01"),
                    new Date("2022-01-01"),
                    new Date("2023-01-01"),
                ],
                "default": "other"
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
        "defaultPath": "condition",
        "query": queryString
      }
    }];
  }

  if (query && query.length > 0) {
    compoundOperator.compound.must = [{
      "text": {
        "query": query,
        "path": [
          "brief_title",
          "official_title",
          "brief_summary",
          "detailed_description"
        ]
      }
    }];
  }

  if (rangeQuery) {
    if (compoundOperator.compound.filter && compoundOperator.compound.filter.length > 0) {
      compoundOperator.compound.filter.push(rangeQuery);
    } else {
      compoundOperator.compound.filter = [rangeQuery];
    }
  }

  let facetsObject = {
      "conditions": {
          "type": "string",
          "path": "condition",
          "numBuckets": 10
      },
      "intervention_types": {
          "type": "string",
          "path": "intervention",
          "numBuckets": 10
      },
      "interventions": {
          "type": "string",
          "path": "intervention_mesh_term",
          "numBuckets": 10
      },
      "genders": {
          "type": "string",
          "path": "gender",
          "numBuckets": 10
      },
      "sponsors": {
          "type": "string",
          "path": "sponsors.agency",
          "numBuckets": 10
      },
      "start_date": {
          "type": "date",
          "path": "start_date",
          "boundaries": [
              new Date("2011-01-01"),
              new Date("2012-01-01"),
              new Date("2013-01-01"),
              new Date("2014-01-01"),
              new Date("2015-01-01"),
              new Date("2016-01-01"),
              new Date("2017-01-01"),
              new Date("2018-01-01"),
              new Date("2019-01-01"),
              new Date("2020-01-01"),
              new Date("2021-01-01"),
              new Date("2022-01-01")
          ],
          "default": "other"
      }
  };

  let searchFacetsWithFilters = {
    "$searchMeta": {
      "index": "default",
      "facet": {
        "operator": compoundOperator,
        "facets": facetsObject
      }
    }
  };

  let vector = [];
  if (useVector) {
    // encode the query
    const response = await context.http.post({
      url: endpoint,
      "headers": {
        "Content-Type": ["application/json"]
      },
      body: { field_to_vectorize: query },
      encodeBodyAsJSON: true
    }).then(response => {
      // The response body is encoded as raw BSON.Binary. Parse it to JSON.
      const responseBody = EJSON.parse(response.body?.text());
      if (responseBody) {
        vector = responseBody.vector;
        //let httpStatus = (response.status !== undefined) ? parseInt(response.status) : undefined;
        //console.log(`${httpStatus}: vector: ${vector.slice(0, 4)}`);
        return responseBody;
      }
    });
  }

  console.log("processing query...");

  let vectorFacet = {
    "$searchMeta": {
      "index": "vector",
      "facet": {
        "operator": {
          'knnBeta': {
            'vector': vector,
            'path': 'detailed_description_vector',
            'k': k
          }
        },
        "facets": facetsObject
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
    console.log("count only");
    if (queryString && queryString.trim().length > 0) {
      // filters provided
      console.log("count only: filters provided");
      pipeline.push(countFacetsWithFilters);
    } else {
      // no filters provided
      console.log("count only: no filters provided");
      pipeline.push(countAllFacets);
    }
  } else if (query && query.length > 0) {
    console.log("not count only");
    // search term provided
    if (useVector) {
      console.log("not count only: use vector facets");
      pipeline.push(vectorFacet); // TODO: add filters support
    } else {
      console.log("not count only: use search facets");
      pipeline.push(searchFacetsWithFilters);
    }
  } else if (queryString && queryString.trim().length > 0) {
      console.log("not count only *");
      // filters provided
      pipeline.push(searchFacetsWithFilters);
  } else {
      console.log("not count only basic");
    // no search term or filters provided
    pipeline.push(basicFacetsNoTerm);
  }

  // commented out for possible bug w/ 6.0??? $$SEARCH_META not accessible when using $searchMeta stage, just $search??
  // pipeline.push(addFields);
  console.log(`Pipeline ${JSON.stringify(pipeline)}`);

  const facets = await trialsCol.aggregate(pipeline).toArray();

  if (!facetInput.countOnly) {
    // reformat to match schema
    //console.log(JSON.stringify(facets[0].facet));
    //console.log(Object.keys(facets[0].facet));
    let buckets = facets[0].facet.conditions.buckets;
    let conditions = buckets.map(function(bucket) {
      return {name: bucket._id, count: bucket.count};
    });
    buckets = facets[0].facet.intervention_types.buckets;
    let intervention_types = buckets.map(function(bucket) {
      return {name: bucket._id, count: bucket.count};
    });
    buckets = facets[0].facet.interventions.buckets;
    let interventions = buckets.map(function(bucket) {
      return {name: bucket._id, count: bucket.count};
    });
    buckets = facets[0].facet.sponsors.buckets;
    let sponsors = buckets.map(function(bucket) {
      return {name: bucket._id, count: bucket.count};
    });
    buckets = facets[0].facet.genders.buckets;
    let genders = buckets.map(function(bucket) {
      return {name: bucket._id, count: bucket.count};
    });
    /*
    buckets = facets[0].facet.completion_date?.buckets;
    let cdates = buckets?.map(function(bucket) {
      return {name: bucket._id, count: bucket.count};
    });*/
    buckets = facets[0].facet.start_date.buckets;
    let sdates = buckets.map(function(bucket) {
      return {name: bucket._id, count: bucket.count};
    });

    facets[0].conditions = conditions;
    facets[0].intervention_types = intervention_types;
    facets[0].interventions = interventions;
    facets[0].sponsors = sponsors;
    facets[0].genders = genders;
    //facets[0].completion_date = cdates;
    facets[0].start_date = sdates;
  }

  return facets;
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
