/* eslint-disable max-len */
import * as functions from "firebase-functions";
import {v1} from "@google-cloud/text-to-speech";
import {getFirestore} from "firebase-admin/firestore";

const textToSpeechClient = new v1.TextToSpeechLongAudioSynthesizeClient();
const db = getFirestore();

export const checkTTS = functions.https.onRequest(async (request, response) => {
  const fileId = request.query.fileId;

  if (!fileId) {
    response.status(400).send("fileId query parameter is required");
    return;
  }

  // Define docRef outside the try blocks to make it accessible throughout
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

    // Ensure operationName is defined before proceeding
    const operationName = docData.google_tts_operationname;
    if (!operationName) {
      response.status(404).send("Operation name not found in the document.");
      return;
    }

    // Correctly handle the LROperation
    const operation = await textToSpeechClient.checkSynthesizeLongAudioProgress(operationName);
    const [operationResponse, metadata] = await operation.promise();

    await docRef.update({
      google_tts_progress: metadata.progressPercentage,
      done: operation.done,
    });

    console.log("Sending response:", {
      progressPercentage: metadata.progressPercentage,
      done: operation.done,
    });

    console.log("Operation response:", operationResponse);

    // Use the Cloud Function's response parameter to send JSON back to the client
    response.json({
      progressPercentage: metadata.progressPercentage,
      done: operation.done,
    });
  } catch (error) {
    console.error("Error checking TTS operation status:", error);
    response.status(500).send(`Error retrieving document: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
