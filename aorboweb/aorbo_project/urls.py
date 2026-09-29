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
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

def home(request):
    return JsonResponse({
        "message": "Aorbo backend is running successfully",
        "status": "ok"
    })

urlpatterns = [
    path('', home, name='home'),
    # access_control's login/MFA views must be matched before admin.site.urls
    # (which also defines 'supersecretadmin/login/') so the two-step
    # password -> MFA flow replaces Django's default single-step admin login.
    path('supersecretadmin/', include('access_control.urls')),
    path('supersecretadmin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),
    path('', include('treks_app.urls')),
]

# Always serve static and media files, even when DEBUG is False
# This is needed for ngrok hosting
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
