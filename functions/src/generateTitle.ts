/* eslint-disable max-len */
import * as functions from "firebase-functions";
import * as corsLib from "cors";
import * as dotenv from "dotenv";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

dotenv.config();

const cors = corsLib({origin: true});

// API key retrieval
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic?.key;

if (!anthropicApiKey) {
  console.warn("Anthropic API key not found. Please set it using one of the following methods:");
  console.warn("1. Set ANTHROPIC_API_KEY as an environment variable");
  console.warn("2. Use firebase functions:config:set anthropic.key=\"YOUR_API_KEY\"");
} else {
  console.log("Anthropic API key successfully retrieved.");
}

/**
 * Generates a title for the given text using the Anthropic AI service.
 *
 * @param {string} text - The text to generate a title for.
 * @return {Promise<string>} A promise that resolves to the generated title.
 * @throws {Error} If the Anthropic API key is not set or if there's an error in the API call.
 */
async function generateTitleWithAI(text: string): Promise<string> {
  if (!anthropicApiKey) {
    throw new Error("Anthropic API key is not set. Please configure it before using this function.");
  }

  const instructions = "Please generate a clear, concise, and informative title for the given text following these guidelines. The title should be in the language of the given text (likely either german or english). Keep the title short, ideally under 9 words, avoid clickbait or vague language that doesn't convey the main point of the article, include keywords related to the main topic or theme of the text, and follow a consistent structure such as Main Topic - Specific Aspect or Event. An example of the desired title format is Climate Change - New Study Shows Accelerated Ice Melt in Antarctica. Please generate a title for the following text.";
  const prompt = `${instructions}\n${text}`;

  try {
    console.log("Calling Anthropic API...");
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 100,
        messages: [
          {role: "user", content: prompt},
        ],
      }),
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error("Anthropic API error response:", data);
      throw new Error(`Anthropic API Error: ${JSON.stringify(data)}`);
    }

    if (data.content && data.content.length > 0 && data.content[0].type === "text") {
      return data.content[0].text.trim();
    } else {
      console.error("Unexpected Anthropic API response structure:", data);
      throw new Error("Unexpected Anthropic API response structure");
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error calling Anthropic API:", error.message);
      throw new Error(`Error calling Anthropic API: ${error.message}`);
    } else {
      console.error("Unknown error calling Anthropic API");
      throw new Error("Unknown error calling Anthropic API");
    }
  }
}

/**
 * Firebase Cloud Function to generate a title for given text.
 * This function uses the Anthropic AI service for title generation.
 *
 * @param {functions.https.Request} request - The HTTP request object.
 * @param {functions.Response} response - The HTTP response object.
 * @returns {Promise<void>}
 */
export const generateTitle = functions.runWith({
  timeoutSeconds: 60,
}).https.onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      console.log("Generate title function called");
      const {text, documentId, userId} = request.body;

      if (!text || text.trim() === "") {
        console.error("Text is missing or empty in the request body.");
        response.status(400).send("Text is missing or empty in the request body.");
        return;
      }

      let title: string;

      if (text.length <= 99) {
        console.log("Text is less than or equal to 99 characters. Using text as title.");
        title = text;
      } else {
        console.log("Generating title using Anthropic.");
        title = await generateTitleWithAI(text);
      }

      console.log(`Generated title: ${title}`);

      await admin.firestore().collection("audioFiles").doc(documentId).update({
        title: title,
        userId: userId,
      });

      console.log(`Firestore document updated with title for documentId: ${documentId} and userId: ${userId}`);

      response.json({title: title});
    } catch (error: unknown) {
      console.error("Error generating title:", error instanceof Error ? error.message : "Unknown error");
      if (error instanceof Error) {
        response.status(500).send(`Error generating title: ${error.message}`);
      } else {
        response.status(500).send("An unknown error occurred while generating the title.");
      }
    }
  });
});
