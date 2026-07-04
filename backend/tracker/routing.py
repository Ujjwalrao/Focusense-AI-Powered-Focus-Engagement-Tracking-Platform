"""
tracker/routing.py
-------------------
WebSocket ke liye "urls.py" jaisa hi hota hai — bas normal HTTP URL
patterns ki jagah socket paths define hote hain.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # ws://yourdomain.com/ws/session/<session_id>/
    re_path(r"ws/session/(?P<session_id>\w+)/$", consumers.EmotionTrackingConsumer.as_asgi()),
]
