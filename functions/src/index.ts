/* eslint-disable max-len */
import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";
import {initializeApp} from "firebase-admin/app";


import OpenAI from "openai";
import * as corsLib from "cors";
import * as dotenv from "dotenv";
dotenv.config();

initializeApp();
// admin.initializeApp();

import {cleanText} from "./cleanText";
export {cleanText};
import {textToSpeech} from "./textToSpeech";
export {textToSpeech};
import {checkTTSStatus} from "./checkTTSStatus_old";
export {checkTTSStatus};
import {checkTTS} from "./checkTTS";
export {checkTTS};
import {createFirestoreDocument} from "./createFirestoreDocument";
export {createFirestoreDocument};
console.log("Started Index.ts");


const cors = corsLib({origin: true});

const openaiApiKey = process.env.FUNCTIONS_OPENAI_KEY || functions.config().openai?.key;

if (!openaiApiKey) {
  console.error("No API key found in Firebase Functions configuration or environment variables.");
  throw new Error("OpenAI API key is not set in Firebase Functions configuration or environment variables.");
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

exports.helloWorld2 = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      console.log("Function triggered with request:", request.body); // Log the incoming request
      const userInputText = request.body.text; // Access the text sent from Flutter

      const stream = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{role: "user", content: userInputText}], // Use the text from Flutter
        stream: true,
      });

      let message = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        process.stdout.write(content); // This will write to the Firebase function's logs
        message += content; // Accumulate the content in a message string
      }

      response.send(message); // Send the accumulated message as the response
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      response.status(500).send("Error processing your request.");
    }
  });
});

