from django.contrib import admin
from .models import Session, EmotionLog


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "started_at", "avg_engagement_score", "dominant_emotion", "distraction_count")
    list_filter = ("dominant_emotion",)
    search_fields = ("user__username",)


@admin.register(EmotionLog)
class EmotionLogAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "timestamp", "emotion", "engagement_score", "attentive", "is_live")
    list_filter = ("emotion", "attentive", "is_live")
