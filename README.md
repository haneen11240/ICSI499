Ora – AI Technical Consultant for Google Meet
Overview

Ora is a real-time AI assistant designed to join Google Meet calls and provide technical support through natural voice interaction. Built as a Chrome extension with a Firebase-connected backend and GROQ LLM integration. using Whisper, Ora generates responses using a large language model, and replies using realistic voice synthesis (Google TTS). It is primarily designed for IT/tech consultancy during live video calls.

Key Features

- Passive voice recognition using Whisper
- AI response generation using GROQ
- Voice output using Google TTS
- User authentication and session storage
- Dashboard with meeting transcripts
- Local relay for speech debugging
- Installable audio setup utility

How to Run Ora
1. Clone or Download the Repository.
2. Set up Firebase and Google Cloud APIs:
   - Create a Firebase project, enable Authentication and Firestore.
   - Download service account JSON files (`firebase-key.json`, `google-tts-key.json`).
   - Enable Google Cloud Text-to-Speech API and Whisper transcription endpoint.
3. Setup Environment:
   - Place both credential files in the root directory.
   - Run `npm install` in the backend folder.
   - Start the backend: `npm start` or `node botapi.js`.
4. Build the Chrome Extension:
   - Use Vite to bundle: `vite build` or equivalent setup.
   - Load `dist` folder into Chrome (chrome://extensions > Developer Mode > Load unpacked).
5. Use Ora in Google Meet:
   - Open a Google Meet tab.
   - Click the Ora extension > Log in > Click 'Launch Ora'.
   - Ora will join and begin listening. Say 'Ora' to get help.
   - Speak your tech issue and receive a voice reply.
Deployment Notes

- To deploy the backend, use Render or another Node.js host. Ensure Whisper and TTS endpoints work correctly.
- Use VB-Cable or Voicemeeter to route Ora’s TTS audio into Meet.
- An installer `.exe` (OraAudioSetup.exe) is included to simplify setup for new users.
- Ensure voicemeeter is running with the Ora config file

Project Authors

Enea Zguro, Ilyas Tahari, Elissa Jagroop, Haneen Qasem  
SUNY University at Albany – ICSI499 Capstone (Spring 2025)  
Instructor: Dr. Pradeep Atrey