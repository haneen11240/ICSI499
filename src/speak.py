import speech_recognition as sr
import openai
from gtts import gTTS
import pygame
import os
import time
from groq import Groq

client = Groq(api_key="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")

def listen_to_mic():
    recognizer = sr.Recognizer()
    mic = sr.Microphone()

    with mic as source:
        print("🎤 Listening...")
        recognizer.adjust_for_ambient_noise(source)
        audio = recognizer.listen(source)

    try:
        print("🧠 Transcribing...")
        text = recognizer.recognize_google(audio)
        print(f"You said: {text}")
        return text
    except sr.UnknownValueError:
        print("😕 Could not understand audio.")
        return None
    except sr.RequestError as e:
        print(f"⚠️ Speech recognition error: {e}")
        return None

def get_ai_response(prompt):
    response = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

def speak(text):
    tts = gTTS(text)
    filename = "response.mp3"
    tts.save(filename)

    pygame.mixer.init()
    pygame.mixer.music.load(filename)
    pygame.mixer.music.play()

    while pygame.mixer.music.get_busy():
        time.sleep(0.1)

    pygame.mixer.quit()
    os.remove(filename)

if __name__ == "__main__":
            test_prompt = "Can you explain quantum computing in simple terms?"

    # while True:
    #     voice_input = listen_to_mic()

    #     if voice_input:
    #         if voice_input.lower() in ["exit", "quit", "stop listening"]:
    #             print("👋 Exiting...")
    #             break
            # ai_response = "Sure! Quantum computing is like using light switches that can be both on and off at once. It lets us solve some problems way faster."

            ai_response = get_ai_response(test_prompt)
            # ai_response = get_ai_response(voice_input)
            print("🤖 AI:", ai_response)
            speak(ai_response)