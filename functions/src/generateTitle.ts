
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
  timeoutSeconds: 60,
}).https.onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      // console.log("Title generation triggered with request:", JSON.stringify(request.body));
      const {text, documentId, userId} = request.body;
      // console.log("Text for title gen:", text, "Document ID:", documentId, "User ID:", userId);

      if (!text || text.trim() === "") {
        console.error("Text is missing or empty in the request body.");
        response.status(400).send("Text is missing or empty in the request body.");
        return;
      }

      let title = "";

      if (text.length <= 99) {
        console.log("Text is less than or equal to 99 characters. Using text as title.");
        title = text;
      } else {
        console.log("Text exceeds 99 characters. Generating title using OpenAI.");
        // const instructions = "Summarize the following text in five words, it should be specific and sound like good journalism";
        const instructions = "Please generate a clear, concise, and informative title for the given text following these guidelines. The title should be the language of given text. Keep the title short, ideally under 9 words, avoid clickbait or vague language that doesn't convey the main point of the article, include keywords related to the main topic or theme of the text, and follow a consistent structure such as Main Topic - Specific Aspect or Event. An example of the desired title format is Climate Change - New Study Shows Accelerated Ice Melt in Antarctica. Please generate a title for the following text.";
        console.log("Instructions:", instructions);
        const prompt = instructions + "\n" + text;
        console.log("Debug: Generated instructions for OpenAI.", "Instructions:", instructions, "Text:", text);

        const stream = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{role: "user", content: prompt}],
          stream: true,
        });

        console.log("+++ OpenAI stream initiated. +++");

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          console.log(`Received chunk: ${content}`);
          title += content;
        }

        console.log(`Generated title: ${title}`);
      }

      await admin.firestore().collection("audioFiles").doc(documentId).update({
        title: title,
        userId: userId,
      });

      console.log(`Firestore document updated with title for documentId: ${documentId} and userId: ${userId}`);

      response.json({title: title});
    } catch (error) {
      console.error("Error generating title:", error);
      response.status(500).send("Error generating title.");
    }
  });
});
