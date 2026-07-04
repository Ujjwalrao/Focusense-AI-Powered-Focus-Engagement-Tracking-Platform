"""
accounts/api.py
------------------
React frontend (Vercel) ke liye JSON API — purane `views.py` wale
template-based login/signup se ALAG hai (woh legacy Django-template
frontend ke liye reserved hain, dono saath-saath chal sakte hain).

CSRF handling: Django ka CSRF protection POST requests pe cookie +
header dono match karwata hai. React pehle GET /api/auth/csrf/ call
karke cookie le leta hai, phir uska value 'X-CSRFToken' header me
bhejta hai — yeh Django ka standard AJAX CSRF pattern hai.
"""

import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods


@ensure_csrf_cookie
@require_http_methods(["GET"])
def csrf(request):
    """React app load hote hi isse call karega — response me kuch nahi
    hota, bas ek 'csrftoken' cookie set ho jaati hai jo agle POST me chahiye."""
    return JsonResponse({"csrfToken": get_token(request)})


@require_http_methods(["GET"])
def me(request):
    """Current login state check karne ke liye — React load pe isse
    poochta hai 'kya main already logged in hoon?'"""
    if request.user.is_authenticated:
        return JsonResponse({"authenticated": True, "username": request.user.username})
    return JsonResponse({"authenticated": False})


@require_http_methods(["POST"])
def api_signup(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return JsonResponse({"error": "Username and password required"}, status=400)
    if len(password) < 8:
        return JsonResponse({"error": "Password must be at least 8 characters"}, status=400)
    if User.objects.filter(username=username).exists():
        return JsonResponse({"error": "Username already taken"}, status=409)

    user = User.objects.create_user(username=username, password=password)
    login(request, user)   # signup ke turant baad auto-login — better UX
    return JsonResponse({"authenticated": True, "username": user.username}, status=201)


@require_http_methods(["POST"])
def api_login(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    user = authenticate(request, username=data.get("username"), password=data.get("password"))
    if user is None:
        return JsonResponse({"error": "Invalid username or password"}, status=401)

    login(request, user)
    return JsonResponse({"authenticated": True, "username": user.username})


@require_http_methods(["POST"])
def api_logout(request):
    logout(request)
    return JsonResponse({"authenticated": False})
