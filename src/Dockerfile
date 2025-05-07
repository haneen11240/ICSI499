FROM openjdk:17-slim

# === INSTALL DEPENDENCIES ===
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    xvfb \
    xauth \
    python3 \
    python3-pip \
    python3-dev \                
    build-essential \            
    pulseaudio \
    alsa-utils \
    ffmpeg \
    curl \
    gnupg \
    ca-certificates \
    portaudio19-dev \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*


# === INSTALL CHROME ===
RUN curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-linux-keyring.gpg \
  && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
  && apt-get update && apt-get install -y google-chrome-stable \
  && rm -rf /var/lib/apt/lists/*

# === SETUP APP ===
WORKDIR /app
COPY . /app

# === INSTALL PYTHON DEPS ===
RUN pip3 install --no-cache-dir pygame requests speechrecognition groq firebase-admin pyaudio

# === COPY SELENIUM LIBS ===
# Expecting: /libs/selenium-java-4.18.1.jar and /libs/lib/*.jar to be in local context
COPY libs /app/libs

# === SET DISPLAY FOR XVFB ===
ENV DISPLAY=:99

# === ENTRYPOINT ===
CMD xvfb-run --server-args="-screen 0 1280x720x24" sh -c "java -cp .:/app/libs/selenium-java-4.18.1.jar:/app/libs/lib/* GoogleMeetBotAI \$MEET_URL & python3 speak.py"
