import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import prisma from './prismaClient.js';
import summarizeRoute from "./summarize.js"
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Get all todos
app.get('/api/todos', async (req, res) => {
  const todos = await prisma.todo.findMany();
  res.json(todos);
});

// Add new todo
app.post('/api/todos', async (req, res) => {
  const { text } = req.body;
  const newTodo = await prisma.todo.create({ data: { text } });
  res.json(newTodo);
});

// Delete todo
app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.todo.delete({ where: { id: Number(id) } });
  res.json({ message: 'Todo deleted' });
});

// Update todo
app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { text, done } = req.body;
  try {
    const updatedTodo = await prisma.todo.update({
      where: { id: Number(id) },
      data: { text, done },
    });
    res.json(updatedTodo);
  } catch (error) {
    res.status(404).json({ error: 'Todo not found' });
  }
});


app.use(summarizeRoute);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
