/* eslint-disable max-len */
import * as functions from "firebase-functions";
import {FieldValue, getFirestore} from "firebase-admin/firestore";

// Initialize Firestore database
const db = getFirestore();
console.log("Debug: Initialized Firestore");

export const createFirestoreDocument = functions.https.onRequest(async (req, res) => {
  console.log("Debug: Received request to create Firestore document");

  const {fileId, status, userId} = req.body;
  console.log(`Debug: Request body contains fileId: ${fileId}, status: ${status}, and userId: ${userId}`);

  if (!fileId || !userId) {
    console.error("fileId and userId are required");
    res.status(400).send("fileId and userId are required");
    return;
  }

  try {
    console.log(`Debug: Attempting to create Firestore document for fileId: ${fileId} and userId: ${userId}`);

    await db.collection("audioFiles").doc(fileId).set({
      created_at: FieldValue.serverTimestamp(),
      status: status || "pending",
      userId: userId,
    });

    console.log(`Firestore document created with ID: ${fileId}, status: ${status || "pending"}, and userId: ${userId}`);
    res.send({message: "Firestore document created"});
  } catch (error) {
    console.error("Error creating Firestore document:", error);
    res.status(500).send("An error occurred while creating the Firestore document");
  }
});
