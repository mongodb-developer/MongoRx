/*
  This function is run when a GraphQL Query is made requesting your
  "facets" custom field name. The return value of this function is
  used to populate the resolver generated from your Payload Type.
*/
exports = async (facetInput) => {
  const cluster = context.services.get("mongodb-atlas");
  const db = cluster.db("ClinicalTrials");
  const trialsCol = db.collection("trials");
  
  const query = facetInput.term || "";
  const filters = facetInput.filters ? facetInput.filters : [];
  const queryString = facetInput.filters ? filtersToQueryString(filters) : "";
  //console.log(`drugTrialedWithFacetCustomResolver::Search term: ${JSON.stringify(query)}`);

  let trialedWithFacet = {
    "$searchMeta": {
      "index": "default",
      "facet": {
        "operator": {
          "compound": {
            "filter": [{
              "queryString": {
                "defaultPath": "intervention_mesh_term",
                "query": query
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
  };
  
  let pipeline = [trialedWithFacet];
  //console.log(`Pipeline ${JSON.stringify(pipeline)}`);
  
  const facets = await trialsCol.aggregate(pipeline).toArray();

  // reformat to match schema
  //console.log(JSON.stringify(facets[0].facet));
  //console.log(Object.keys(facets[0].facet));
  let buckets = facets[0].facet.trialedWithFacet.buckets;
  let drugs = buckets.map(function(bucket) {
    return {name: bucket._id, count: bucket.count};
  });
  facets[0].drugs = drugs;

  return facets;
};

const filtersToQueryString = (filters) => {
  if (!filters || filters.length === 0) return null;

  return filters.length == 1 ? filters[0] : `(${filters.join(') AND (')})`;
};

