const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

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

  const timestamp = Date.now();
  let conversationLog = '';

  try {
    console.log("[STEP 2] Skipping Whisper (Render test mode)");
    const transcript = "This is a simulated transcript for testing Ora on Render.";
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
  } catch (error) {
    console.error("❌ [ERROR] Processing error:", error);
    res.status(500).json({ error: "Processing error" });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Ora API running on http://localhost:${PORT}`);
});