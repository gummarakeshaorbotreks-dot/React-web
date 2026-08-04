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
    # Search
    # path('search/', views.search_trek, name='search_trek'),
    # path('search-suggestions/', views.search_suggestions, name='search_suggestions'),

    # Travel Your Way
    # path('travel-your-way/', views.travel_your_way, name='travel_your_way'),

    # ✅ Contact endpoints (React frontend posts to /api/contact-submit/)
    path('contact/', views.contact, name='contact'),
    path('api/contact-submit/', views.contact, name='contact_submit'),

    # React protected admin helpers
    path('api/admin/whoami/', views.api_admin_whoami, name='api_admin_whoami'),

    # Staff-only JSON endpoints for the React Admin Dashboard.
    # Return JSON 403 (not Django's HTML login redirect) when unauthenticated.
    path('api/admin/visitor-stats/', views.admin_visitor_stats_json, name='admin_visitor_stats_json'),
    path('api/admin/search-analytics/', views.admin_search_analytics_json, name='admin_search_analytics_json'),
    path('api/admin/contact-submissions/', views.admin_contact_submissions_json, name='admin_contact_submissions_json'),
]
