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

// In-memory session store
const sessionLogs = new Map();

const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: './google-tts-key.json'
});

app.post('/tts', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  try {
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Wavenet-C', // voice
      },
      audioConfig: { audioEncoding: 'MP3' },
    });

    res.set('Content-Type', 'audio/mpeg');
    res.send(response.audioContent);
  } catch (err) {
    console.error("TTS failed:", err);
    res.status(500).json({ error: "TTS failed" });
  }
});
app.post('/start-bot', (req, res) => {
  console.log("/start-bot received.");
  res.json({ success: true, message: "Ora launched successfully!" });
});

app.post('/speech-to-text', upload.single('audio'), async (req, res) => {
  const uid = req.body.uid;
  if (!uid) return res.status(400).json({ error: "Missing UID" });

  const sessionId = req.body.sessionId;
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

  console.log("[STEP 1] Received audio upload");
  const audioPath = req.file?.path;
  if (!audioPath) return res.status(400).json({ error: "No audio uploaded" });

  const wavPath = audioPath + '.wav';

  try {
    const stats = fs.statSync(audioPath);
    console.log("Uploaded file size:", stats.size);
    if (stats.size < 1000) {
      console.warn("Audio file too small — skipping transcription.");
      return res.status(400).json({ error: "Audio too small" });
    }

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

    console.log("[STEP 3] Transcribing with OpenAI Whisper API...");
    const audioBuffer = fs.readFileSync(wavPath);

    const form = new FormData();
    form.append('file', audioBuffer, { filename: 'audio.wav' });
    form.append('model', 'whisper-1');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: form
    });

    const whisperData = await whisperRes.json();
    console.log("Whisper raw response:", whisperData);

    const transcript = whisperData?.text?.trim();
    if (!transcript) throw new Error("Transcript was empty or failed");

    const lowerTranscript = transcript.toLowerCase();
    const isTrigger = lowerTranscript.includes("ora,") || lowerTranscript.includes("ora what do you think");
    
    const logsRef = db.collection('users').doc(uid).collection('sessions').doc(sessionId).collection('logs');
    await logsRef.add({
      createdAt: Timestamp.now(),
      userSaid: transcript,
      oraSaid: null,
      triggered: isTrigger
    });

    if (!isTrigger) {
      console.log("No trigger phrase detected. Skipping response.");
      return res.json({ triggered: false, response: null });
    }

    const snap = await logsRef.orderBy('createdAt', 'desc').limit(10).get();
    const contextHistory = [];
    snap.docs.reverse().forEach(doc => {
      const data = doc.data();
      if (data.userSaid) contextHistory.push({ role: "user", content: data.userSaid });
      if (data.oraSaid) contextHistory.push({ role: "assistant", content: data.oraSaid });
    });
    
    console.log("Final Transcript:", transcript);

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are Ora, a helpful AI tech consultant in a Google Meet. Respond clearly and concisely based on prior conversation." },
          ...contextHistory,
          { role: "user", content: transcript }
        ]
      })
    });

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || "Sorry, I couldn't understand.";
    console.log("Ora AI Reply:", reply);

    // Store the transcript in session memory instead of Firestore immediately
    const prev = sessionLogs.get(uid) || '';
    const newLog = `${prev}User said: ${transcript}\nOra said: ${reply}\n\n`;
    sessionLogs.set(uid, newLog);
    await logsRef.add({
      createdAt: Timestamp.now(),
      userSaid: null,
      oraSaid: reply,
      triggered: true
    });

    // Clean up
    fs.unlinkSync(audioPath);
    fs.unlinkSync(wavPath);

    res.json({ triggered: true, response: reply });

  } catch (error) {
    console.error("[ERROR] Speech-to-text processing error:", error);
    res.status(500).json({ error: "Processing error" });
  }
});

// Save full session to Firestore on manual request
app.post('/end-session', async (req, res) => {
  const { uid } = req.body;
  if (!uid || !sessionLogs.has(uid)) return res.status(400).json({ error: "No session found" });

  const transcript = sessionLogs.get(uid);
  const now = new Date();

  try {
    await db.collection('users').doc(uid).collection('meetings').add({
      createdAt: Timestamp.now(),
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      fullTranscript: transcript
    });
    sessionLogs.delete(uid); // Clear from memory
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