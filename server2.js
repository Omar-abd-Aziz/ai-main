const express = require('express');
const ai = require('./index'); // Adjust as needed
const app = express();
const cors = require('cors');

const models = [
    "gpt-4o-mini",
    "gpt-4-turbo-2024-04-09",
    "claude-3-5-sonnet-20240620",
    "grok-2",
    "claude-3-sonnet-20240229",
    "grok-2-mini",
    "claude-3-opus-20240229",
    "gpt-4o-2024-08-06",
    "gemini-1.5-flash-exp-0827",
    "claude-2.1",
    "gpt-4o-free",
    "gemini-1.5-pro-exp-0827",
    "claude-3-haiku-20240307",
    "gpt-4o-mini-free",
    "claude-3-opus-20240229-gcp"
];

app.use(cors());
app.use(express.json());

const modelTimeout = 10000; // Timeout for each model request in ms

// Function to test all models and return sorted results
const testAllModels = async (messages) => {
  const results = [];
  const status = { success: [], timeout: [], failed: [] };

  const modelPromises = models.map((model) => {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.log(`Model ${model} timed out.`);
        status.timeout.push(model);
        resolve(null); // Resolve null on timeout
      }, modelTimeout);

      ai.generate(model, messages)
        .then(response => {
          const responseTime = Date.now() - startTime;
          console.log(`Model ${model} responded in ${responseTime} ms`);
          clearTimeout(timer);
          results.push({ model, response, responseTime });
          status.success.push(model);
          resolve();
        })
        .catch(error => {
          console.error(`Error with model ${model}:`, error.message || error);
          clearTimeout(timer);
          status.failed.push(model);
          resolve();
        });
    });
  });

  await Promise.all(modelPromises);

  // Sort results by responseTime (ascending)
  const sortedResults = results.sort((a, b) => a.responseTime - b.responseTime);
  return { sortedResults, status };
};

// Endpoint 1: Get first successful response
app.post('/generate', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  const messages = [{ role: 'user', content: userMessage }];

  const getAIResponse = new Promise((resolve, reject) => {
    let resolved = false;

    models.forEach((model) => {
      const timer = setTimeout(() => {
        if (!resolved) console.log(`Model ${model} timed out.`);
      }, modelTimeout);

      ai.generate(model, messages)
        .then(response => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({ model, response });
          }
        })
        .catch(() => clearTimeout(timer));
    });

    setTimeout(() => {
      if (!resolved) reject(new Error('All models failed or timed out.'));
    }, modelTimeout * models.length);
  });

  try {
    const { model, response } = await getAIResponse;
    res.json({ success: true, model, response });
  } catch (error) {
    res.status(500).json({ success: false, error: 'All models failed or timed out.' });
  }
});

// Endpoint 2: Test all models and return sorted results
app.post('/testAll', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  const messages = [{ role: 'user', content: userMessage }];
  try {
    const { sortedResults, status } = await testAllModels(messages);
    res.json({ success: true, sortedResults, status });
  } catch (error) {
    console.error('Error testing all models:', error);
    res.status(500).json({ success: false, error: 'An error occurred while testing all models.' });
  }
});

// Start the server
const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
