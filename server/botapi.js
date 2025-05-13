import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import os from 'os';
import textToSpeech from '@google-cloud/text-to-speech';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: os.tmpdir() });

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-key.json'), 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const GROQ_API_KEY = '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';
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: './google-tts-key.json'
});

// In-memory session store
const sessionLogs = new Map();

// Whisper Helper
async function convertToWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .inputFormat('webm')
      .toFormat('wav')
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}

async function whisperToText(wavPath) {
  const buffer = fs.readFileSync(wavPath);
  const form = new FormData();
  form.append('file', buffer, { filename: 'audio.wav' });
  form.append('model', 'whisper-1');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form
  });

  const data = await res.json();
  return data.text?.trim() || '';
}

// TTS Endpoint
app.post('/tts', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  try {
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: { languageCode: 'en-US', name: 'en-US-Wavenet-F' },
      audioConfig: { audioEncoding: 'MP3' },
    });

    res.set('Content-Type', 'audio/mpeg');
    res.send(response.audioContent);
  } catch (err) {
    console.error("TTS failed:", err);
    res.status(500).json({ error: "TTS failed" });
  }
});

// Basic start route
app.post('/start-bot', (req, res) => {
  console.log("/start-bot received.");
  res.json({ success: true, message: "Ora launched successfully!" });
});

// Lightweight route for checking trigger & storing transcript
app.post('/local-transcript', upload.single('audio'), async (req, res) => {
  const { uid, sessionId } = req.body;
  if (!uid || !sessionId) return res.status(400).json({ error: "Missing uid or sessionId" });

  const audioPath = req.file?.path;
  const wavPath = audioPath + '.wav';

  try {
    await convertToWav(audioPath, wavPath);
    const transcript = await whisperToText(wavPath);

    const lower = transcript.toLowerCase();
    const isTrigger = /\b(ora|aura)\b/.test(lower);

    fs.unlinkSync(audioPath);
    fs.unlinkSync(wavPath);

    res.json({ triggered: isTrigger, transcript });
  } catch (e) {
    console.error("Local transcript error:", e);
    res.status(500).json({ error: "Failed to transcribe" });
  }
});

// Full response  with memory
app.post('/speech-to-text', upload.single('audio'), async (req, res) => {
  const { uid, sessionId } = req.body;
  if (!uid || !sessionId) return res.status(400).json({ error: "Missing uid or sessionId" });

  const audioPath = req.file?.path;
  const wavPath = audioPath + '.wav';

  try {
    await convertToWav(audioPath, wavPath);
    const transcript = await whisperToText(wavPath);
    const logsRef = db.collection('users').doc(uid).collection('sessions').doc(sessionId).collection('logs');

    // Fetch context history
    const snap = await logsRef.orderBy('createdAt', 'desc').limit(10).get();
    const contextHistory = [];
    snap.docs.reverse().forEach(doc => {
      const data = doc.data();
      if (data.userSaid) contextHistory.push({ role: "user", content: data.userSaid });
      if (data.oraSaid) contextHistory.push({ role: "assistant", content: data.oraSaid });
    });

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", 
            content: `You are Ora, a helpful and friendly AI tech consultant participating in a Google Meet call. 
            If someone says "Aura" instead of "Ora", do not correct them — assume they meant you and respond normally. 
            Never mention your name was mispronounced. Just help as if you were addressed directly. 
            Use context from the conversation to provide thoughtful, on-topic responses.`
          },
          ...contextHistory,
          { role: "user", content: transcript }
        ]
      })
    });

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || "Sorry, I couldn't understand.";

    // Save reply
    const prev = sessionLogs.get(uid) || '';
    sessionLogs.set(uid, `${prev}User said: ${transcript}\nOra said: ${reply}\n\n`);

    await logsRef.add({
      createdAt: Timestamp.now(),
      userSaid: transcript,
      oraSaid: reply,
      triggered: true
    });

    fs.unlinkSync(audioPath);
    fs.unlinkSync(wavPath);

    res.json({ triggered: true, response: reply });
  } catch (error) {
    console.error("[ERROR] Speech-to-text processing error:", error);
    res.status(500).json({ error: "Processing error" });
  }
});

// Save full transcript at end
app.post('/end-session', async (req, res) => {
  const { uid, fullTranscript } = req.body;
  if (!uid || !fullTranscript) return res.status(400).json({ error: "Missing UID or full transcript" });

  const now = new Date();

  try {
    await db.collection('users').doc(uid).collection('meetings').add({
      createdAt: Timestamp.now(),
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      fullTranscript
    });

    res.json({ success: true, message: "Session saved to Firebase." });
  } catch (err) {
    console.error("Error saving session:", err);
    res.status(500).json({ error: "Failed to save session." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Ora API running on port ${PORT}`);
});