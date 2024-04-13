/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
import * as functions from "firebase-functions";

// This function processes the raw intent received in a request
export const processRawIntent = functions.https.onRequest(async (req, res) => {
  try {
    console.log("Starting to process raw intent");
    const {text} = req.body;

    if (!text) {
      console.error("Text is required");
      res.status(400).send("Text is required");
      return;
    }

    console.log(`Received text: ${text}`);

    let htmlText = text;
    if (text.includes("\\n\\n")) {
      const htmlTextArray = htmlText.split("\\n\\n");

      // First filter out items that have 3 words or less
      const filteredTextArray = htmlTextArray.filter((item: { split: (arg0: RegExp) => { (): any; new(): any; filter: { (arg0: (word: any) => any): { (): any; new(): any; length: number; }; new(): any; }; }; }) => {
        // Split item into words and check the count
        return item.split(/\s+/).filter((word) => word).length > 3;
      });

      // Further filter out items containing '\n' and then join the remaining items
      htmlText = filteredTextArray.filter((item: string | string[]) => !item.includes("\\n")).join("\n\n");

      res.status(200).json({text: htmlText});
    } else {
      const lines = text.split("\n");
      const linesWithoutUrls = lines.filter((line: string) => !line.match(/https?:\/\//));
      console.log(`Lines after removing URLs: ${linesWithoutUrls.length} lines left`);

      // Add a step to filter out lines containing three consecutive dots
      const linesWithoutDots = linesWithoutUrls.filter((line: string) => !line.includes("..."));
      console.log(`Lines after removing three dots: ${linesWithoutDots.length} lines left`);

      const filteredLines = linesWithoutDots.filter((line: string) => {
        const sentenceCount = countSentences(line);
        console.log(`Line "${line}" has ${sentenceCount} sentences`);
        return sentenceCount >= 1;
      });

      // Identify and print duplicate lines
      const duplicates = findDuplicates(filteredLines);
      console.log(`Found ${duplicates.length} duplicate lines.`);
      if (duplicates.length > 0) {
        console.log("Duplicate lines are:");
        duplicates.forEach((line) => console.log(line));
      }
      const processedText = filteredLines.join("\n");
      console.log("Processed Raw Intent:");
      console.log(processedText);
      res.status(200).json({text: processedText});
    }
  } catch (error) {
    console.error("Error processing Raw Intent:", error);
    res.status(500).send("An error occurred while processing the Raw Intent");
  }
});

// Helper function to count the number of sentences in a string
function countSentences(text: string): number {
  const sentences = text.match(/[^.!?]+[.!?]/g);
  const count = sentences ? sentences.length : 0;
  console.log(`Counted sentences: ${count}`);
  return count;
}

// Helper function to find duplicates in an array of strings
function findDuplicates(lines: string[]): string[] {
  const duplicates: any[] = [];
  const lineCounts = new Map();

  lines.forEach((line) => {
    const currentCount = lineCounts.get(line) || 0;
    lineCounts.set(line, currentCount + 1);
  });

  lineCounts.forEach((count, line) => {
    if (count > 1) {
      duplicates.push(line);
    }
  });

  console.log(`Identified ${duplicates.length} duplicates.`);
  return duplicates;
}
