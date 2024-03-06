/* eslint-disable max-len */
import * as functions from "firebase-functions";
import OpenAI from "openai";
import * as corsLib from "cors";
import * as dotenv from "dotenv";
dotenv.config();

const cors = corsLib({origin: true});

const openaiApiKey = process.env.FUNCTIONS_OPENAI_KEY || functions.config().openai?.key;
if (!openaiApiKey) {
  console.error("No API key found in Firebase Functions configuration or environment variables.");
  throw new Error("OpenAI API key is not set in Firebase Functions configuration or environment variables.");
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

export const cleanText = functions.runWith({
  timeoutSeconds: 540, // Set your desired timeout up to the maximum allowed.
}).https.onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      console.log("Function triggered with request:", JSON.stringify(request.body));
      const instructions = "The following text is long, it has thousands of characters and might be messy, I want to read it to someone, extract the article text verbatim. The goal is to have the full article text without any clutter. Do not include any captions of photos.";
      // const instructions = " Read the following text and extract only the main article content, ignoring all ads, headers, and any other clutter.";

      const {text} = request.body;

      // Concatenate instructions with the input text
      const prompt = instructions + "\n" + text;

      const stream = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        // model: "gpt-4",
        messages: [{role: "user", content: prompt}],
        stream: true,
      });

      console.log("+++ OpenAI stream initiated. +++");

      let message = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        console.log(`Received chunk: ${content}`);
        message += content;
      }

      console.log(`Final accumulated message: ${message.substring(0, 100)}...`); // Log the beginning of the final message to avoid log overflow

      response.json({generated_text: message});
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      response.status(500).send("Error processing your request.");
    }
  });
});
