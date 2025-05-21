import express from 'express';
import prisma from './prismaClient.js';
import axios from 'axios';
const router = express.Router();

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

const getTodoPrompt = async () => {
  const todos = await prisma.todo.findMany({ where: { done: false } });
  if (todos.length === 0) return null;

  const prompt = `
You are a helpful assistant. Summarize the following list of pending TODOs in 2-3 concise sentences for a Slack update:

${todos.map(t => '- ' + t.text).join('\n')}

Keep it short, clear, and professional.`;
  return prompt.trim();
};

const summarizeWithGemini = async (prompt) => {
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  const response = await axios.post(GEMINI_API_URL, body, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data.candidates[0].content.parts[0].text;
};

const sendToSlack = async (message) => {
  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, { text: message });
    console.log('Message has sent to Slack!');
  } catch (error) {
    console.error('Failed to send message to Slack:', error.response?.data || error.message);
  }
};

router.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { done } = req.body;

  try {
    const updatedTodo = await prisma.todo.update({
      where: { id: Number(id) },
      data: { done },
    });
    res.json(updatedTodo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});
router.post('/api/summarize', async (req, res) => {
  try {
    const prompt = await getTodoPrompt();
    if (!prompt) return res.json({ message: 'No pending todos.' });
    const summary = await summarizeWithGemini(prompt);
    await sendToSlack(summary);
    res.json({ message: 'Summary sent to Slack!', summary });
  } catch (err) {
    console.error('Error summarizing or sending:', err.response?.data || err.message);
    res.status(500).json({ message: 'Error summarizing or sending to Slack.' });
  }
});

export default router;
