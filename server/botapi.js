import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { spawn } from 'child_process';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, '../firebase-key.json'), 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'ora-tech-79eae.appspot.com'
});

const db = getFirestore();
const bucket = getStorage().bucket();
const GROQ_API_KEY = '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';

app.post('/start-bot', (req, res) => {
  console.log("/start-bot received.");
  res.json({ success: true, message: "Ora launched successfully!" });
});

app.post('/speech-to-text', upload.single('audio'), async (req, res) => {
  const uid = req.body.uid;
  if (!uid) return res.status(400).json({ error: "Missing UID" });

  console.log("[STEP 1] Received audio upload");
  const audioPath = req.file?.path;
  if (!audioPath) return res.status(400).json({ error: "No audio uploaded" });

  const wavPath = audioPath + '.wav';
  const timestamp = Date.now();
  const logPath = `logs/session_${uid}_${timestamp}.txt`;
  const localLogPath = path.join(__dirname, logPath);
  let conversationLog = '';

  try {
    console.log("[STEP 2] Running ffmpeg to convert to WAV...");
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(audioPath)
        .inputFormat('webm')
        .toFormat('wav')
        .on('end', resolve)
        .on('error', reject)
        .save(wavPath);
    });

    console.log("[STEP 3] Transcribing with local Whisper using spawn()...");
    const whisperPath = 'C:\\Users\\Enea\\AppData\\Local\\Packages\\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\\LocalCache\\local-packages\\Python313\\Scripts\\whisper.exe';

    const whisper = spawn(whisperPath, [
      wavPath,
      '--language', 'English',
      '--output_format', 'txt',
      '--output_dir', './uploads',
      '--verbose', 'False'
    ]);

    let transcript = '';

    whisper.stdout.on('data', data => {
      const output = data.toString();
      console.log(`Whisper STDOUT: ${output}`);
      const match = output.match(/\[\d{2}:\d{2}\.\d{3} --> .*?\]  (.*)/g);
      if (match) {
        transcript += match.map(line => line.replace(/\[.*?\]\s*/, '')).join(' ');
      }
    });

    whisper.stderr.on('data', data => console.error(`⚠️ Whisper STDERR: ${data}`));

    whisper.on('close', async (code) => {
      console.log(`Whisper exited with code ${code}`);

      try {
        if (!transcript.trim()) throw new Error("Transcript was empty or not parsed.");
        console.log("Final Transcript:", transcript);
        conversationLog += `User said: ${transcript}\n`;

        const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: "llama3-8b-8192",
            messages: [
              {
                role: "system",
                content: "You are Ora, a helpful technical assistant in a Google Meet call. Reply briefly and clearly."
              },
              {
                role: "user",
                content: transcript
              }
            ]
          })
        });

        const aiData = await aiRes.json();
        const reply = aiData.choices?.[0]?.message?.content || "Sorry, I couldn't understand.";
        console.log("Ora AI Reply:", reply);
        conversationLog += `Ora said: ${reply}\n`;

        fs.writeFileSync(localLogPath, conversationLog);

        await bucket.upload(localLogPath, {
          destination: `users/${uid}/logs/${timestamp}.txt`,
          metadata: { contentType: 'text/plain' }
        });

        await db.collection('users').doc(uid).collection('logs').add({
          createdAt: Timestamp.now(),
          logName: `session_${timestamp}.txt`,
          storagePath: `users/${uid}/logs/${timestamp}.txt`
        });

        res.json({ triggered: true, response: reply });
      } catch (e) {
        console.error("Failed in processing flow:", e);
        res.status(500).json({ error: "Transcript or AI flow failed" });
      }
    });
  } catch (error) {
    console.error("[ERROR] Speech-to-text processing error:", error);
    res.status(500).json({ error: "Processing error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Ora API running on port ${PORT}`);
});