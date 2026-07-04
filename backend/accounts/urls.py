from django.urls import path
from django.contrib.auth import views as auth_views
from .views import SignupView
from . import api

app_name = "accounts"

urlpatterns = [
    # ── Legacy template-based (old Django-templates frontend) ──────────
    path("login/", auth_views.LoginView.as_view(template_name="accounts/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(next_page="accounts:login"), name="logout"),
    path("signup/", SignupView.as_view(), name="signup"),

    # ── JSON API (React frontend) ───────────────────────────────────────
    path("api/csrf/", api.csrf, name="api_csrf"),
    path("api/me/", api.me, name="api_me"),
    path("api/signup/", api.api_signup, name="api_signup"),
    path("api/login/", api.api_login, name="api_login"),
    path("api/logout/", api.api_logout, name="api_logout"),
]
