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

    console.log(`000 Received text: ${text}`);

    let htmlText = text;
    if (text.includes("\\n\\n")) {
      console.log("111 Initial text has '\\n\\n':", text); // Debug: Check the initial text condition

      let htmlTextArray = htmlText.split("\\n\\n");
      console.log("222 After split by '\\n\\n':", htmlTextArray); // Debug: See the array after split

      htmlTextArray = htmlTextArray.map((item: string) => {
        console.log("333 Before replace in map:", item); // Debug: Log item before replacement
        const replacedItem = item.replace(/\\"/g, "\"");
        console.log("444 After replace in map:", replacedItem); // Debug: Log item after replacement
        return replacedItem;
      });

      // First filter out items that have 3 words or less
      const filteredTextArray = htmlTextArray.filter((item: string) => {
        // Split item into words and check the count
        const words = item.split(/\s+/).filter((word) => word);
        console.log("555 Words in item after split and filter:", words); // Debug: Log words array
        return words.length > 3;
      });

      console.log("666 Filtered array, items with more than 3 words:", filteredTextArray); // Debug: Log the final filtered array


      // Further filter out items containing '\n' and then join the remaining items
      console.log("Before filtering '\\n' from items:", filteredTextArray); // Debug: Log the array before filtering '\n'

      htmlText = filteredTextArray.filter((item: string | string[]) => {
        const includesNewLine = item.includes("\\n");
        console.log("Item checked for '\\n':", item, "Contains '\\n':", includesNewLine); // Debug: Check each item for '\n'
        return !includesNewLine;
      });

      console.log("After filtering '\\n' from items:", htmlText); // Debug: Log the array after filtering out '\n'

      htmlText = htmlText.join("\n\n");
      console.log("Final joined text:", htmlText); // Debug: Log the final text after joining


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
