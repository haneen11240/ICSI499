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

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-uid']
}));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const serviceAccount = require(path.join(__dirname, '../firebase-key.json'));
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

const GROQ_API_KEY = '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';

app.post('/start-bot', (req, res) => {
  console.log("/start-bot received.");
  res.json({ success: true, message: "Ora launched successfully!" });
});

app.post('/speech-to-text', upload.single('audio'), async (req, res) => {
  const uid = req.body.uid || req.headers["x-uid"];
  if (!uid) return res.status(400).json({ error: "Missing UID" });
  console.log("[STEP 1] Received audio upload");

  const audioPath = req.file?.path;
  if (!audioPath) return res.status(400).json({ error: "No audio uploaded" });

  const wavPath = audioPath + '.wav';
  const timestamp = Date.now();
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
  let conversationLog = '';

  try {
    console.log("[STEP 2] Running ffmpeg to convert to WAV...");
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(audioPath)
        .inputFormat('webm')
        .toFormat('wav')
        .on('end', () => resolve())
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

    whisper.stderr.on('data', data => console.error(`⚠️ Whisper STDERR: ${data}`));

    whisper.on('close', async (code) => {
      console.log(`✅ Whisper exited with code ${code}`);

      try {
        const baseName = path.basename(wavPath, '.wav');
        const transcriptPath = path.join(__dirname, 'uploads', `${baseName}.txt`);

        if (!fs.existsSync(transcriptPath)) {
          throw new Error("Transcript file not found.");
        }

        const transcript = fs.readFileSync(transcriptPath, 'utf8').trim();
        if (!transcript) throw new Error("Transcript was empty or not parsed.");

        console.log("📝 Final Transcript:", transcript);
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
        console.log("🎤 Ora AI Reply:", reply);
        conversationLog += `Ora said: ${reply}\n`;

        const now = new Date();
        const meetingDoc = {
          date: now.toLocaleDateString(),
          startTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          length: '5 seconds',
          transcript: conversationLog,
          createdAt: Timestamp.now()
        };

        await db.collection('users').doc(uid).collection('meetings').add(meetingDoc);

        res.json({ triggered: true, response: reply });
      } catch (e) {
        console.error("❌ Failed in processing flow:", e);
        res.status(500).json({ error: "Transcript or AI flow failed" });
      }
    });
  } catch (error) {
    console.error("❌ [ERROR] Speech-to-text processing error:", error);
    res.status(500).json({ error: "Processing error" });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Ora API running on http://localhost:${PORT}`);
});