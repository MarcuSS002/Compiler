import express, { response } from 'express';
import "dotenv/config";
import {redis} from './redis';
import { Pool } from 'pg';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

app.post('/submission', async (req, res) => {
  const { questionId, code, language } = req.body;

  // 1. Save to DB first to get the ID
  const result = await pool.query(
    `INSERT INTO submissions (question_id, code, language) VALUES ($1, $2, $3) RETURNING id`,
    [questionId, code, language]
  );

  const submissionId = result.rows[0].id;

  // 2. Push to Redis with real DB id
  await redis.lpush("problems", JSON.stringify({
    submissionId,
    questionId,
    code,
    language
  }));

  res.json({
    message: "Submission received successfully",
    id: submissionId
  });
});

app.get('/submission/:id', async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT * FROM submissions WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ message: "Submission not found" });
    return;
  }

  res.json(result.rows[0]);
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});