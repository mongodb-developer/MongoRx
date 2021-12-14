/*
  This function is run when a GraphQL Query is made requesting your
  "autocomplete" custom field name. The return value of this function
  is used to populate the resolver generated from your Payload Type.
*/

exports = async (searchInput) => {
  const cluster = context.services.get("mongodb-atlas");
  const db = cluster.db("ClinicalTrials");
  const trialsCol = db.collection("trials");
  
  const query = searchInput.term || "";
  const limit = searchInput.limit || 5;
  const skip = searchInput.skip || 0;
  const nct = query && /^NCT\d{1,8}$/i.test(query) ? query.trim() : null;
  //console.log(`nct: ${nct}`);

  //console.log(`Term: ${query}`);
  //console.log(`Limit: ${limit}`);
  //console.log(`Skip: ${skip}`);
  
  let nctSearch = {
    $search: {
      index: 'default',
      autocomplete: {
        path: 'nct_id',
        query: nct
      },
      highlight: {
        path: 'nct_id'
      }
    }
  };
  
  let autoCompleteSearch = {
    $search: {
      index: 'default',
      autocomplete: {
        path: 'brief_title',
        query: query
      },
      highlight: {
        path: 'brief_title'
      }
    }
  };
  
  const title_override = {
      '$addFields': {
        nct_title: {$concat: ['$nct_id', ': ', '$brief_title']}
      }
  };
  
  let pipeline = [
    nct ? nctSearch : autoCompleteSearch,
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
  
  if (nct) {
    pipeline.push(title_override);
  }
  
  const trials = await trialsCol.aggregate(pipeline).toArray();
  return trials;
};
