const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');

// Initialize Firebase
const serviceAccount = require('./firebase-key.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Config
const uid = 'testuser123';
const uploadsDir = path.join(__dirname, 'uploads');

// Ensure user document exists
db.collection('users').doc(uid).set({}, { merge: true });

console.log(`Watching ${uploadsDir} for new .txt transcripts...`);

chokidar.watch(uploadsDir, { ignoreInitial: true })
  .on('add', async (filePath) => {
    if (!filePath.endsWith('.txt')) return;

    try {
      const filename = path.basename(filePath);
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (!content) {
        console.log(`Skipped empty file: ${filename}`);
        return;
      }

      const now = new Date();
      const doc = {
        date: now.toLocaleDateString(),
        startTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        length: 'auto-watched',
        transcript: `User said: ${content}\nOra said: [reply placeholder]\n`,
        createdAt: Timestamp.now()
      };

      await db.collection('users').doc(uid).collection('meetings').add(doc);
      console.log(`Stored transcript from: ${filename}`);
    } catch (err) {
      console.error(`Failed to process ${filePath}:`, err);
    }
  });
