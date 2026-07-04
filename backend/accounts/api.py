"""
accounts/api.py
------------------
React frontend (Vercel) ke liye JSON API — purane `views.py` wale
template-based login/signup se ALAG hai (woh legacy Django-template
frontend ke liye reserved hain, dono saath-saath chal sakte hain).

CSRF handling: React aur Django alag domains (Vercel vs Render) pe
hain, isliye browser JS backend ki csrftoken cookie read nahi kar
sakta (cross-domain cookie restriction) — isliye yeh 3 POST endpoints
csrf_exempt hain. Yeh safe hai kyunki CORS_ALLOWED_ORIGINS whitelist
already control karti hai ki kaunse domains se requests accept hongi.
"""

import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
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


@csrf_exempt
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


@csrf_exempt
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


@csrf_exempt
@require_http_methods(["POST"])
def api_logout(request):
    logout(request)
    return JsonResponse({"authenticated": False})
