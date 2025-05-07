(async function () {
  if (!window.location.href.includes("meet.google.com")) return;

  console.log("Injecting Ora with Mic Recorder...");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    const meter = document.createElement("div");
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
    level.style.height = "100%";
    level.style.background = "#4caf50";
    level.style.width = "0%";
    meter.appendChild(level);

    function updateMeter() {
      analyser.getByteTimeDomainData(dataArray);
      const rms = Math.sqrt(
        dataArray.reduce((sum, val) => sum + (val - 128) ** 2, 0) / dataArray.length
      );
      const percent = Math.min((rms / 128) * 100, 100);
      level.style.width = `${percent}%`;
      requestAnimationFrame(updateMeter);
    }
    updateMeter();

    const options = { mimeType: "audio/webm;codecs=opus" };
    const uid = localStorage.getItem("ora_uid");
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.warn("Codec not supported.");
      return;
    }

    function startRecordingLoop() {
      const mediaRecorder = new MediaRecorder(stream, options);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", blob, "chunk.webm");
        formData.append("uid", uid); // send UID

        try {
          const response = await fetch("http://localhost:5000/speech-to-text", {
            method: "POST",
            body: formData,
          });

          const result = await response.json();
          console.log("📥 Server response:", result);

          if (result.triggered && result.response) {
            const utterance = new SpeechSynthesisUtterance(result.response);
            utterance.lang = "en-US";
            speechSynthesis.speak(utterance);
          }
        } catch (e) {
          console.error("❌ Error sending audio:", e);
        }

        setTimeout(startRecordingLoop, 2000);
      };

      mediaRecorder.start();
      console.log("🎙️ Recording started...");
      setTimeout(() => {
        mediaRecorder.stop();
        console.log("🛑 Recording stopped after 5s");
      }, 5000);
    }

    startRecordingLoop();
  } catch (error) {
    console.error("Mic capture failed:", error);
  }
})();
