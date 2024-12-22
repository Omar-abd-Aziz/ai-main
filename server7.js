import express from 'express';
import admin from 'firebase-admin';


import cors from 'cors';
import fetch from 'node-fetch'; // Import node-fetch
import { body, validationResult } from 'express-validator';

import dotenv from 'dotenv';
dotenv.config();


// Firebase Admin Initialization
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); // Your Firebase service account JSON
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();


const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const API_URL = process.env.API_URL;
const modelTimeout = parseInt(process.env.MODEL_TIMEOUT, 10) || 15000; // Timeout for each model request in ms

const models = [
  'grok-2',
  'gpt-4o-mini',
  'gpt-4o-free',
  'grok-2-mini',
  'gpt-4o-mini-free',
  'gemini-1.5-flash-exp-0827',
  'gpt-4-turbo-2024-04-09',
  'gpt-4o-2024-08-06',
  'claude-3-opus-20240229',
  'claude-3-opus-20240229-gcp',
  'claude-3-sonnet-20240229',
  'claude-3-5-sonnet-20240620',
  'claude-3-haiku-20240307',
  'claude-2.1',
  'gemini-1.5-pro-exp-0827',
];






async function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authorization token is required.' });
  }

  try {
    // Fetch token from Firestore
    const tokenDoc = await db.collection('tokens').doc(token).get();

    if (!tokenDoc.exists) {
      return res.status(401).json({ success: false, error: 'Invalid token.', support: "please call Eng Omar Elhalwany on whatsapp 01111881968"  });
    }

    const tokenData = tokenDoc.data();
    const currentDate = new Date();

    // Check end date and status
    if (new Date(tokenData.endDate) < currentDate) {
      return res.status(403).json({ success: false, error: 'Token has expired.', support: "please call Eng Omar Elhalwany on whatsapp 01111881968"  });
    }

    if (!tokenData.isRun) {
      return res.status(403).json({ success: false, error: 'Token is inactive.', support: "please call Eng Omar Elhalwany on whatsapp 01111881968"  });
    }

    // Token is valid
    req.tokenData = tokenData; // Attach token data to the request
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ success: false, error: 'Internal server error.', support: "please call Eng Omar Elhalwany on whatsapp 01111881968"  });
  }
}















// Generate AI response
async function generateWithAI(predefinedRules) {
  predefinedRules = predefinedRules.trim();

  let messagesPayload = [
    { role: "system", content: `${predefinedRules}` },
  ];

  try {
    for (let model of models) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model, messages: messagesPayload }),
          timeout: modelTimeout, // Set timeout
        });

        if (response.ok) {
          const data = await response.json();
          if (data.choices && data.choices.length > 0) {
            console.log("model: ", model, " success");
            console.log("***********************");
            return data.choices[0].message.content;
          }
        }
      } catch (error) {
        console.error(`Error with model ${model}:`, error.message);
      }
    }

    throw new Error('All models failed or timed out.');
  } catch (error) {
    console.error('Error in generateWithAI:', error.message);
    throw error;
  }
}

// Endpoint: Generate AI response
app.post(
  '/generate-ai',
  verifyToken, // Add middleware to verify token
  body('predefinedRules').isString().notEmpty().withMessage('predefinedRules must be a non-empty string.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const predefinedRules = req.body.predefinedRules;

    try {
      const aiResponse = await generateWithAI(predefinedRules);
      console.log("aiResponse: ", aiResponse);
      res.json({ success: true, response: aiResponse });
    } catch (error) {
      console.log("aiResponse: ", predefinedRules);
      console.error('Error in /generate-ai:', error.message);
      res.status(500).json({ success: false, error: error.message, support: "please call Eng Omar Elhalwany on whatsapp 01111881968" });
    }
  }
);

// Start the server
const PORT = process.env.PORT || 3070;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
