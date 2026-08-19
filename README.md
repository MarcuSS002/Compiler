# LatestCompiler

LatestCompiler is a small online code runner with a React frontend, an Express API, a Redis-backed job queue, and a worker process that executes submitted code.

## Project Structure

```text
.
+-- backend/   # Express API for submissions and status lookup
+-- frontend/  # React + Vite editor UI
`-- worker/    # Queue consumer that runs submitted code
```

## How It Works

1. The frontend sends a code submission to `POST /submission`.
2. The backend stores the submission in Postgres with a pending status.
3. The backend pushes the job into an Upstash Redis list named `problems`.
4. The worker polls Redis, runs the code, and updates the submission row.
5. The frontend polls `GET /submission/:id` until the result is ready.

Supported languages:

- C++
- JavaScript
- Python

## Prerequisites

- Node.js
- npm
- PostgreSQL database
- Upstash Redis REST database
- Runtime tools available to the worker:
  - `node` for JavaScript
  - `python3` for Python
  - `g++` for C++

## Environment Variables

Create a `.env` file in both `backend/` and `worker/`:

```env
DATABASE_URL=your_postgres_connection_string
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
```

## Database Setup

The app expects a `submissions` table. A minimal schema is:

```sql
CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  output TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Installation

Install dependencies in each app directory:

```bash
cd backend
npm install

cd ../worker
npm install

cd ../frontend
npm install
```

## Running Locally

Start the backend API:

```bash
cd backend
npm run dev
```

The backend runs at:

```text
http://localhost:3000
```

Start the worker in a second terminal:

```bash
cd worker
npm run dev
```

Start the frontend in a third terminal:

```bash
cd frontend
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## API

### Create Submission

```http
POST /submission
Content-Type: application/json
```

Request body:

```json
{
  "questionId": 1,
  "code": "console.log('hello')",
  "language": "js"
}
```

Response:

```json
{
  "message": "Submission received successfully",
  "id": 1
}
```

### Get Submission

```http
GET /submission/:id
```

Returns the stored submission, including `status` and `output`.

## Build Commands

Backend:

```bash
cd backend
npm run build
npm start
```

Frontend:

```bash
cd frontend
npm run build
npm run preview
```

Worker:

```bash
cd worker
npm start
```

## Notes

- The frontend currently expects the backend at `http://localhost:3000`.
- The worker uses a 5 second execution timeout for submitted programs.
- C++ submissions are compiled before execution with `g++`.
- Submitted code is executed locally by the worker process, so do not run untrusted code without sandboxing.
