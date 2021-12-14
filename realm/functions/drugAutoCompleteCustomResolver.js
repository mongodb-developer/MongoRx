/*
  This function is run when a GraphQL Query is made requesting your
  "autocomplete" custom field name. The return value of this function
  is used to populate the resolver generated from your Payload Type.
*/

exports = async (searchInput) => {
  const cluster = context.services.get("mongodb-atlas");
  const db = cluster.db("ClinicalTrials");
  const drugsCol = db.collection("drug_data");
  
  const query = searchInput.term || "";
  const limit = searchInput.limit || 5;
  const skip = searchInput.skip || 0;

  //console.log(`Autocomplete Term: ${query}`);
  //console.log(`Limit: ${limit}`);
  //console.log(`Skip: ${skip}`);
  
  let autoCompleteSearch = {
    $search: {
      index: 'drugs',
      autocomplete: {
        path: 'openfda.brand_name',
        query: query
      },
      highlight: {
        path: 'openfda.brand_name'
      }
    }
  };
  
  let pipeline = [
    autoCompleteSearch,
    {
      '$addFields': {
        score: {'$meta': 'searchScore'},
        highlights: {'$meta': 'searchHighlights'}
      }
    },
    {
      '$skip': skip
    },
    {
      '$limit': limit
    }
  ];
  
  //console.log(`Pipeline: ${JSON.stringify(pipeline)}`);
  
  const drugs = await drugsCol.aggregate(pipeline).toArray();
  //console.log(`Returning ${drugs.length} drugs`);
  return drugs;
};
