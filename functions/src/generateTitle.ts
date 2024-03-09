/* eslint-disable max-len */
import * as functions from "firebase-functions";
import OpenAI from "openai";
import * as corsLib from "cors";
import * as dotenv from "dotenv";
import * as admin from "firebase-admin";

dotenv.config();
const cors = corsLib({origin: true});

const openaiApiKey = process.env.FUNCTIONS_OPENAI_KEY || functions.config().openai?.key;
if (!openaiApiKey) {
  console.error("No API key found in Firebase Functions configuration or environment variables.");
  throw new Error("OpenAI API key is not set in Firebase Functions configuration or environment variables.");
} else {
  console.log("OpenAI API key successfully retrieved."); // Debug: Confirm API key retrieval
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

export const generateTitle = functions.runWith({
  timeoutSeconds: 60, // Set your desired timeout up to the maximum allowed.
}).https.onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      console.log("Title generation triggered with request:", JSON.stringify(request.body)); // Debug: Log request body
      const {text, documentId} = request.body;

      let title = "";

      if (text.length <= 99) {
        console.log("Text is less than or equal to 99 characters. Using text as title."); // Debug: Log short text handling
        title = text;
      } else {
        console.log("Text exceeds 99 characters. Generating title using OpenAI."); // Debug: Log title generation initiation
        const instructions = "Summarize the following text in three words";
        const prompt = instructions + "\n";

        const stream = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{role: "user", content: prompt}],
          max_tokens: 50,
          stream: true,
        });

        console.log("+++ OpenAI stream initiated. +++"); // Debug: Confirm OpenAI stream initiation
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          console.log(`Received chunk: ${content}`); // Debug: Log received chunk content
          title += content;
        }
        console.log(`Generated title: ${title}`); // Debug: Log generated title
      }

      await admin.firestore().collection("audioFiles").doc(documentId).update({
        title: title,
      });

      console.log(`Firestore document updated with title for documentId: ${documentId}`); // Debug: Log Firestore document update
      response.json({title: title});
    } catch (error) {
      console.error("Error generating title:", error); // Debug: Log error
      response.status(500).send("Error generating title.");
    }
  });
});
