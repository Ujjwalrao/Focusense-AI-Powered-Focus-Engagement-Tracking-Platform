from django.urls import path
from . import views, api

app_name = "tracker"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("history/", views.session_history, name="history"),
    path("report/<int:session_id>/download/", views.download_report, name="download_report"),
    path("api/history/", api.api_history, name="api_history"),
]
