"""
core/asgi.py
------------
Soch: yeh ek "traffic police chowk" hai jahan har incoming connection
aata hai. Police (ProtocolTypeRouter) dekhti hai — yeh normal HTTP
request hai (page load) ya WebSocket hai (live video stream)? Uske
hisaab se sahi rasta (handler) bhej deti hai.
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()  # apps load hone se pehle zaroori hai, warna model import errors aayenge

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

import tracker.routing

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    # Normal page loads (dashboard, login, PDF download) -> regular Django
    "http": django_asgi_app,

    # Live video frame streaming -> WebSocket consumer
    "websocket": AllowedHostsOriginValidator(   # security: sirf apne domain se socket allow
        AuthMiddlewareStack(                     # request.user available consumer me
            URLRouter(
                tracker.routing.websocket_urlpatterns
            )
        )
    ),
})
