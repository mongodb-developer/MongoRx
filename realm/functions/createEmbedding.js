exports = async function(input) {
  const endpoint = "https://f80yfe3klhonp84q.us-east-1.aws.endpoints.huggingface.cloud";
  const accessToken = context.values.get("hugginface_access_token");
  
  let headers = {
    "Authorization": ["Bearer " + accessToken],
    "Content-Type": ["application/json"]
  };
  
  let embeddings = [];
  // stay within the embedding models 512 token limit
  let textToVectorize = input.replace(/\\r\\n/g, '');
  textToVectorize = textToVectorize.length > 2000 ? truncate(textToVectorize, 2000, true) : input;
  
  const response = await context.http.post({
    url: endpoint,
    headers: headers,
    body: {"inputs": textToVectorize},
    encodeBodyAsJSON: true
  }).then(response => {
    // The response body is encoded as raw BSON.Binary. Parse it to JSON.
    const responseBody = EJSON.parse(response.body?.text());
    if (responseBody && Array.isArray(responseBody) && responseBody.length > 0) {
      embeddings = responseBody[0];
    }
    return responseBody;
  });
  //console.log(`createEmbedding body: {'inputs': ${input}}`);
  //console.log(`createEmbedding response: ${JSON.stringify(embeddings.slice(0, 4))}`);
  return embeddings;
};

function truncate( str, n, useWordBoundary ){
  if (str.length <= n) { return str; }
  const subString = str.slice(0, n-1); // the original check
  return (useWordBoundary ?
    subString.slice(0, subString.lastIndexOf(" ")) :
    subString);
}