import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { body, validationResult } from 'express-validator';

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const API_URL = 'https://api.voids.top/v1/chat/completions';
const modelTimeout = 15000; // Timeout for each model request in ms

const models = [
  'gpt-4o-mini-free',
  'gpt-4o-mini',
  'gpt-4o-free',
  'gpt-4-turbo-2024-04-09',
  'gpt-4o-2024-08-06',
  'grok-2',
  'grok-2-mini',
  'claude-3-opus-20240229',
  'claude-3-opus-20240229-gcp',
  'claude-3-sonnet-20240229',
  'claude-3-5-sonnet-20240620',
  'claude-3-haiku-20240307',
  'claude-2.1',
  'gemini-1.5-flash-exp-0827',
  'gemini-1.5-pro-exp-0827'
];

// Function to fetch a model response with timeout
async function generate(model, messages) {
  if (typeof model !== 'string') throw new Error('TypeError: model must be string.');
  if (!Array.isArray(messages)) throw new Error('TypeError: messages must be an array.');

  try {
    const response = await axios.post(API_URL, { model, messages }, { timeout: modelTimeout });
    if (response.status >= 200 && response.status < 300) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error(`Request failed with status code: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error with model ${model}:`, error.message);
    throw error;
  }
}

// Function to get the first successful AI response
const getFirstAIResponse = async (messages) => {
  // Create a list of promises that send requests to all models
  const promises = models.map((model) =>
    generate(model, messages).then((response) => ({ model, response }))
      .catch((error) => ({ model, error })) // Catch errors to not stop all other requests
  );

  // Wait for the first successful response
  for (const promise of promises) {
    const result = await promise;
    if (result.response) {
      return { model: result.model, response: result.response }; // Return the first successful response
    }
  }

  throw new Error('All models failed or timed out.');
};

// Endpoint: Get first successful response
app.post(
  '/generate',
  body('message').isString().notEmpty().withMessage('Message must be a non-empty string.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userMessage = req.body.message;
    const messages = [{ role: 'user', content: userMessage }];

    try {
      const { model, response } = await getFirstAIResponse(messages);
      res.json({ success: true, model, response });
    } catch (error) {
      console.error('Error generating response:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Start the server
const PORT = process.env.PORT || 3040;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
