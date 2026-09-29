from django.urls import path

from . import views

app_name = "access_control"

urlpatterns = [
    path("login/", views.staff_login, name="staff_login"),
    path("mfa/verify/", views.mfa_verify, name="mfa_verify"),
    path("mfa/setup-confirm/", views.mfa_setup_confirm, name="mfa_setup_confirm"),
]
