"""
reports/pdf_generator.py
--------------------------
Session khatam hote hi ek professional-looking PDF banta hai — jaisa
koi analytics tool (Notion, Google Analytics) "download report" deta
hai. 100% free library (ReportLab) — koi paid PDF API nahi.

Analogy: Session model me sirf NUMBERS store hain (avg score, dominant
emotion). Yeh file un numbers ko ek "readable story" me convert karti
hai — cover page + summary cards + bar chart + closing note.
"""

import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from django.core.files.base import ContentFile

# ── Brand colors — same palette family as the dashboard (hex converted) ──
TEAL = colors.HexColor("#0F9C8D")     # PDF pe pure neon teal readable nahi hota, thoda darker use kiya
NAVY = colors.HexColor("#0B1120")
GREY = colors.HexColor("#55627A")
ROSE = colors.HexColor("#E24E6B")


def generate_pdf_report(session, emotion_counts: dict) -> ContentFile:
    """
    Input:
      session         -> tracker.models.Session instance (already saved,
                          summary fields filled)
      emotion_counts  -> dict jaisa {"Happy": 120, "Neutral": 80, ...}
                          (consumers.py ke self.emotion_counts se aata hai)

    Output: Django ContentFile — seedha session.report_pdf.save() me
            pass kar sakte ho.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=22 * mm, bottomMargin=18 * mm, leftMargin=20 * mm, rightMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleBig", parent=styles["Title"], textColor=NAVY, fontSize=24, spaceAfter=2)
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], textColor=GREY, fontSize=11, spaceAfter=18)
    section_style = ParagraphStyle("Section", parent=styles["Heading2"], textColor=NAVY, spaceBefore=16, spaceAfter=8)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], textColor=colors.HexColor("#334155"), fontSize=10.5, leading=15)

    story = []

    # ── Header ──────────────────────────────────────────────────────────
    story.append(Paragraph("Focusense", title_style))
    story.append(Paragraph("Session Engagement Report", subtitle_style))
    story.append(HRFlowable(width="100%", color=colors.HexColor("#E2E8F0"), thickness=1))
    story.append(Spacer(1, 14))

    # ── Summary table (the "stat cards" from the dashboard, PDF version) ─
    duration = session.duration_display()
    summary_data = [
        ["User", session.user.username, "Date", session.started_at.strftime("%d %b %Y, %H:%M")],
        ["Duration", duration, "Frames Analyzed", str(session.total_frames_analyzed)],
        ["Avg Engagement", f"{session.avg_engagement_score}%", "Dominant Emotion", session.dominant_emotion or "—"],
        ["Focus Time", f"{session.focus_time_seconds}s", "Distraction Events", str(session.distraction_count)],
        ["Estimated Age", f"{session.avg_age}" if session.avg_age else "—",
         "Liveness Pass Rate", f"{session.liveness_pass_rate}%"],
    ]
    summary_table = Table(summary_data, colWidths=[85, 95, 100, 95])
    summary_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (0, -1), GREY),
        ("TEXTCOLOR", (2, 0), (2, -1), GREY),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
        ("FONTNAME", (3, 0), (3, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#EEF2F7")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
    ]))
    story.append(summary_table)

    # ── Emotion distribution bar chart ───────────────────────────────────
    story.append(Paragraph("Emotion Distribution", section_style))
    if emotion_counts:
        story.append(_build_bar_chart(emotion_counts))
    else:
        story.append(Paragraph("No face detected during this session.", body_style))

    # ── Attention insight ────────────────────────────────────────────────
    story.append(Paragraph("Attention Insight", section_style))
    focus_pct = _safe_focus_pct(session)
    insight = _generate_insight_text(session, focus_pct)
    story.append(Paragraph(insight, body_style))

    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", color=colors.HexColor("#E2E8F0"), thickness=1))
    story.append(Paragraph(
        "Generated automatically by Focusense — an open-source engagement tracking platform.",
        ParagraphStyle("Footer", parent=styles["Normal"], textColor=GREY, fontSize=8, spaceBefore=8),
    ))

    doc.build(story)
    buffer.seek(0)
    return ContentFile(buffer.read())


def _build_bar_chart(emotion_counts: dict) -> Drawing:
    """ReportLab ka apna charting engine — matplotlib jaisi heavy dependency
    nahi chahiye, isse free-tier server pe install/RAM footprint kam rehta hai."""
    labels = list(emotion_counts.keys())
    values = list(emotion_counts.values())

    drawing = Drawing(460, 180)
    chart = VerticalBarChart()
    chart.x, chart.y = 30, 20
    chart.width, chart.height = 400, 140
    chart.data = [values]
    chart.categoryAxis.categoryNames = labels
    chart.categoryAxis.labels.fontSize = 8
    chart.valueAxis.valueMin = 0
    chart.bars[0].fillColor = TEAL
    chart.barWidth = 14
    drawing.add(chart)
    return drawing


def _safe_focus_pct(session) -> float:
    if not session.total_frames_analyzed:
        return 0.0
    total_secs = (session.ended_at - session.started_at).total_seconds() or 1
    return round((session.focus_time_seconds / total_secs) * 100, 1)


def _generate_insight_text(session, focus_pct: float) -> str:
    """Numbers ko ek human-readable line me convert karta hai — rule-based
    hai (no AI API call chahiye, free rehta hai)."""
    if focus_pct >= 80:
        verdict = "Excellent focus throughout the session"
    elif focus_pct >= 55:
        verdict = "Reasonably good focus, with some distraction"
    else:
        verdict = "Attention dropped frequently during this session"

    return (
        f"{verdict}. You stayed attentive for approximately {focus_pct}% of the "
        f"session, with {session.distraction_count} distinct distraction event(s) "
        f"detected. Your dominant emotional state was <b>{session.dominant_emotion or 'N/A'}</b>, "
        f"with an average engagement score of <b>{session.avg_engagement_score}/100</b>."
    )
