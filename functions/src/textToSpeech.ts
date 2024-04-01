/* eslint-disable max-len */
import * as functions from "firebase-functions";
import {v1} from "@google-cloud/text-to-speech";
import {getFirestore} from "firebase-admin/firestore";

const textToSpeechClient = new v1.TextToSpeechLongAudioSynthesizeClient();

// const db = admin.firestore();
const db = getFirestore();

export const textToSpeech = functions.https.onRequest(async (req, res) => {
  console.log("Received request for text to speech conversion");

  const {text, fileId, userId, languageCode = "en-US", voiceName = "en-US-Standard-C", speakingRate = 1.0} = req.body;
  if (!text || !fileId) {
    console.error("Text and fileId are required");
    res.status(400).send("Text and fileId are required");
    return; // Ensure no further code is executed in this branch
  }

  const bucketName = "firebase-readme-123.appspot.com";
  const outputGcsUri = `gs://${bucketName}/${fileId}`;
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
    // Extract relevant information from the operation object
    const operationDetails = {
      name: operation.name ?? "Unknown Operation Name",
      progressPercentage: (operation.metadata as any)?.progressPercentage,
      done: operation.done,
    };

    // Log the extracted information
    console.log("Long-running operation response:", JSON.stringify(operationDetails, null, 2));

    const updatedFields = {
      userId,
      status: "generating speech",
      gcs_uri: outputGcsUri,
      google_tts_operationname: operation.name,
      google_tts_progress: (operation.metadata as any)?.progressPercentage,
      done: operation.done,
    };

    await db.collection("audioFiles").doc(fileId).update(updatedFields);

    console.log(`Document updated with ID: ${fileId}`);
    console.log("Updated fields:", updatedFields);

    res.send({message: "Text-to-Speech long synthesis initiated", operationId: operation.name});
  } catch (error) {
    console.error("Error initiating Text-to-Speech long synthesis:", error);

    // Update Firestore with the error status
    await db.collection("audioFiles").doc(fileId).update({
      userId,
      status: "error",
      gcs_uri: outputGcsUri,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    console.log(`Error document created with ID: ${fileId}`);

    if (error instanceof Error) { // Type assertion for the error object
      res.status(500).send(error.message);
    } else {
      res.status(500).send("An unknown error occurred");
    }
  }
});
