exports = async (changeEvent) => {
  let fieldNames = [];
  let fieldValues = [];

  // Access the _id of the changed document, e.g., { "$oid": "599af247bb69cd89961c986d" }
  const docId = changeEvent?.documentKey._id instanceof BSON.ObjectId ?
    changeEvent?.documentKey._id : BSON.ObjectId(changeEvent?.documentKey._id.$oid);

  // Access the latest version of the changed document (with Full Document enabled for Insert, Update, and Replace operations):
  const fullDocument = changeEvent?.fullDocument; 
    
  switch (changeEvent?.operationType) {
    case 'insert':
    case 'replace':
      for (const [key, value] of Object.entries(fullDocument)) {
        if (typeof value === "string" && value.length > 50) { // vectorize text longer than 50 chars
          //console.log(`${key}: ${value}`);
          fieldNames.push(key);
          fieldValues.push(value);
        }
      }        
      break;
        
    case 'update':
      const updateDescription = changeEvent?.updateDescription;
      if (updateDescription) {
        // See which fields were removed (if any):
        const removedFields = updateDescription?.removedFields; // An array of removed fields
        
      // See which fields were changed (if any):
        const updatedFields = updateDescription?.updatedFields; // A document containing updated fields
        if (updatedFields.encode && fullDocument.encode === true) {
          if (fullDocument.detailed_description && !updatedFields.detailed_description_vector) {
            fieldNames.push("detailed_description");
            fieldValues.push(fullDocument.detailed_description);
          }
          if (fullDocument.brief_summary && !updatedFields.brief_summary_vector) {
            fieldNames.push("brief_summary");
            fieldValues.push(fullDocument.brief_summary);
          }
        }
      }
          
      break;
  }

  // Functions run by Triggers are run as System users and have full access to Services, Functions, and MongoDB Data.
  const dbName = changeEvent.ns.db;     // should be : 'pimco'
  const colName = changeEvent.ns.coll;  // should be : 'documents'
  const collection = context.services.get("mongodb-atlas").db(dbName).collection(colName);

  let embeddingFields = {};
  let retMsg = { message: "success" };
  if (fieldValues.length > 0) {
    
    for (let i=0; i < fieldValues.length; i++) {
      let start = new Date();
      embeddingFields[`${fieldNames[i]}_vector`] = await context.functions.execute("createEmbedding", fieldValues[i]);
      retMsg.encoded = `${new Date() - start}ms`;
      if (Array.isArray(embeddingFields[`${fieldNames[i]}_vector`])) {
        retMsg.length = embeddingFields[`${fieldNames[i]}_vector`].length;
      }
    } // end for fieldValues

    // add the new embedding array fields to the source document
    if (Object.keys(embeddingFields).length > 0) {
      let start = new Date();
      const updated = await collection.updateOne({ _id: docId }, { $set: embeddingFields }, { upsert: false });
      retMsg.lapsed = `${new Date() - start}ms`;
    }
  } // end if (fieldValues.length > 0
  
  console.log(`${JSON.stringify(retMsg)}`);
  return retMsg;
};