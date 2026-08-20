# treks_app/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # Main pages
    

    # 🚀 ADD THE TWO ENDPOINTS FOR YOUR REACT HOME PAGE HERE:
    path('api/treks/', views.api_featured_treks, name='api_featured_treks'),
    path('api/treks/search/', views.api_search_suggestions, name='api_search_suggestions'),
    path('api/treks/log-click/', views.api_log_trek_click, name='api_log_trek_click'),
    path('api/treks/create-from-osm/', views.api_create_trek_from_osm, name='api_create_trek_from_osm'),
path('api/analytics/', views.api_analytics, name='api_analytics'),
path('api/treks/<str:slug>/', views.api_trek_detail, name='api_trek_detail'),
path('api/travel-your-way/', views.api_travel_your_way, name='api_travel_your_way'),
path('api/blogs/', views.api_blogs_list, name='api_blogs_list'),
path('api/blogs/<slug:slug>/', views.api_blog_detail, name='api_blog_detail'),
path('api/contact-info/', views.api_contact_info, name='api_contact_info'),
path('api/social-media/', views.api_social_media, name='api_social_media'),

    # AI Enrichment Endpoint
    path('api/enrich-destination/', views.api_enrich_destination, name='api_enrich_destination'),
    # ✅ PHASE 4: Nearby Destinations Discovery
    path('api/nearby-destinations/', views.api_nearby_destinations, name='api_nearby_destinations'),
    # ✅ SEARCH REFINEMENT: Backend OSM Filtering
    path('api/search/osm-filter/', views.filter_osm_results, name='filter_osm_results'),
    # ✅ FINAL FIX: Intelligent search with multi-query attempts
    path('api/search/intelligent/', views.api_search_intelligent, name='api_search_intelligent'),
    # ✅ Contact (ONLY ONE)
    path('contact/', views.contact, name='contact'),
    path('api/contact-submit/', views.contact, name='api_contact_submit'),
    # ✅ Content Sections
    path('api/content-sections/<str:page>/', views.api_content_sections, name='api_content_sections'),
    path('api/safety-tips/', views.api_safety_tips, name='api_safety_tips'),
]