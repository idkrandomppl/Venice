const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors()); // Allow your frontend to call this API
app.use(express.json());

// Your secret Venice API key (stored as an environment variable)
const VENICE_API_KEY = process.env.VENICE_API_KEY; 
const VENICE_API_URL = 'https://api.venice.ai/api/v1/chat/completions';

app.post('/api/chat', async (req, res) => {
  const { messages, model = 'venice-uncensored-1-2' } = req.body; // Default model

  try {
    const response = await fetch(VENICE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VENICE_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true, // Enable streaming for a better UX
      }),
    });

    // Forward the stream from Venice to the client
    if (response.body) {
      for await (const chunk of response.body) {
        res.write(chunk);
      }
      res.end();
    } else {
      res.status(500).json({ error: 'No response body from Venice' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to communicate with Venice API' });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
