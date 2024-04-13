/* eslint-disable max-len */
import * as functions from "firebase-functions";
import {v1} from "@google-cloud/text-to-speech";
import {getFirestore} from "firebase-admin/firestore";

console.log("init checktts");

const textToSpeechClient = new v1.TextToSpeechLongAudioSynthesizeClient();
const db = getFirestore();

// Function to convert GCS URI to HTTPS URL
// eslint-disable-next-line require-jsdoc
function convertGsUrlToHttps(gsUrl: string): string {
  console.log("called convert url");
  console.log("GS URL:", gsUrl);
  const [, bucketAndPath] = gsUrl.split("gs://");
  const [bucketName, ...pathComponents] = bucketAndPath.split("/");
  const encodedPath = pathComponents
    .map((component) => encodeURIComponent(component))
    .join("/");
  const httpsUrl = `https://storage.googleapis.com/${bucketName}/${encodedPath}`;
  console.log("Converted HTTPS URL:", httpsUrl);
  return httpsUrl;
}

export const checkTTS = functions.https.onRequest(async (request, response) => {
  console.log("starting checktts");
  const fileId = request.query.fileId;
  console.log("File ID:", fileId);

  if (!fileId) {
    console.error("fileId query parameter is missing");
    response.status(400).send("fileId query parameter is required");
    return;
  }

  const docRef = db.collection("audioFiles").doc(fileId.toString());
  console.log("Document reference:", docRef.path);

  try {
    const doc = await docRef.get();
    console.log("Document snapshot:", doc);

    if (!doc.exists) {
      console.error("Document not found for fileId:", fileId);
      response.status(404).send(`No document found for fileId: ${fileId}`);
      return;
    }

    const docData = doc.data();
    console.log("Document data:", docData);

    if (!docData) {
      console.error("Document data is undefined for fileId:", fileId);
      response.status(404).send(`Document data is undefined for fileId: ${fileId}`);
      return;
    }

    const operationName = docData.google_tts_operationname;
    console.log("Operation name:", operationName);

    if (!operationName) {
      console.error("Operation name not found in the document");
      response.status(404).send("Operation name not found in the document.");
      return;
    }

    const operation = await textToSpeechClient.checkSynthesizeLongAudioProgress(operationName);
    console.log("Operation:", operation);

    const [, metadata] = await operation.promise();
    console.log("Operation metadata:", metadata);

    await docRef.update({
      google_tts_progress: metadata.progressPercentage,
      done: operation.done,
      status: "ready",
    });
    console.log("Document updated with progress and status");

    // Convert the GCS URI to an HTTPS URL
    console.log("converting url");
    const httpsUrl = docData.gcs_uri ? convertGsUrlToHttps(docData.gcs_uri) : null;
    console.log("HTTPS URL:", httpsUrl);

    if (httpsUrl) {
      await docRef
        .update({
          httpsUrl: httpsUrl,
        })
        .then(() => console.log("Document successfully updated with HTTPS URL"))
        .catch((error) => console.error("Error updating document with HTTPS URL:", error));
    }

    const responseObject = {
      progressPercentage: metadata.progressPercentage,
      done: operation.done,
      gcsUri: httpsUrl, // The converted HTTPS URL
    };

    // Log the response object to the console
    console.log("Sending response to client:", responseObject);

    // Send the response object back to the client
    response.json(responseObject);
  } catch (error) {
    console.error("Error checking TTS operation status:", error);
    response.status(500).send(
      `Error retrieving document: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
});
