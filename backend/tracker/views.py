"""
tracker/views.py
------------------
Yeh sirf REGULAR page loads handle karta hai (dashboard dikhana, session
history list, PDF download link). Actual real-time video/AI logic
consumers.py me hai — views.py aur consumers.py ka kaam bilkul alag hai,
inhe mix mat karna.
"""

import uuid
from collections import Counter

from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from django.http import FileResponse, Http404

from .models import Session
from reports.pdf_generator import generate_pdf_report


@login_required
def dashboard(request):
    """
    Dashboard page load hote hi ek NAYA session_id generate hota hai
    (uuid4 — random aur unique). Yeh id template me JS ko pass hoga,
    jo WebSocket connect karte waqt use karega:
        ws://.../ws/session/<is_id>/
    """
    session_id = uuid.uuid4().hex[:12]
    recent_sessions = request.user.sessions.all()[:5]   # sidebar/history ke liye

    return render(request, "tracker/dashboard.html", {
        "session_id": session_id,
        "recent_sessions": recent_sessions,
        "emotions": ["Happy", "Neutral", "Sad", "Angry", "Fear", "Surprise", "Disgust"],
    })


@login_required
def session_history(request):
    sessions = request.user.sessions.all()
    return render(request, "tracker/history.html", {"sessions": sessions})


@login_required
def download_report(request, session_id):
    """
    Free-tier disk (Render/Railway) restart pe wipe ho jaata hai — agar
    stored PDF gayab mil jaaye, hum ise EmotionLog data se dobara
    generate kar dete hain instead of user ko 404 dikhane ke. Regeneration
    fast hai (~50ms), isliye yeh ek acceptable fallback hai — koi extra
    paid storage lagane ki zaroorat nahi.
    """
    session = get_object_or_404(Session, id=session_id, user=request.user)

    file_missing = not session.report_pdf or not session.report_pdf.storage.exists(session.report_pdf.name)
    if file_missing:
        emotion_counts = dict(Counter(session.logs.values_list("emotion", flat=True)))
        if not emotion_counts:
            raise Http404("Report ke liye data nahi mila — session me koi face detect nahi hua tha.")
        pdf_file = generate_pdf_report(session, emotion_counts)
        session.report_pdf.save(f"session_{session.id}_report.pdf", pdf_file, save=True)

    return FileResponse(session.report_pdf.open("rb"), as_attachment=True,
                         filename=f"focusense-report-{session.id}.pdf")
