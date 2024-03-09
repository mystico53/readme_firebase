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

    console.log("Raw Intent:");
    lines.forEach((line: string, index: number) => {
      console.log(`Line ${index + 1}: ${line}`);
    });

    res.status(200).send("Raw Intent processed successfully");
  } catch (error) {
    console.error("Error processing Raw Intent:", error);
    res.status(500).send("An error occurred while processing the Raw Intent");
  }
});
