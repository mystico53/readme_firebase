/* eslint-disable max-len */
import * as functions from "firebase-functions";
import {v1} from "@google-cloud/text-to-speech";
// import * as admin from "firebase-admin";
// import {FieldValue} from "@google-cloud/firestore";
import {getFirestore, Timestamp, FieldValue, Firestore} from "firebase-admin/firestore";

const textToSpeechClient = new v1.TextToSpeechLongAudioSynthesizeClient();

// const db = admin.firestore();
const db = getFirestore();

export const textToSpeech = functions.https.onRequest(async (req, res) => {
  console.log("Received request for text to speech conversion");

  const {text, filename, languageCode = "en-US", voiceName = "en-US-Standard-C", speakingRate = 1.0} = req.body;
  if (!text || !filename) {
    console.error("Text and filename are required");
    res.status(400).send("Text and filename are required");
    return; // Ensure no further code is executed in this branch
  }

  const bucketName = "firebase-readme-123.appspot.com";
  const outputGcsUri = `gs://${bucketName}/${filename}`;
  const parent = "projects/firebase-readme-123/locations/us-central1";

  const request = {
    parent,
    input: {text},
    voice: {languageCode, name: voiceName},
    audioConfig: {audioEncoding: "LINEAR16" as const, speakingRate}, // Use as const for enum values
    outputGcsUri,
  };

  try {
    const [operation] = await textToSpeechClient.synthesizeLongAudio(request);
    console.log(`Long-running operation started with ID: ${operation.name}`);

    const docRef = await db.collection("audioFiles").add({
      filename,
      status: "processing",
      gcs_uri: outputGcsUri,
      created_at: FieldValue.serverTimestamp(),
    });

    console.log(`Document created with ID: ${docRef.id}`);

    res.send({message: "Text-to-Speech long synthesis initiated", operationId: operation.name});
  } catch (error) {
    console.error("Error initiating Text-to-Speech long synthesis:", error);

    // Update Firestore with the error status
    const docRef = await db.collection("audioFiles").add({
      filename,
      status: "error",
      gcs_uri: outputGcsUri,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      error: error instanceof Error ? error.message : "Unknown error",
    });

    console.log(`Error document created with ID: ${docRef.id}`);

    if (error instanceof Error) { // Type assertion for the error object
      res.status(500).send(error.message);
    } else {
      res.status(500).send("An unknown error occurred");
    }
  }
});
