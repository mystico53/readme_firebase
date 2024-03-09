/* eslint-disable max-len */
import * as functions from "firebase-functions";
import {FieldValue, getFirestore} from "firebase-admin/firestore";

// Initialize Firestore database
const db = getFirestore();

console.log("Debug: Initialized Firestore"); // Debug message for Firestore initialization

export const createFirestoreDocument = functions.https.onRequest(async (req, res) => {
  console.log("Debug: Received request to create Firestore document"); // Debug when function is triggered

  const {fileId, status} = req.body;
  console.log(`Debug: Request body contains fileId: ${fileId} and status: ${status}`); // Debug contents of request body

  if (!fileId) {
    console.error("fileId is required");
    res.status(400).send("fileId is required");
    return;
  }

  try {
    console.log(`Debug: Attempting to create Firestore document for fileId: ${fileId}`); // Debug before attempting to create document

    await db.collection("audioFiles").doc(fileId).set({
      // Add any initial fields you want to set for the document
      created_at: FieldValue.serverTimestamp(),
      status: status || "pending", // Use the status from the request body or default to "pending"
    });

    console.log(`Firestore document created with ID: ${fileId} and status: ${status || "pending"}`); // Confirmation of document creation
    res.send({message: "Firestore document created"});
  } catch (error) {
    console.error("Error creating Firestore document:", error); // Log error if document creation fails
    res.status(500).send("An error occurred while creating the Firestore document");
  }
});
