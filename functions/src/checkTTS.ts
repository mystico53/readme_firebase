import * as functions from "firebase-functions";

// eslint-disable-next-line max-len
export const checkTTS = functions.https.onRequest((request, response) => {
  // Your function logic here. For example, you can still send JSON responses:
  response.json({status: "Everything is awesome!"});
});
