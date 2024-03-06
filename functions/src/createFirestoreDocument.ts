/* eslint-disable max-len */
import * as functions from "firebase-functions";
import {FieldValue, getFirestore} from "firebase-admin/firestore";

const db = getFirestore();

export const createFirestoreDocument = functions.https.onRequest(async (req, res) => {
  const {fileId} = req.body;

  if (!fileId) {
    console.error("fileId is required");
    res.status(400).send("fileId is required");
    return;
  }

  try {
    await db.collection("audioFiles").doc(fileId).set({
      // Add any initial fields you want to set for the document
      created_at: FieldValue.serverTimestamp(),
    });

    console.log(`Firestore document created with ID: ${fileId}`);
    res.send({message: "Firestore document created"});
  } catch (error) {
    console.error("Error creating Firestore document:", error);
    res.status(500).send("An error occurred while creating the Firestore document");
  }
});
