"""
tracker/models.py
------------------
Do models chahiye: ek "Session" (jab user ne tracking start->stop kiya,
uska ek record) aur "EmotionLog" (us session ke andar har analyzed
frame ka result — isi se baad me PDF report aur graphs banenge).

Analogy: Session = ek exam ka "attempt", EmotionLog = us attempt ke
har question ka answer. Session ke paas summary hoti hai, EmotionLog
ke paas raw detail.
"""

from django.db import models
from django.contrib.auth.models import User


class Session(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    # Summary fields — session end pe consumer.disconnect() inhe fill karega
    avg_engagement_score = models.FloatField(default=0.0)
    dominant_emotion = models.CharField(max_length=20, blank=True)
    focus_time_seconds = models.IntegerField(default=0)      # attentive=True wala total time
    distraction_count = models.IntegerField(default=0)       # kitni baar "distracted" hua
    total_frames_analyzed = models.IntegerField(default=0)

    report_pdf = models.FileField(upload_to="reports/", null=True, blank=True)

    # ── Naye fields (Human.js client-side pipeline se aate hain) ─────────
    avg_age = models.FloatField(null=True, blank=True)
    dominant_gender = models.CharField(max_length=10, blank=True)
    liveness_pass_rate = models.FloatField(default=100.0)  # % windows jinme real face detect hua (anti-spoof)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.user.username} — {self.started_at:%d %b %Y %H:%M}"

    def duration_display(self):
        if not self.ended_at:
            return "In progress"
        secs = int((self.ended_at - self.started_at).total_seconds())
        return f"{secs // 60}m {secs % 60}s"


class EmotionLog(models.Model):
    """Ek row = ek analyzed frame ka snapshot. Bulk insert hoga, isliye
    lightweight rakha hai — heavy JSON nahi, sirf zaroori numbers."""

    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="logs")
    timestamp = models.DateTimeField(auto_now_add=True)

    emotion = models.CharField(max_length=20)
    confidence = models.FloatField()
    engagement_score = models.FloatField()

    attentive = models.BooleanField(default=True)
    yaw = models.FloatField(null=True, blank=True)
    pitch = models.FloatField(null=True, blank=True)

    is_live = models.BooleanField(default=True)   # liveness check result

    class Meta:
        ordering = ["timestamp"]
        indexes = [models.Index(fields=["session", "timestamp"])]
