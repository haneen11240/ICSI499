/**
 * Ora: AI Technical Consultant for Google Meet
 * 
 * File: botapi.js
 * Purpose: A backend server handling AI transcription and response logic.
 * 
 * Description:
 * This file serves as the backend API for Ora.
 * 
 * 1. Audio Processing and Transcription:
 *    - Accepts audio data uploaded from the extension (recorded in `inject.js`).
 *    - Uses `ffmpeg` to convert WebM audio to WAV format for compatibility with transcription services.
 *    - Sends the converted audio to OpenAI Whisper API for accurate transcription.
 * 
 * 2. Trigger Word Detection:
 *    - Evaluates transcripts to detect if the word "Ora" (or homophone like "Aura") was spoken.
 *    - If triggered, proceeds to generate a contextual AI response.
 * 
 * 3. AI Response Generation:
 *    - Uses the GROQ API (`llama3-8b-8192` model) to generate a technical support reply.
 *    - Maintains session context by loading up to 10 prior exchanges from Firestore (user and Ora).
 *    - Enforces strict assistant behavior rules (e.g., no off-topic or emotional replies).
 * 
 * 4. Text-to-Speech (TTS):
 *    - Converts the AI-generated text response into spoken audio using Google Cloud TTS.
 *    - Returns the audio stream back to the extension for playback via a virtual mic.
 * 
 * 5. Transcript Logging and Session Archiving:
 *    - Writes full transcripts and dialogue logs to Firestore under the authenticated user’s UID and session ID.
 *    - Updates live sessions and end-of-call transcript saving.
 * 
 * 6. Security and Permissions:
 *    - Uses Firebase Admin SDK to securely access Firestore.
 *    - Authenticates users via ID token (when applicable) and stores session data privately.
 * 
 * Key Technologies Used:
 * - Express.js (API endpoints)
 * - Multer (handling audio file uploads)
 * - Fluent-ffmpeg + ffmpeg-installer (audio conversion)
 * - OpenAI Whisper (speech-to-text)
 * - GROQ LLM (AI responses)
 * - Google Cloud TTS (speech synthesis)
 * - Firebase Admin SDK (Firestore storage)
 * 
 * Authors:
 * - Enea Zguro
 * - Ilyas Tahari
 * - Elissa Jagroop
 * - Haneen Qasem
 * 
 * Institution: SUNY University at Albany  
 * Course: ICSI499 Capstone Project, Spring 2025  
 * Instructor: Dr. Pradeep Atrey
 */

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

// File directory, path and handling
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

// Whisper helpers
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

// Whisper transcription
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

// TTS
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

// Start Ora
app.post('/start-bot', (req, res) => {
  console.log("/start-bot received.");
  res.json({ success: true, message: "Ora launched successfully!" });
});

// Trigger detector for Ora (transcript not logged)
app.post('/local-transcript', upload.single('audio'), async (req, res) => {
  const { uid, sessionId } = req.body;
  if (!uid || !sessionId) return res.status(400).json({ error: "Missing uid or sessionId" });

  const audioPath = req.file?.path;
  const wavPath = audioPath + '.wav';

  try {
    await convertToWav(audioPath, wavPath);
    const transcript = await whisperToText(wavPath);
    const isTrigger = /\b(ora|aura)\b/.test(transcript.toLowerCase());

    fs.unlinkSync(audioPath);
    fs.unlinkSync(wavPath);

    res.json({ triggered: isTrigger, transcript });
  } catch (e) {
    console.error("Local transcript error:", e);
    res.status(500).json({ error: "Failed to transcribe" });
  }
});

// Combined user and AI response logging
app.post('/speech-to-text', upload.single('audio'), async (req, res) => {
  const { uid, sessionId } = req.body;
  if (!uid || !sessionId) return res.status(400).json({ error: "Missing uid or sessionId" });

  const audioPath = req.file?.path;
  const wavPath = audioPath + '.wav';

  try {
    await convertToWav(audioPath, wavPath);
    const transcript = await whisperToText(wavPath);

    const logsRef = db.collection('users').doc(uid).collection('sessions').doc(sessionId).collection('logs');

    // Get prior context
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
          {
            role: "system",
            content: `You are Ora, a professional AI tech consultant participating in a Google Meet. You provide focused, practical assistance only related to technical topics — such as software issues, hardware guidance, development tools, cloud services, or troubleshooting.
              1. Ignore personal questions, small talk, or any request that is not directly about tech or IT consulting.
              2. If someone calls you "Aura" or mispronounces your name, do **not** correct them. Just assume they're referring to you and respond professionally.
              3. Do not respond to or acknowledge topics like emotions, relationships, politics, news, or personal opinions.
              4. Stay concise. Offer step-by-step solutions or clarification questions if needed.
              5. If a prompt is off-topic, politely redirect:  
                *“I'm here to assist with technical questions. Could you clarify further?”*
              6. Never disclose that you're an AI or explain how you work unless explicitly asked for technical debugging purposes.
              Respond like a calm, confident consultant who is laser-focused on resolving tech issues and maximizing client productivity.`
          },
          ...contextHistory,
          { role: "user", content: transcript }
        ]
      })
    });

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || "Sorry, I couldn't understand.";

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

// Final session log (compile full transcript)
app.post('/end-session', async (req, res) => {
  const { uid, fullTranscript, sessionName, date, time } = req.body;
  if (!uid || !fullTranscript) return res.status(400).json({ error: "Missing UID or full transcript" });

  try {
    await db.collection('users').doc(uid).collection('meetings').add({
      createdAt: Timestamp.now(),
      fullTranscript,
      sessionName: sessionName || "Untitled Meeting",
      date: date || new Date().toLocaleDateString(),
      time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    res.json({ success: true, message: "Session saved to Firebase." });
  } catch (err) {
    console.error("Error saving session:", err);
    res.status(500).json({ error: "Failed to save session." });
  }
});

// Launch port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Ora API running on port ${PORT}`);
});
