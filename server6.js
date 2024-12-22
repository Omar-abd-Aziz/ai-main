import express from 'express';
import axios from 'axios';
import cors from 'cors';
import fetch from 'node-fetch'; // Import node-fetch
import { body, validationResult } from 'express-validator';

import dotenv from 'dotenv';
dotenv.config();

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
const PORT = process.env.PORT || 3040;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
