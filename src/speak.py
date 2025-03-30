import speech_recognition as sr
import requests
import pygame
import io
import time
import threading
from collections import deque
from groq import Groq

GROQ_API_KEY = "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"       # Replace with your Groq API key
VOICERSS_API_KEY = "7283c2b7a66c4359ae5535918c66da69"  # Replace with your Voice RSS API key
TRIGGER_PHRASES = ["what do you think aura", "aura what do you think"]
VOICE_LANGUAGE = "en-us"

groq_client = Groq(api_key=GROQ_API_KEY)
conversation_history = deque(maxlen=5)

def speak(text):
    print("🗣 Ora:", text)
    params = {
        'key': VOICERSS_API_KEY,
        'hl': VOICE_LANGUAGE,
        'src': text,
        'c': 'MP3',
        'f': '44khz_16bit_stereo'
    }

    response = requests.get('http://api.voicerss.org/', params=params)
    if response.ok:
        audio_stream = io.BytesIO(response.content)
        pygame.mixer.init()
        pygame.mixer.music.load(audio_stream)
        pygame.mixer.music.play()

        while pygame.mixer.music.get_busy():
            time.sleep(0.1)

        pygame.mixer.quit()
    else:
        print(f"❌ VoiceRSS error: {response.status_code} - {response.text}")

# ======= AI LOGIC =======
def get_ai_response(prompt):
    response = groq_client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Ora, an AI technical consultant. Your role is to assist users with technology, "
                    "programming, networking, and general IT topics. You may politely respond to greetings but "
                    "decline off-topic or personal questions. Stay professional and concise."
                )
            },
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content

# ======= HANDLE AI SPEAK THREAD =======
def handle_response(prompt):
    ai_response = get_ai_response(prompt)
    speak(ai_response)

# ======= NORMALIZER =======
def normalize(text):
    return text.lower().strip().replace(",", "")

# ======= MAIN LISTENER LOOP =======
def listen_loop():
    recognizer = sr.Recognizer()
    mic = sr.Microphone()

    with mic as source:
        recognizer.adjust_for_ambient_noise(source)

    while True:
        try:
            with mic as source:
                print("🎧 Listening...")
                audio = recognizer.listen(source)

            text = recognizer.recognize_google(audio)
            print(f"You said: {text}")
            conversation_history.append(text)
            clean_text = normalize(text)

            if any(clean_text.endswith(trigger) for trigger in TRIGGER_PHRASES):
                print("🔔 Trigger phrase detected!")

                full_context = " ".join(conversation_history)

                for trigger in TRIGGER_PHRASES:
                    if full_context.lower().strip().endswith(trigger):
                        full_context = full_context[:-(len(trigger))].strip()
                        break

                threading.Thread(target=handle_response, args=(full_context,)).start()

        except sr.UnknownValueError:
            print("🤷 Could not understand audio.")
        except sr.RequestError as e:
            print(f"⚠️ Speech recognition error: {e}")

# ======= MAIN =======
if __name__ == "__main__":
    listen_loop()