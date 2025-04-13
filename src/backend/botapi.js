// bot_api.js
const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.post('/start-bot', (req, res) => {
  const { meetUrl, userId, platform } = req.body;
  if (!meetUrl || !userId || !platform) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const cmd = `docker run --rm -e MEET_URL=\"${meetUrl}\" -e USER_ID=\"${userId}\" -e PLATFORM=\"${platform}\" ora`;
  console.log("🔁 Launching Ora with:", cmd);

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error("Error launching Ora:", stderr);
      return res.status(500).json({ error: 'Failed to launch Ora' });
    }
    console.log("Ora launched:", stdout);
    res.json({ status: 'Ora launched', sessionId: Date.now() });
  });
});

app.listen(port, () => {
  console.log(`Ora bot API running at http://localhost:${port}`);
});