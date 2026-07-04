"""
accounts/views.py
-------------------
Login ke liye Django ka built-in LoginView use karenge (urls.py me) —
wheel reinvent karne ki zaroorat nahi, woh already secure + battle-tested
hai. Sirf Signup custom likhna padta hai kyunki Django koi default
signup view nahi deta.
"""

from django.contrib.auth.forms import UserCreationForm
from django.urls import reverse_lazy
from django.views.generic import CreateView


class SignupView(CreateView):
    form_class = UserCreationForm
    template_name = "accounts/signup.html"
    success_url = reverse_lazy("accounts:login")
