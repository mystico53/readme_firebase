/* eslint-disable max-len */
import * as functions from "firebase-functions";
import {v1} from "@google-cloud/text-to-speech";
import {getFirestore} from "firebase-admin/firestore";

const textToSpeechClient = new v1.TextToSpeechLongAudioSynthesizeClient();
const db = getFirestore();

// Function to convert GCS URI to HTTPS URL
// eslint-disable-next-line require-jsdoc
function convertGsUrlToHttps(gsUrl: string): string {
  const [, bucketAndPath] = gsUrl.split("gs://");
  const [bucketName, ...pathComponents] = bucketAndPath.split("/");
  const encodedPath = pathComponents.map((component) => encodeURIComponent(component)).join("/");
  return `https://storage.googleapis.com/${bucketName}/${encodedPath}`;
}

export const checkTTS = functions.https.onRequest(async (request, response) => {
  const fileId = request.query.fileId;

  if (!fileId) {
    response.status(400).send("fileId query parameter is required");
    return;
  }

  const docRef = db.collection("audioFiles").doc(fileId.toString());

  try {
    const doc = await docRef.get();

    if (!doc.exists) {
      response.status(404).send(`No document found for fileId: ${fileId}`);
      return;
    }

    const docData = doc.data();
    if (!docData) {
      response.status(404).send(`Document data is undefined for fileId: ${fileId}`);
      return;
    }

    const operationName = docData.google_tts_operationname;
    if (!operationName) {
      response.status(404).send("Operation name not found in the document.");
      return;
    }

    const operation = await textToSpeechClient.checkSynthesizeLongAudioProgress(operationName);
    const [, metadata] = await operation.promise();

    await docRef.update({
      google_tts_progress: metadata.progressPercentage,
      done: operation.done,
    });

    // Convert the GCS URI to an HTTPS URL
    const httpsUrl = docData.gcs_uri ? convertGsUrlToHttps(docData.gcs_uri) : null;

    if (httpsUrl) {
      await docRef.update({
        httpsUrl: httpsUrl,
      }).then(() => console.log("Document successfully updated with HTTPS URL"))
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
    response.status(500).send(`Error retrieving document: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
