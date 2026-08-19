import 'dotenv/config';
import { Redis } from '@upstash/redis';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from "url";
import path from "path";
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function runCode(cmd: string, args: string[], timeoutMs = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let output = '';
    let error = '';

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("TLE: Code exceeded time limit of 5 seconds"));
    }, timeoutMs);

    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { error += data.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(error || 'Non-zero exit'));
      else resolve(output);
    });
  });
}

async function updateDB(submissionId: string, status: string, output: string) {
  await pool.query(
    `UPDATE submissions SET status = $1, output = $2 WHERE id = $3`,
    [status, output, submissionId]
  );
}

async function main() {
  const codeDir = path.join(__dirname, 'code');
  if (!fs.existsSync(codeDir)) {
    fs.mkdirSync(codeDir, { recursive: true });
  }

  while (true) {
    const response = await client.rpop<string>("problems");

    if (!response) {
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    const parsedResponse = response as any;
    const { submissionId, code, language } = parsedResponse;

    console.log(`Processing submissionId: ${submissionId} in language: ${language}`);

    try {
      let output = '';

      if (language === "js") {
        const filePath = path.join(__dirname, "code", "a.js");
        fs.writeFileSync(filePath, code);
        output = await runCode("node", [filePath]);

      } else if (language === "python") {
        const filePath = path.join(__dirname, "code", "a.py");
        fs.writeFileSync(filePath, code);
        output = await runCode("python3", [filePath]);

      } else if (language === "cpp") {
        const srcPath = path.join(__dirname, "code", "a.cpp");
        const binPath = path.join(__dirname, "code", "a.out");
        fs.writeFileSync(srcPath, code);

        // Step 1: Compile (no timeout for compilation, give it 15s)
        await runCode("g++", [srcPath, "-o", binPath], 15000);
        console.log(`Submission ${submissionId} compiled successfully`);

        // Step 2: Run binary (5s timeout)
        output = await runCode(binPath, []);

      } else {
        console.log(`Unsupported language: ${language}`);
        continue;
      }

      console.log("Output:", output);
      await updateDB(submissionId, "accepted", output);
      console.log(`Submission ${submissionId} accepted`);

    } catch (err: any) {
      const isTLE = err.message.startsWith("TLE");
      const status = isTLE ? "tle" : "error";
      await updateDB(submissionId, status, err.message);
      console.log(`Submission ${submissionId} ${status}:`, err.message);
    }
  }
}

console.log("Worker is Running...");

main().catch(console.error);