/*
  This function is run when a GraphQL Query is made requesting your
  "search" custom field name. The return value of this function is
  used to populate the resolver generated from your Payload Type.
*/

exports = async (mltTrialInput) => {
  console.log("moreLikeThisTrialCustomResolver");
  
  const cluster = context.services.get("mongodb-atlas");
  const db = cluster.db("ClinicalTrials");
  const trialsCol = db.collection("trials");
  
  const title = mltTrialInput.brief_title || "";
  const descr = mltTrialInput.detailed_description || "";
  const limit = mltTrialInput.limit || 12;
  const skip = mltTrialInput.skip || 0;

  //console.log(`Title: ${title}`);
  //console.log(`Description: ${descr}`);

  let mltSearch = {
    '$search': {
      index: 'default',
      moreLikeThis: {
        like: []
      },
      count: {
        "type": "total"
      }
    }
  };
  
  if (title.trim().length > 0) {
    mltSearch["$search"].moreLikeThis.like.push({"brief_title": title});
  }
  if (descr.trim().length > 0) {
    mltSearch["$search"].moreLikeThis.like.push({"detailed_description": descr});
  }
  
  let addFields = {
    '$addFields': {
      score: {'$meta': 'searchScore'},
      count: "$$SEARCH_META.count"
    }
  };
  
  let pipeline = [mltSearch, addFields];
  pipeline.push({'$skip': skip});
  pipeline.push({'$limit': limit});

  //console.log(`Pipeline ${JSON.stringify(pipeline)}`);
  
  const trials = await trialsCol.aggregate(pipeline).toArray();
    
  return trials;
};
