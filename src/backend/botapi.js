const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Firebase Admin Setup
const serviceAccount = require(path.join(__dirname, 'firebase-key.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Express Setup
const app = express();
const PORT = 5000;
const upload = multer({ dest: 'uploads/' });

app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization', 'x-uid'] }));
app.use(express.json());

const GROQ_API_KEY = 'YOUR_GROQ_API_KEY_HERE'; // replace if using Groq

// POST: /speech-to-text
app.post('/speech-to-text', upload.single('audio'), async (req, res) => {
  const uid = req.body.uid || req.headers["x-uid"];
  if (!uid) return res.status(400).json({ error: "Missing UID" });

  console.log("UID:", uid, "| Audio upload received.");

  const audioPath = req.file?.path;
  if (!audioPath) return res.status(400).json({ error: "No audio uploaded" });

  const wavPath = audioPath + '.wav';
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

  try {
    console.log("Converting to WAV...");
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(audioPath)
        .inputFormat('webm')
        .toFormat('wav')
        .on('end', () => resolve())
        .on('error', reject)
        .save(wavPath);
    });

    console.log("Running Whisper transcription...");
    const whisperPath = 'C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Packages\\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\\LocalCache\\local-packages\\Python313\\Scripts\\whisper.exe';

    const whisper = spawn(whisperPath, [
      wavPath,
      '--language', 'English',
      '--output_format', 'txt',
      '--output_dir', './uploads',
      '--verbose', 'False'
    ]);

    whisper.stderr.on('data', data => console.error("Whisper STDERR:", data.toString()));

    whisper.on('close', async (code) => {
      console.log("Whisper exited with code", code);

      const baseName = path.basename(wavPath, '.wav');
      const transcriptPath = path.join(__dirname, 'uploads', `${baseName}.txt`);
      if (!fs.existsSync(transcriptPath)) return res.status(500).json({ error: "Transcript file not found" });

      const transcript = fs.readFileSync(transcriptPath, 'utf8').trim();
      if (!transcript) return res.status(500).json({ error: "Transcript was empty" });

      console.log("Transcript:", transcript);

      let reply = "AI response disabled.";
      if (GROQ_API_KEY !== 'YOUR_GROQ_API_KEY_HERE') {
        try {
          const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: "llama3-8b-8192",
              messages: [
                { role: "system", content: "You are Ora, a helpful AI in a Google Meet." },
                { role: "user", content: transcript }
              ]
            })
          });

          const aiData = await aiRes.json();
          reply = aiData.choices?.[0]?.message?.content || "Sorry, I couldn't understand.";
        } catch (err) {
          console.error("AI response failed:", err);
        }
      }

      const conversationLog = `User said: ${transcript}\nOra said: ${reply}\n`;

      const now = new Date();
      const meetingDoc = {
        date: now.toLocaleDateString(),
        startTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        length: 'approx. 5s',
        transcript: conversationLog,
        createdAt: Timestamp.now()
      };

      try {
        await db.collection('users').doc(uid).set({}, { merge: true });
        await db.collection('users').doc(uid).collection('meetings').add(meetingDoc);
        console.log("Transcript stored in Firestore.");
        res.json({ triggered: true, transcript, reply });
      } catch (firestoreErr) {
        console.error("Firestore write failed:", firestoreErr);
        res.status(500).json({ error: "Firestore write failed" });
      }
    });

  } catch (error) {
    console.error("General error in flow:", error);
    res.status(500).json({ error: "Unexpected processing error" });
  }
});

// Basic Test Route
app.post('/start-bot', (req, res) => {
  console.log("/start-bot pinged.");
  res.json({ success: true, message: "Ora is running." });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Ora API running at http://localhost:${PORT}`);
});