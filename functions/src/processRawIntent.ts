/* eslint-disable require-jsdoc */
/* eslint-disable eol-last */
import * as functions from "firebase-functions";

export const processRawIntent = functions.https.onRequest(async (req, res) => {
  try {
    const {text} = req.body;
    if (!text) {
      console.error("Text is required");
      res.status(400).send("Text is required");
      return;
    }

    const lines = text.split("\n");

    // Count sentences in each line and filter lines with at least two sentences
    const filteredLines = lines.filter((line: string) => {
      const sentenceCount = countSentences(line);
      return sentenceCount >= 2;
    });

    // Join the remaining lines with line breaks
    const processedText = filteredLines.join("\n");

    console.log("Processed Raw Intent:");
    console.log(processedText);

    res.status(200).json({text: processedText});
  } catch (error) {
    console.error("Error processing Raw Intent:", error);
    res.status(500).send("An error occurred while processing the Raw Intent");
  }
});

// Helper function to count the number of sentences in a string
function countSentences(text: string): number {
  const sentences = text.match(/[^.!?]+[.!?]/g);
  return sentences ? sentences.length : 0;
}