"""
URL configuration for aorbo_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, reverse_lazy
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic.base import RedirectView
from treks_app import auth_views

urlpatterns = [
    path('supersecretadmin/', admin.site.urls),
    path('accounts/', include([
        path('password_reset/', auth_views.api_password_reset, name='password_reset'),
        path('password_reset/done/', auth_views.api_password_reset_done, name='password_reset_done'),
        path('reset/<uidb64>/<token>/', auth_views.api_password_reset_confirm, name='password_reset_confirm'),
        path('reset/done/', auth_views.api_password_reset_complete, name='password_reset_complete'),
        path('lockout/', auth_views.api_lockout, name='lockout'),
        # Keep login/logout as Django's built-in views (they redirect to admin)
        path('login/', RedirectView.as_view(url=reverse_lazy('admin:login')), name='login'),
        path('logout/', RedirectView.as_view(url=reverse_lazy('admin:logout')), name='logout'),
    ])),
    path('', include('treks_app.urls')),
]

# Always serve static and media files, even when DEBUG is False
# This is needed for ngrok hosting
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
