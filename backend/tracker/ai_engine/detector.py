"""
tracker/ai_engine/detector.py
------------------------------
⚠️ STATUS: LEGACY / OPTIONAL — Sept-2026 pivot ke baad, LIVE tracking
ab client-side (browser) me Human.js se hoti hai (static/js/human-tracker-
client.js dekho). Yeh file ab default live flow me CALL NAHI hoti.

Kab use hoga: agar future me "upload a pre-recorded video, deep analyze
it server-side" jaisa feature chahiye, tab yeh CNN pipeline reuse hogi —
isliye delete nahi kiya, sirf disconnect kiya hai.

Neeche ka code waisa hi hai jaisa pehle tha (tumhare original detect.py
ka server-safe version) — reference/fallback ke liye rakha hai.
"""

import cv2
import numpy as np
from tensorflow.keras.models import load_model
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "emotion_model.h5"   # tumhara existing file, yahan copy karo

EMOTIONS = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']

# Emotion -> "stress weight" mapping. Isi se hum Engagement/Productivity
# score banayenge (Happy/Neutral achha, Angry/Fear/Sad stress badhata hai).
STRESS_WEIGHT = {
    'Angry': 0.9, 'Disgust': 0.7, 'Fear': 0.8, 'Sad': 0.6,
    'Surprise': 0.3, 'Neutral': 0.1, 'Happy': 0.0,
}


class EmotionDetector:
    """
    Ek class banayi taaki model sirf ek baar RAM me load ho
    (singleton jaisa pattern) — Consumer har request pe naya
    object nahi banayega, ek hi instance reuse hoga.
    """

    def __init__(self):
        print("[AI Engine] Loading CNN model into memory...")
        self.model = load_model(str(MODEL_PATH))
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        print("[AI Engine] Model ready.")

    def analyze_frame(self, bgr_frame: np.ndarray) -> dict:
        """
        Input: ek OpenCV frame (numpy array, BGR format — WebSocket se
               aaye JPEG bytes ko already decode kar chuke honge).
        Output: ek plain dict jo JSON bana ke WebSocket se frontend ko
                bhej denge.
        """
        gray = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

        if len(faces) == 0:
            return {"face_found": False}

        # Sabse bada face lo (assume: user camera ke sabse paas wala face)
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

        roi = gray[y:y + h, x:x + w]
        roi = cv2.resize(roi, (48, 48))
        roi = roi.astype('float32') / 255.0
        roi = np.expand_dims(roi, axis=[0, -1])   # shape: (1, 48, 48, 1) — model ko yahi chahiye

        preds = self.model.predict(roi, verbose=0)[0]
        idx = int(np.argmax(preds))
        emotion = EMOTIONS[idx]
        confidence = float(preds[idx])

        engagement_score = self._engagement_score(preds)

        return {
            "face_found": True,
            "bbox": [int(x), int(y), int(w), int(h)],
            "emotion": emotion,
            "confidence": round(confidence, 3),
            "all_emotions": {EMOTIONS[i]: round(float(p), 3) for i, p in enumerate(preds)},
            "engagement_score": engagement_score,
        }

    def _engagement_score(self, preds: np.ndarray) -> float:
        """
        Simple weighted formula: har emotion ki probability ko uske
        stress-weight se multiply karo, sum nikalo, phir 0-100 scale
        pe invert karo (kam stress = zyada engagement).
        """
        stress = sum(preds[i] * STRESS_WEIGHT[EMOTIONS[i]] for i in range(len(EMOTIONS)))
        engagement = (1 - stress) * 100
        return round(float(engagement), 1)


# Module-level singleton — Django ek baar import karega, baar baar nahi
_detector_instance = None


def get_detector() -> "EmotionDetector":
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = EmotionDetector()
    return _detector_instance
