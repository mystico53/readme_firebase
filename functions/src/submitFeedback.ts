/* eslint-disable max-len */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {FieldValue, getFirestore} from "firebase-admin/firestore";

// Initialize Firestore database
const db = getFirestore();

export const submitFeedback = functions.https.onRequest(async (req, res) => {
  const bucketName = "firebase-readme-123.appspot.com";

  try {
    const text = req.body.text as string;
    const screenshot = req.body.screenshot as string | undefined;

    // Create a new feedback document in Firestore
    const feedbackDocRef = await db.collection("feedback").add({
      text: text,
      created_at: FieldValue.serverTimestamp(),
    });

    if (screenshot) {
      const screenshotData = Buffer.from(screenshot, "base64");
      const screenshotFileName = `feedback/${feedbackDocRef.id}.png`;
      const screenshotRef = admin.storage().bucket(bucketName).file(screenshotFileName);

      // Set the feedback text as metadata
      const metadata = {
        contentType: "image/png",
        metadata: {
          text: text,
        },
      };

      // Save the screenshot with metadata
      await screenshotRef.save(screenshotData, {metadata});
    }

    res.status(200).send("Feedback submitted successfully");
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).send("Error submitting feedback");
  }
});
