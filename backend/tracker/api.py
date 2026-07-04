"""
tracker/api.py
----------------
React frontend ke liye session-history JSON — PDF download abhi bhi
seedha `tracker/views.py::download_report` URL pe link karke hoga
(browser navigation cookies apne aap bhej deta hai, cross-domain fetch
jaisa CORS dance yahan zaroori nahi).
"""

from django.http import JsonResponse


def api_history(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Login required"}, status=401)

    sessions = request.user.sessions.all()[:50]
    data = [
        {
            "id": s.id,
            "started_at": s.started_at.isoformat(),
            "duration": s.duration_display(),
            "avg_engagement_score": s.avg_engagement_score,
            "dominant_emotion": s.dominant_emotion,
            "distraction_count": s.distraction_count,
            "avg_age": s.avg_age,
            "dominant_gender": s.dominant_gender,
            "liveness_pass_rate": s.liveness_pass_rate,
            "has_report": bool(s.total_frames_analyzed),
        }
        for s in sessions
    ]
    return JsonResponse({"sessions": data})
