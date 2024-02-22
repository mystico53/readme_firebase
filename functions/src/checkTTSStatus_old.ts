/* eslint-disable max-len */
import * as functions from "firebase-functions";
import {v1} from "@google-cloud/text-to-speech";
import {getFirestore} from "firebase-admin/firestore";

// Initialize the Text-to-Speech client for long audio synthesis
const textToSpeechClient = new v1.TextToSpeechLongAudioSynthesizeClient();

// Initialize Firestore
const db = getFirestore();

export const checkTTSStatus = functions.https.onCall(async (data, context) => {
  console.log("Request body:", data);
  console.log("checkTTSStatus function initiated with data:", data, context);
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError("failed-precondition", "The function must be called while authenticated.");
  }

  const {fileId} = data;
  console.log("fileId:", fileId);
  if (!fileId) {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with one argument 'fileId'.");
  }

  // Retrieve the operation name from Firestore
  const docRef = db.collection("audioFiles").doc(fileId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new functions.https.HttpsError("not-found", "Document with provided fileId does not exist.");
  }

  const operationName = doc.data()?.google_tts_operationname;
  if (!operationName) {
    throw new functions.https.HttpsError("not-found", "Operation name not found in the document.");
  }
  console.log("Retrieved operationName:", operationName);

  try {
    // Correctly handle the LROperation
    const operation = await textToSpeechClient.checkSynthesizeLongAudioProgress(operationName);
    const [response, metadata] = await operation.promise();

    console.log("TTS Response:", response, metadata);

    // Update Firestore with the latest status
    await docRef.update({
      google_tts_progress: metadata.progressPercentage,
      done: operation.done,
    });

    // Return the current status to the client
    return {
      progressPercentage: metadata.progressPercentage,
      done: operation.done,
    };
  } catch (error) {
    console.error("Error checking TTS operation status:", error);
    throw new functions.https.HttpsError("internal", "Failed to check TTS operation status");
  }
});
