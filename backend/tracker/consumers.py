"""
tracker/consumers.py
---------------------
🔄 PIVOT (post Human.js switch): Pehle yeh consumer har video FRAME
receive karta tha aur khud CNN chalata tha (heavy). Ab AI inference
poora BROWSER ke andar Human.js se hoti hai — yahan sirf ek chhota
JSON "summary" aata hai har ~2 second me (raw image kabhi nahi aata).

Fayda: (1) server pe TensorFlow/OpenCV load hi nahi hota — free-tier
RAM bachta hai, (2) bandwidth 50-100x kam lagti hai (image vs numbers),
(3) consumer ab sirf ek "recorder + broadcaster" hai, heavy compute
nahi karta — isliye ek hi free-tier instance sainkdo concurrent users
easily handle kar sakta hai.

Message contract (browser -> server), har ~2 sec me ek baar:
{
  "type": "summary",
  "window_seconds": 2,
  "emotion_counts": {"Happy": 8, "Neutral": 4},
  "avg_engagement": 78.4,
  "attentive_ratio": 0.9,        // is window ke frames me se kitne % attentive the
  "age": 24.5,                   // Human.js ka age estimate (nullable)
  "gender": "female",
  "liveness_score": 0.97,        // Human.js ke .real/.live ka average
  "distracted": false            // is poore window me continuous distraction thi kya
}
"""

import json

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

from .models import Session, EmotionLog
from reports.pdf_generator import generate_pdf_report


class EmotionTrackingConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.user = self.scope["user"]

        # Running stats — client se aaye summaries se update hote hain,
        # disconnect pe Session row finalize karne ke kaam aayenge
        self.engagement_sum = 0.0
        self.windows_counted = 0
        self.emotion_counts = {}
        self.attentive_weighted_sum = 0.0
        self.distraction_events = 0
        self.age_samples = []
        self.gender_counts = {}
        self.liveness_scores = []
        self.log_buffer = []
        self.BATCH_SIZE = 5   # 5 summaries (~10 sec) jama hone pe ek DB insert

        self.db_session = await self._create_session()

        await self.accept()
        await self.send(text_data=json.dumps({"type": "connected", "session_id": self.session_id}))

    async def disconnect(self, close_code):
        if self.log_buffer:
            await self._bulk_save_logs(self.log_buffer)
            self.log_buffer = []
        await self._finalize_session()

    async def receive(self, text_data=None, bytes_data=None):
        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            return

        if payload.get("type") != "summary":
            return   # koi aur message type abhi handle nahi karte

        self._update_running_stats(payload)
        self.log_buffer.append(payload)

        if len(self.log_buffer) >= self.BATCH_SIZE:
            await self._bulk_save_logs(self.log_buffer)
            self.log_buffer = []

        # Server yahan sirf ACK bhejta hai + agar zaroori ho to server-side
        # alert bhi bhej sakta hai (e.g. multi-device sync ke liye) — abhi
        # simple rakha hai, client already apna alert khud dikha chuka hoga
        if payload.get("distracted"):
            self.distraction_events += 1
            await self.send(text_data=json.dumps({
                "type": "alert",
                "reason": "distraction",
                "message": "Continuous distraction detected for this window.",
            }))

        await self.send(text_data=json.dumps({"type": "ack", "received_at": timezone.now().isoformat()}))

    # ── In-memory aggregation (no DB hit per message) ───────────────────

    def _update_running_stats(self, payload: dict):
        self.windows_counted += 1
        self.engagement_sum += payload.get("avg_engagement", 0)
        self.attentive_weighted_sum += payload.get("attentive_ratio", 1.0)

        for emo, count in payload.get("emotion_counts", {}).items():
            self.emotion_counts[emo] = self.emotion_counts.get(emo, 0) + count

        if payload.get("age") is not None:
            self.age_samples.append(payload["age"])
        if payload.get("gender"):
            g = payload["gender"]
            self.gender_counts[g] = self.gender_counts.get(g, 0) + 1
        if payload.get("liveness_score") is not None:
            self.liveness_scores.append(payload["liveness_score"])

    # ── DB helpers (sync ORM wrapped for async consumer) ────────────────

    @database_sync_to_async
    def _create_session(self):
        user = self.user if self.user and not self.user.is_anonymous else None
        if user is None:
            return None
        return Session.objects.create(user=user)

    @database_sync_to_async
    def _bulk_save_logs(self, buffered_payloads):
        if not self.db_session:
            return
        objs = []
        for p in buffered_payloads:
            # Har window ke liye ek representative log row — dominant emotion
            # us window ke emotion_counts se nikalte hain
            counts = p.get("emotion_counts", {})
            dominant = max(counts, key=counts.get) if counts else "Neutral"
            objs.append(EmotionLog(
                session=self.db_session,
                emotion=dominant,
                confidence=1.0,
                engagement_score=p.get("avg_engagement", 0),
                attentive=p.get("attentive_ratio", 1.0) >= 0.5,
                yaw=None,
                pitch=None,
                is_live=p.get("liveness_score", 1.0) >= 0.5,
            ))
        EmotionLog.objects.bulk_create(objs)

    @database_sync_to_async
    def _finalize_session(self):
        if not self.db_session:
            return
        s = self.db_session
        s.ended_at = timezone.now()
        s.total_frames_analyzed = self.windows_counted
        if self.windows_counted:
            s.avg_engagement_score = round(self.engagement_sum / self.windows_counted, 1)
            s.dominant_emotion = max(self.emotion_counts, key=self.emotion_counts.get) if self.emotion_counts else ""
            s.focus_time_seconds = int(
                (self.attentive_weighted_sum / self.windows_counted) *
                (timezone.now() - s.started_at).total_seconds()
            )
        if self.age_samples:
            s.avg_age = round(sum(self.age_samples) / len(self.age_samples), 1)
        if self.gender_counts:
            s.dominant_gender = max(self.gender_counts, key=self.gender_counts.get)
        if self.liveness_scores:
            pass_count = sum(1 for v in self.liveness_scores if v >= 0.5)
            s.liveness_pass_rate = round((pass_count / len(self.liveness_scores)) * 100, 1)

        s.distraction_count = self.distraction_events
        s.save()

        if self.windows_counted > 0:
            pdf_file = generate_pdf_report(s, self.emotion_counts)
            s.report_pdf.save(f"session_{s.id}_report.pdf", pdf_file, save=True)
