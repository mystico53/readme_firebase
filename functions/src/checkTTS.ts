/* eslint-disable max-len */
import * as functions from "firebase-functions";
import {getFirestore} from "firebase-admin/firestore";

// Assuming firebase-admin has been initialized somewhere in your project.
const db = getFirestore();

export const checkTTS = functions.https.onRequest(async (request, response) => {
  // Access the fileId query parameter
  const fileId = request.query.fileId;

  if (!fileId) {
    response.status(400).send("fileId query parameter is required");
    return;
  }

  console.log(`Received fileId: ${fileId}`);

  try {
    const docRef = db.collection("audioFiles").doc(fileId.toString());
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`No document found for fileId: ${fileId}`);
      response.status(404).send(`No document found for fileId: ${fileId}`);
      return;
    }

    const docData = doc.data();
    if (docData) { // Check if docData is not undefined
      console.log(`Document data for fileId ${fileId}:`, docData);
      response.json({
        status: "Document found",
        data: {
          fileId: fileId,
          google_tts_operationname: docData.google_tts_operationname,
          google_tts_progress: docData.google_tts_progress,
          done: docData.done,
          status: docData.status,
        },
      });
    } else {
      console.log(`Document data is undefined for fileId: ${fileId}`);
      response.status(404).send(`Document data is undefined for fileId: ${fileId}`);
    }
  } catch (error) {
    console.error(`Error retrieving document for fileId ${fileId}:`, error);
    response.status(500).send(`Error retrieving document: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
