"""
tracker/ai_engine/attention.py
-------------------------------
⚠️ STATUS: LEGACY / OPTIONAL — same reason as detector.py. Head-pose aur
liveness ab browser me Human.js se aate hain (rotation.angle, .live, .real
fields). Yeh file reference/fallback ke liye rakhi hai.
"""

import cv2
import mediapipe as mp
import numpy as np

mp_face_mesh = mp.solutions.face_mesh

# 3D model points of a generic face (approx, in mm) — head pose ke
# liye standard reference points, OpenCV ke solvePnP algorithm ke saath
# use hote hain 2D landmarks ko 3D rotation me convert karne ke liye.
MODEL_POINTS_3D = np.array([
    (0.0, 0.0, 0.0),          # Nose tip
    (0.0, -330.0, -65.0),     # Chin
    (-225.0, 170.0, -135.0),  # Left eye left corner
    (225.0, 170.0, -135.0),   # Right eye right corner
    (-150.0, -150.0, -125.0), # Left mouth corner
    (150.0, -150.0, -125.0),  # Right mouth corner
], dtype=np.float64)

# MediaPipe 468-point mesh me inhi 6 points ke landmark index
LANDMARK_IDS = [1, 199, 33, 263, 61, 291]


class AttentionTracker:
    def __init__(self):
        self.face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=False,       # False = video stream mode (faster, tracks between frames)
            max_num_faces=1,
            refine_landmarks=False,        # True hota to zyada accurate but slower — hume speed chahiye
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    def analyze(self, bgr_frame: np.ndarray) -> dict:
        h, w = bgr_frame.shape[:2]
        rgb = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)   # mediapipe RGB expect karta hai
        result = self.face_mesh.process(rgb)

        if not result.multi_face_landmarks:
            return {"attentive": False, "reason": "no_face"}

        landmarks = result.multi_face_landmarks[0].landmark
        image_points = np.array([
            (landmarks[i].x * w, landmarks[i].y * h) for i in LANDMARK_IDS
        ], dtype=np.float64)

        # Camera intrinsics ka approximation (calibration nahi kar rahe,
        # standard focal-length assumption kaafi hai attention ke liye)
        focal_length = w
        camera_matrix = np.array([
            [focal_length, 0, w / 2],
            [0, focal_length, h / 2],
            [0, 0, 1],
        ], dtype=np.float64)

        success, rotation_vec, _ = cv2.solvePnP(
            MODEL_POINTS_3D, image_points, camera_matrix,
            np.zeros((4, 1)),   # lens distortion = 0 assume (koi calibration nahi)
        )
        if not success:
            return {"attentive": False, "reason": "pose_failed"}

        rotation_mat, _ = cv2.Rodrigues(rotation_vec)
        yaw, pitch, roll = self._rotation_to_angles(rotation_mat)

        # Threshold: 25 degree se zyada idhar-udhar dekha to "distracted"
        attentive = abs(yaw) < 25 and abs(pitch) < 20

        return {
            "attentive": bool(attentive),
            "yaw": round(float(yaw), 1),
            "pitch": round(float(pitch), 1),
            "roll": round(float(roll), 1),
        }

    @staticmethod
    def _rotation_to_angles(R: np.ndarray):
        sy = np.sqrt(R[0, 0] ** 2 + R[1, 0] ** 2)
        singular = sy < 1e-6
        if not singular:
            x = np.arctan2(R[2, 1], R[2, 2])
            y = np.arctan2(-R[2, 0], sy)
            z = np.arctan2(R[1, 0], R[0, 0])
        else:
            x = np.arctan2(-R[1, 2], R[1, 1])
            y = np.arctan2(-R[2, 0], sy)
            z = 0
        return np.degrees(y), np.degrees(x), np.degrees(z)   # yaw, pitch, roll


def simple_liveness_check(frame_history: list) -> dict:
    """
    Bahut lightweight anti-spoofing (free/CPU-friendly): agar last N
    frames me face ka pixel-variance near-zero hai (matlab bilkul
    static image), to woh printed photo/screenshot ho sakta hai —
    real chehra hamesha micro-movements (blink, breathing) dikhata hai.

    Production-grade liveness (texture/depth based) baad me MediaPipe
    Face Landmarker ke blendshapes se aur accurate banega — abhi ke
    liye yeh free, fast baseline hai.
    """
    if len(frame_history) < 5:
        return {"live": True, "confidence": "insufficient_data"}

    variances = [np.var(f) for f in frame_history[-5:]]
    movement = np.std(variances)

    return {"live": movement > 0.5, "movement_score": round(float(movement), 3)}
