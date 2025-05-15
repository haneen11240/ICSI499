/**
 * Ora: AI Technical Consultant for Google Meet
 * 
 * File: inject.js
 * Purpose: Injected script for Google Meet pages.
 * 
 * Description:
 * Manages mic access, performs speech-to-text using Whisper, triggers AI responses, and plays TTS audio replies via virtual mic.
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

(async function () {
  // Only inject into meet
  if (!window.location.href.includes("meet.google.com")) return;

  // Check UID
  const uid = localStorage.getItem("ora_uid");
  if (!uid) {
    return;
  }

  // Session ID for firebase
  const sessionId = new URL(window.location.href).pathname.replace(/\//g, "-");

  const options = { mimeType: "audio/webm;codecs=opus" };
  let stream = null;
  let isListening = false;
  let audioCtx, analyser, dataArray;
  let transcriptCache = [];
  let fullTranscript = "";
  let isResponding = false;

  // Set up mic access and permissions, stream, and visual audio bar detector
  async function setupStream() {
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      createAudioMeter();
    }
  }

  // Simple audio meter to visualize voice
  function createAudioMeter() {
    const existing = document.getElementById("ora-meter");
    if (existing) return;

    const meter = document.createElement("div");
    meter.id = "ora-meter";
    meter.style.position = "fixed";
    meter.style.bottom = "80px";
    meter.style.right = "20px";
    meter.style.width = "100px";
    meter.style.height = "10px";
    meter.style.border = "1px solid #ccc";
    meter.style.background = "#222";
    meter.style.zIndex = 999999;
    document.body.appendChild(meter);

    const level = document.createElement("div");
    level.id = "ora-meter-level";
    level.style.height = "100%";
    level.style.background = "#4caf50";
    level.style.width = "0%";
    meter.appendChild(level);

    function updateMeter() {
      if (!analyser || !dataArray) return;
      analyser.getByteTimeDomainData(dataArray);
      const rms = Math.sqrt(
        dataArray.reduce((sum, val) => sum + (val - 128) ** 2, 0) / dataArray.length
      );
      const percent = Math.min((rms / 128) * 100, 100);
      level.style.width = `${percent}%`;
      requestAnimationFrame(updateMeter);
    }

    updateMeter();
  }

  async function startRecordingLoop() {
    if (!isListening || isResponding) return;

    const mediaRecorder = new MediaRecorder(stream, options);
    const chunks = [];

    // Audio chunks
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      if (!isListening || isResponding) return;

      // Audio package for whisper
      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "chunk.webm");
      formData.append("uid", uid);
      formData.append("sessionId", sessionId);

      try { // Trigger word/phrase detection
        const transcriptRes = await fetch("https://icsi499.onrender.com/local-transcript", {
          method: "POST",
          body: formData,
        });

        const transcriptData = await transcriptRes.json();
        const transcript = transcriptData.transcript?.trim();

        // Add to transcript for firebase
        if (transcript) {
          transcriptCache.push(transcript);
          fullTranscript += `User said: ${transcript}\n`;
        }

        // Trigger Ora, send transcript for interpertation
        if (transcriptData.triggered && transcript) {
          isResponding = true;

          const aiRes = await fetch("https://icsi499.onrender.com/speech-to-text", {
            method: "POST",
            body: formData,
          });

          const aiData = await aiRes.json();
          const reply = aiData.response;

          if (reply) {
            fullTranscript += `Ora said: ${reply}\n\n`;

            // TTS API call
            const ttsRes = await fetch("https://icsi499.onrender.com/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: reply }),
            });

            if (ttsRes.ok) {
              const audioBlob = await ttsRes.blob();
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);

              try { // Route response to virtual cable through voicemeeter
                const devices = await navigator.mediaDevices.enumerateDevices();
                const vbDevice = devices.find(d =>
                  d.label.toLowerCase().includes("voicemeeter input") && !d.label.toLowerCase().includes("aux")
                );

                if (vbDevice && audio.setSinkId) {
                  await audio.setSinkId(vbDevice.deviceId);
                } else {
                }

                // Play
                audio.onended = () => {
                  isResponding = false;
                  if (isListening) startRecordingLoop();
                };

                audio.play();
              } catch (err) { // Default mic fallback
                audio.onended = () => {
                  isResponding = false;
                  if (isListening) startRecordingLoop();
                };
                audio.play();
              }
            }
          } else {
            isResponding = false;
            if (isListening) startRecordingLoop();
          }
        } else { // Trigger not detected
          setTimeout(startRecordingLoop, 1000);
        }
      } catch (e) {
        setTimeout(startRecordingLoop, 1000);
      }
    };

    // Reloop continous 5 seconds
    mediaRecorder.start();
    setTimeout(() => {
      mediaRecorder.stop();
    }, 5000);
  }

  // Start/stop Ora logic
  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;

    if (event.data.type === "ORA_START") {
      await setupStream();
      if (!isListening) {
        isListening = true;
        startRecordingLoop();
      }
    }

    if (event.data.type === "ORA_STOP") {
      isListening = false;
      isResponding = false;

      // Get names of participants for firebase
      const names = Array.from(document.querySelectorAll('[role="listitem"][aria-label]'))
        .map(el => el.getAttribute("aria-label"))
        .filter(Boolean);

      const participants = names.length > 0 ? names.join(", ") : "Unknown Participants";

      const now = new Date();
      const dateStr = now.toLocaleDateString();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sessionName = `Meeting with ${participants} on ${dateStr} at ${timeStr}`;

      try { //Firebase log and end Ora session
        const res = await fetch("https://icsi499.onrender.com/end-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, fullTranscript, sessionName, date: dateStr, time: timeStr }),
        });

        const data = await res.json();
        if (data.success) {
        } else {
        }
      } catch (err) {
      }
    }
  });
})();