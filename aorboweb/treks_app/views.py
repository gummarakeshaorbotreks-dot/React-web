from rest_framework.decorators import api_view, throttle_classes
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator
from django.urls import reverse
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.db.models import Q, Case, When, IntegerField
from django.conf import settings
from django.core.cache import cache
from django.contrib.admin.views.decorators import staff_member_required
from .utils import extract_state_from_display_name
from django.utils import timezone as dj_timezone
from datetime import datetime, timezone, timedelta
import json

import difflib
import threading
import logging

logger = logging.getLogger(__name__)

from .models import (
    Contact, Blog,  
    Testimonial, FAQ, SafetyTip, TeamMember,
    HomepageBanner, TrekList, SearchLog, OsmDraftTrek, ContactInfo, SocialMedia, ContentSection
)

def send_email_async(mail):
    threading.Thread(target=mail.send).start()




STOP_WORDS = {"best", "top", "places", "place", "near", "visit", "to", "trip", "trips", "treks", "trek"}

def normalize_text(text):
    return text.lower().strip()

def clean_query(query):
    return " ".join(w for w in normalize_text(query).split() if w not in STOP_WORDS)


def detect_trek_category(message: str):
    message = message.lower()

    if any(word in message for word in ["adventure", "hills", "mountain", "climb"]):
        return "adventure"
    if any(word in message for word in ["camp", "camping", "tent", "bonfire"]):
        return "camping"
    if any(word in message for word in ["nature", "green", "greenery", "forest", "waterfall"]):
        return "nature"
    if any(word in message for word in ["beach", "sea", "coast"]):
        return "beach"
    if any(word in message for word in ["spiritual", "temple", "holy", "pilgrimage"]):
        return "spiritual"
    if any(word in message for word in ["weekend", "short trip", "getaway"]):
        return "weekend"
    return None
@api_view(['GET'])
def api_safety_tips(request):
    safety_tips = SafetyTip.objects.all().order_by('order')

    results = []

    for tip in safety_tips:
        results.append({
            "id": tip.id,
            "section_title": tip.section_title,
            "title": tip.title,
            "content": tip.content,
            "icon": tip.icon.url if tip.icon else None,
            "order": tip.order,
        })

    return Response(results)

@csrf_exempt  # ← React sends JSON, no CSRF cookie needed for this public endpoint
def contact(request):

    if request.method == "GET":
        return JsonResponse({"message": "This endpoint accepts POST requests only."}, status=405)


    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    name = data.get("name")
    email = data.get("email")
    mobile = data.get("mobile")
    user_type = data.get("user_type")
    message = data.get("comment")
    trek_category = data.get("trek_category")

    if not all([name, email, mobile, user_type, message]):
        return JsonResponse({"error": "Please fill all required fields"}, status=400)

    # Save to Django DB
    contact_obj = Contact.objects.create(
        name=name, email=email, mobile=mobile,
        user_type=user_type,
        trek_category=trek_category or None,
        comment=message
    )

    # Sync to Supabase
    try:
        from .supabase_client import supabase
        supabase.table('contact_submissions').insert({
            'name': contact_obj.name,
            'email': contact_obj.email,
            'mobile': contact_obj.mobile,
            'user_type': contact_obj.user_type,
            'trek_category': contact_obj.trek_category,
            'comment': contact_obj.comment,
            'submitted_at': contact_obj.created_at.isoformat(),
        }).execute()
    except Exception as e:
        print(f"Supabase sync failed: {e}")

    TREK_LINKS = {
        "adventure": "https://www.aorbotreks.com/travel-your-way/?tag=adventure",
        "camping": "https://www.aorbotreks.com/travel-your-way/?tag=camping",
        "nature": "https://www.aorbotreks.com/travel-your-way/?tag=nature",
        "beach": "https://www.aorbotreks.com/travel-your-way/?tag=beach",
        "spiritual": "https://www.aorbotreks.com/travel-your-way/?tag=spiritual",
        "weekend": "https://www.aorbotreks.com/travel-your-way/?tag=weekend",
    }

    detected_category = None
    explore_link = "https://www.aorbotreks.com"
    subject = "We've Received Your Query – Aorbo Treks"
    template_name = "emails/contact_default.html"

    if user_type == "trekker":
        if trek_category:
            detected_category = trek_category
        else:
            detected_category = detect_trek_category(message)
        
        explore_link = TREK_LINKS.get(detected_category, "https://www.aorbotreks.com/treks")
        subject = f"{detected_category.title() if detected_category else 'Explore'} Treks – Aorbo Treks"
        template_name = "emails/trekker.html"

    elif user_type == "organizer":
        explore_link = "https://partner.aorbotreks.com"
        subject = "Partnership Request – Aorbo Treks"
        template_name = "emails/organizer.html"

    else:
        explore_link = "https://www.aorbotreks.com"
        subject = "We've Received Your Query – Aorbo Treks"
        template_name = "emails/other.html"

    display_category = detected_category.title() if detected_category else "Our Featured"

    context = {
        "name": name,
        "email": email,
        "message": message,
        "detected_category": detected_category,
        "display_category": display_category,
        "explore_link": explore_link,
        "current_year": datetime.now().year,
    }

    html_content = render_to_string(template_name, context)

    try:
        mail = EmailMultiAlternatives(
            subject=subject,
            body="Thank you for contacting Aorbo Treks.",
            from_email="Aorbo Treks <" + settings.DEFAULT_FROM_EMAIL + ">",
            to=[email],
        )
        mail.attach_alternative(html_content, "text/html")
        send_email_async(mail)
    except Exception as e:
        return JsonResponse({"error": f"Failed to send email: {str(e)}"}, status=500)

    return JsonResponse({"message": "Message sent successfully"})


@api_view(["GET"])
def api_content_sections(request, page):
    sections = (
        ContentSection.objects
        .filter(page=page, is_active=True)
        .order_by("order")
    )

    data = []

    for section in sections:
        data.append({
            "id": section.id,
            "page": section.page,
            "heading": section.heading,
            "sub_heading": section.sub_heading,
            "content": section.content,
            "order": section.order,
        })

    return Response(data)

@api_view(['GET'])
def api_featured_treks(request):
    selected_tag = request.GET.get('tag', '').strip()
    search_query = request.GET.get('q', '').strip()
    page_number = request.GET.get('page', 1)

    # ✅ Log search
    if str(page_number) == '1' and (selected_tag or search_query):
        SearchLog.objects.create(
            query=search_query,
            tag=selected_tag,
            ip_address=request.META.get('REMOTE_ADDR')
        )

    cache_key = f"api_home_page_{page_number}_{selected_tag}_{search_query}"
    cached_response = cache.get(cache_key)
    if cached_response:
        return Response(cached_response)

    # ✅ Build fresh queryset with images prefetched
    queryset = (
        TrekList.objects
        .prefetch_related('images', 'tags')
        .annotate(
            pin_order=Case(
                When(is_pinned=True, then=0),
                default=1,
                output_field=IntegerField()
            )
        )
        .order_by('pin_order', 'pin_priority', '-created_at')
    )

    if selected_tag:
        queryset = queryset.filter(tags__name__iexact=selected_tag).distinct()

    if search_query:
        cleaned = clean_query(search_query)
        if cleaned:
            queryset = queryset.filter(
                Q(name__icontains=cleaned) |
                Q(state__icontains=cleaned) |
                Q(tags__name__icontains=cleaned)
            ).distinct()

    paginator = Paginator(queryset, 8)  # 8 items per page
    page_obj = paginator.get_page(page_number)

    results = []
    for item in page_obj:
        # ✅ Clean simple image logic
        img_url = ""

        if hasattr(item, 'images') and item.images.exists():
            first_image = item.images.first()
            if hasattr(first_image, 'image_url') and first_image.image_url:
                img_url = str(first_image.image_url)
        elif hasattr(item, 'main_image') and item.main_image:
            img_url = item.main_image.url
        elif item.image:   # ← ADD THIS — falls back to the plain image field (used by OSM-published treks)
            img_url = str(item.image)
        operators_list = []
        if hasattr(item, 'operators_list') and item.operators_list:
            operators_list = [
                op.strip()
                for op in item.operators_list.split(',')
                if op.strip()
            ]
        else:
            operators_list = ["Aorbo Certified Partner"]

        results.append({
            "id": item.id,
            "slug": item.slug if hasattr(item, 'slug') and item.slug else str(item.id),
            "name": item.name,
            "state": item.state,
            "price_start": item.price_start if item.price_start else "N/A",
            "duration_days": item.duration_days if item.duration_days else "3D/2N",
            "operating_days": item.operating_days if item.operating_days else "THU, FRI, SAT",
            "images": [{"image_url": img_url}] if img_url else [],
            "operators": operators_list,
            "latitude": item.latitude,
            "longitude": item.longitude,
        })

    response_data = {
        "results": results,
        "total_pages": paginator.num_pages,
    }
    cache.set(cache_key, response_data, 60 * 10)
    return Response(response_data)

@api_view(['GET'])
def api_trek_detail(request, slug):
    try:
        trek_item = TrekList.objects.prefetch_related(
            'operators', 'trek_points', 'images', 'related_treks'
        ).get(id=slug)
    except TrekList.DoesNotExist:
        return Response({"error": "Trek not found"}, status=404)

    operators_list = list(trek_item.operators.values_list('name', flat=True))
    if not operators_list:
        operators_list = ["Aorbo Certified Partner"]

    places_list = list(trek_item.trek_points.values_list('name', flat=True))
    activities_list = [a.strip() for a in trek_item.activities.split(",")] if trek_item.activities else []

    related_treks = []
    for rel in trek_item.related_treks.all():
        related_treks.append({
            "id": rel.id,
            "slug": rel.id,
            "name": rel.name,
            "state": rel.state
        })

    img_url = ""
    if trek_item.images.exists():
        first_image = trek_item.images.first()
        if first_image.image_url:
            img_url = str(first_image.image_url)
    elif trek_item.image:   # ← ADD THIS
        img_url = str(trek_item.image)
    return Response({
        "id": trek_item.id,
        "name": trek_item.name,
        "description": trek_item.short_desc or "",
        "state": trek_item.state,
        "price_start": trek_item.price_start,
        "duration_days": trek_item.duration_days or "3D/2N",
        "operating_days": trek_item.operating_days or "Thu, Fri, Sat",
        "main_image": img_url,
        "activities": activities_list,
        "famous_places": places_list,
        "operators": operators_list,
        "related_treks": related_treks,
        "latitude": trek_item.latitude,  # 🗺️ NEW: Map coordinates
        "longitude": trek_item.longitude  # 🗺️ NEW: Map coordinates
    })


@api_view(['GET'])
def api_search_suggestions(request):
    query = request.GET.get("q", "").strip().lower()
    if len(query) < 2:
        return Response([])


    # if len(query) >= 4:
    #     SearchLog.objects.create(query=query, ip_address=request.META.get('REMOTE_ADDR'))
    # Query matching against TrekList records 

    treks = TrekList.objects.filter(name__icontains=query).only("id", "name", "state")[:8]
    
    results = []
    for t in treks:
        results.append({
            "id": t.id,
            "name": t.name,
            "state": t.state
        })
    return Response(results)
@csrf_exempt
@api_view(['POST'])
def api_log_trek_click(request):
    trek_id = request.data.get('trek_id', '')
    query = request.data.get('query', '')
    tag = request.data.get('tag', '')

    trek = None
    if trek_id:
        try:
            trek = TrekList.objects.get(id=trek_id)
        except TrekList.DoesNotExist:
            pass

    SearchLog.objects.create(
        query=query,
        tag=tag,
        trek=trek,
        ip_address=request.META.get('REMOTE_ADDR')
    )
    return Response({"status": "logged"})
@api_view(['GET'])
def api_analytics(request):
    period = request.GET.get('period', '30days')
    qs = SearchLog.objects.all()
    now = dj_timezone.now()

    if period == 'today':
        qs = qs.filter(searched_at__date=now.date())
    elif period == '7days':
        qs = qs.filter(searched_at__gte=now - timedelta(days=7))
    elif period == '30days':
        qs = qs.filter(searched_at__gte=now - timedelta(days=30))
    elif period == 'year':
        qs = qs.filter(searched_at__year=now.year)

    return Response({'total_searches': qs.count()})


@api_view(['GET'])
def api_travel_your_way(request):
    tag = request.GET.get('tag', '').strip()
    page_number = request.GET.get('page', 1)
    if not tag:
        return Response({"results": [], "total_pages": 1})


    

 # ✅ Check cache first
    cache_key = f"api_travel_your_way_{tag}_{page_number}"
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    queryset = (
        TrekList.objects
        .filter(tags__name__iexact=tag)
        .prefetch_related("images", "tags")
        .distinct()
        .order_by("-created_at")
    )
    paginator = Paginator(queryset, 12)               # ← added, 12 per page
    page_obj = paginator.get_page(page_number)
    results = []
    for item in page_obj:
        img_url = ""
        if hasattr(item, 'images') and item.images.exists():
            first_image = item.images.first()
            if hasattr(first_image, 'image_url') and first_image.image_url:
                img_url = first_image.image_url.url if hasattr(first_image.image_url, 'url') else str(first_image.image_url)
        elif item.image:   # ← ADD THIS
            img_url = str(item.image)
        operators_list = []
        if hasattr(item, 'operators_list') and item.operators_list:
            operators_list = [op.strip() for op in item.operators_list.split(',')]
        else:
            operators_list = ["Aorbo Certified Partner"]

        results.append({
            "id": item.id,
            "name": item.name,
            "state": item.state,
            "price_start": item.price_start if hasattr(item, 'price_start') else "N/A",
            "duration_days": item.duration_days if hasattr(item, 'duration_days') else "3D/2N",
            "operating_days": item.operating_days if hasattr(item, 'operating_days') else "THU, FRI, SAT",
            "images": [{"image_url": img_url}] if img_url else [],
            "operators": operators_list,
            "latitude": item.latitude,  # 🗺️ NEW: Map coordinates
            "longitude": item.longitude  # 🗺️ NEW: Map coordinates
        })


    # 3. Save the serialized data to your cache for 10 minutes (matching your home template)
    cache.set(cache_key, {"results": results, "total_pages": paginator.num_pages}, 60 * 10)
    return Response({"results": results, "total_pages": paginator.num_pages})


@api_view(['GET'])
def api_blogs_list(request):
    page_number = request.GET.get('page', 1)
    exclude_slug = request.GET.get('exclude', '')

    qs = Blog.objects.all().order_by('-created_at')
    if exclude_slug:
        qs = qs.exclude(slug=exclude_slug)

    paginator = Paginator(qs, 4)
    page_obj = paginator.get_page(page_number)

    results = []
    for blog in page_obj:
        results.append({
            "title": blog.title,
            "slug": blog.slug,
            "excerpt": blog.excerpt,
            "content": blog.content,
            "image_url": blog.image_url,
            "author": blog.author,
            "created_at": blog.created_at.isoformat(),
        })

    return Response({
        "results": results,
        "total_pages": paginator.num_pages,
        "next": page_obj.has_next(),
        "previous": page_obj.has_previous(),
    })


@api_view(['GET'])
def api_blog_detail(request, slug):
    try:
        blog = Blog.objects.get(slug=slug)
    except Blog.DoesNotExist:
        return Response({"error": "Blog not found"}, status=404)

    page_number = request.GET.get('page', 1)

    all_recent = Blog.objects.exclude(id=blog.id).order_by('-created_at')
    paginator = Paginator(all_recent, 4)
    page_obj = paginator.get_page(page_number)

    recent_blogs = []
    for b in page_obj:
        recent_blogs.append({
            "title": b.title,
            "slug": b.slug,
            "image_url": b.image_url,
            "created_at": b.created_at.isoformat(),
        })

    return Response({
        "blog": {
            "title": blog.title,
            "slug": blog.slug,
            "excerpt": blog.excerpt,
            "content": blog.content,
            "image_url": blog.image_url,
            "author": blog.author,
            "created_at": blog.created_at.isoformat(),
        },
        "recent_blogs": recent_blogs,
        "has_previous": page_obj.has_previous(),
        "has_next": page_obj.has_next(),
    })

@api_view(['GET'])
def api_contact_info(request):
    """
    Returns the site's registered contact info for the Contact page.
    Uses ContactInfo.objects.first() since this is a singleton — one record
    representing the company's official details.
    """
    contact_info = ContactInfo.objects.first()

    if not contact_info:
        return Response({}, status=200)

    return Response({
        "company_name": contact_info.company_name,
        "address": contact_info.address,
        "email": contact_info.email,
        "phone": contact_info.phone,
    })


@api_view(['GET'])
def api_social_media(request):
    """
    Returns all active social media links, ordered for display.
    """
    socials = SocialMedia.objects.all().order_by('order')

    results = []
    for s in socials:
        results.append({
            "name": s.platform,
            "url": s.url,
            "icon": s.icon.url if s.icon else None,
        })

    return Response(results)
# ============ OpenAI Destination Enrichment Endpoint ============

@api_view(['GET'])
@throttle_classes([ScopedRateThrottle])
def api_enrich_destination(request):
    """
    Enrich destination data using OpenAI for destinations not in database.
    
    Query Parameters:
        - name: Destination name (required)
        - lat: Latitude (optional)
        - lon: Longitude (optional)
        - display_name: Full location name from OSM (optional)
    
    Returns enriched destination data with:
        - summary
        - activities
        - travel_tips
        - difficulty
        - best_time_to_visit
        - altitude
        - accommodation
        - local_cuisine
    """
    from .ai_enrichment import enrich_destination_with_ai, create_fallback_enrichment
    from .utils import get_place_image
    import concurrent.futures

    destination_name = request.GET.get('name', '').strip()

    if not destination_name:
        return Response({"error": "Destination name is required"}, status=400)

    location_details = {
        'display_name': request.GET.get('display_name', destination_name),
        'lat': request.GET.get('lat', ''),
        'lon': request.GET.get('lon', '')
    }
    category = request.GET.get('category', '')

    # Run AI enrichment and image lookup at the same time — they're independent
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        enrich_future = executor.submit(enrich_destination_with_ai, destination_name, location_details)
        image_future = executor.submit(get_place_image, destination_name, category)

        try:
            enriched_data = enrich_future.result()
        except Exception as e:
            logger.error(f"AI enrichment failed for '{destination_name}': {e}")
            enriched_data = None

        try:
            image_url = image_future.result()
        except Exception as e:
            logger.error(f"Image lookup failed for '{destination_name}': {e}")
            image_url = None

    if not enriched_data:
        enriched_data = create_fallback_enrichment(destination_name, location_details)

    return Response({
        "destination": destination_name,
        "enrichment": enriched_data,
        "image_url": image_url,
    })
# ✅ SECURITY FIX: rate-limit this endpoint (it calls a paid AI API) to prevent abuse
api_enrich_destination.throttle_scope = 'ai_enrich'

@api_view(['GET'])
def api_nearby_destinations(request):
    """
    ✅ PHASE 4: Find nearby trekking places and adventure destinations.
    
    Query Parameters:
        - lat: Latitude (required)
        - lon: Longitude (required)
        - type: Destination type - trekking, adventure, weekend, camping, beach, nature, spiritual (optional)
        - distance: Max distance in km (default 100, optional)
        - limit: Max results (default 6, optional)
    
    Returns:
        - nearby_destinations: List of nearby places sorted by distance
        - current_location: Current coordinates
    """
    
    try:
        from .nearby_discovery import find_nearby_destinations, prepare_nearby_response
        # Get parameters
        lat = request.GET.get('lat', '').strip()
        lon = request.GET.get('lon', '').strip()
        dest_type = request.GET.get('type', '').strip().lower()
        max_distance = int(request.GET.get('distance', 100))
        limit = int(request.GET.get('limit', 6))
        
        # Validate required parameters
        if not lat or not lon:
            return Response({"error": "Latitude and longitude are required"}, status=400)
        
        try:
            lat = float(lat)
            lon = float(lon)
        except ValueError:
            return Response({"error": "Invalid latitude or longitude"}, status=400)
        
        # Find nearby destinations
        nearby = find_nearby_destinations(
            latitude=lat,
            longitude=lon,
            destination_type=dest_type if dest_type else None,
            max_distance_km=max_distance,
            limit=limit
        )
        
        # Prepare response
        formatted_nearby = prepare_nearby_response(nearby)
        
        return Response({
            "current_location": {
                "latitude": lat,
                "longitude": lon
            },
            "type": dest_type if dest_type else "all",
            "distance_km": max_distance,
            "results_count": len(formatted_nearby),
            "nearby_destinations": formatted_nearby
        })
        
    except Exception as e:
        logger.exception("Error fetching nearby destinations")
        return Response(
            {"error": f"Error fetching nearby destinations: {str(e)}"},
            status=500
    )


# ========================================
# SEARCH REFINEMENT API ENDPOINT
# ========================================

@api_view(['POST'])
def filter_osm_results(request):
    """
    ✅ FINAL FIX: Filter OpenStreetMap results to only trekking destinations.
    BUG 1: Non-trekking locations removed
    BUG 4: Results ranked by relevance
    
    Request: {"results": [...]}
    Response: {"filtered_results": [...], "message": "..."}
    """
    
    from .utils import filter_osm_results as backend_filter
    
    try:
        osm_results = request.data.get('results', [])
        
        if not osm_results:
            return Response({
                "filtered_results": [],
                "rejected_count": 0,
                "accepted_count": 0,
                "message": "No results to filter."
            })
        
        # ✅ BUG 1 & BUG 4: Filter and rank
        filtered = backend_filter(osm_results)
        
        logger.info(f"✅ OSM Filter: {len(filtered)} accepted, {len(osm_results) - len(filtered)} rejected")
        
        return Response({
            "filtered_results": filtered,
            "rejected_count": len(osm_results) - len(filtered),
            "accepted_count": len(filtered),
            "message": f"{len(filtered)} trekking destinations found." if filtered else "No trekking destinations found."
        })
        
    except Exception as e:
        logger.error(f"Error filtering OSM results: {str(e)}")
        return Response({
            "error": f"Error filtering results: {str(e)}",
            "filtered_results": [],
            "rejected_count": 0,
            "accepted_count": 0
        }, status=500)

def send_osm_draft_notification(draft, request):
    """
    Emails the team whenever a new OsmDraftTrek is created, with a direct
    link to review/publish it in Django admin — so no one needs to keep
    checking the admin panel manually.
    """
    try:
        admin_path = reverse(
            f'admin:{draft._meta.app_label}_{draft._meta.model_name}_change',
            args=[draft.id]
        )
        admin_url = request.build_absolute_uri(admin_path)

        context = {
            'trek_name': draft.name,
            'state': draft.state,
            'image_url': draft.image,
            'short_desc': draft.short_desc,
            'admin_url': admin_url,
        }
        html_content = render_to_string('emails/osm_draft_notification.html', context)

        mail = EmailMultiAlternatives(
            subject=f"🆕 New OSM Draft Trek: {draft.name}",
            body=f"A new destination '{draft.name}' was searched and needs review. Visit {admin_url} to fill in details and publish.",
            from_email=f"Aorbo Treks <{settings.DEFAULT_FROM_EMAIL}>",
            to=settings.OSM_DRAFT_NOTIFICATION_EMAILS,
        )
        mail.attach_alternative(html_content, "text/html")
        send_email_async(mail)
    except Exception as e:
        logger.error(f"Failed to send OSM draft notification email for '{draft.name}': {e}")

@api_view(['GET'])
def api_search_intelligent(request):
    """
    ✅ FINAL FIX: Intelligent search with robust error handling
    BUG 2: Real destinations now found (Srisailam, Tada Falls, etc.)
    BUG 5: Multiple query attempts and normalization
    BUG 7: Results cached for 15 minutes
    BUG FIX: Graceful error handling for DB and API failures
    """
    
    from .utils import search_osm_multiple_queries
    from django.core.cache import cache
    from django.db import connection
    import requests
    
    try:
        query = request.GET.get('q', '').strip()
        
        if not query or len(query) < 2:
            return Response({
                "results": [],
                "message": "Query too short"
            }, status=200)  # 200 not 400 - always return valid JSON
        
        # BUG 7: Check cache first
        cache_key = f"search_trek_{query.lower()}"
        cached = cache.get(cache_key)
        if cached:
            logger.info(f"⚡ Cache hit: {query}")
            return Response({
                "results": cached,
                "from_cache": True,
                "message": f"{len(cached)} results from cache"
            }, status=200)
        
        logger.info(f"🔍 Fresh search: {query}")
        
        try:
            # Test database connection before search
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            
            # BUG 2 & BUG 5: Multi-query search with timeout protection
            try:
                results = search_osm_multiple_queries(query)
            except requests.exceptions.Timeout:
                logger.warning(f"⚠️ OSM API timeout for query: {query}")
                results = []  # Return empty results instead of crashing
            except requests.exceptions.RequestException as e:
                logger.warning(f"⚠️ OSM API error for query: {query}: {str(e)}")
                results = []  # Return empty results instead of crashing
            
            # BUG 7: Cache for 15 minutes if we got results
            if results:
                cache.set(cache_key, results, 60 * 15)  # 15 minutes
            
            # ALWAYS return 200 with valid JSON
            return Response({
                "results": results if results else [],
                "from_cache": False,
                "message": f"{len(results)} trekking destinations found" if results else "No results found. Try a different search term."
            }, status=200)
        
        except Exception as db_error:
            # Database connection error
            logger.error(f"❌ Database error in intelligent search: {str(db_error)}")
            return Response({
                "results": [],
                "message": "Search service temporarily unavailable. Please try again.",
                "error": "database_error"
            }, status=200)  # Return 200 not 500 - client can retry
        
    except Exception as e:
        # Catch-all for unexpected errors
        logger.error(f"❌ Unexpected error in intelligent search: {str(e)}")
        return Response({
            "results": [],
            "message": "Search service error. Please try again.",
            "error": "unexpected_error"
        }, status=200)  # Return 200 not 500 - client can retry

@csrf_exempt
@api_view(['POST'])
@throttle_classes([ScopedRateThrottle])
def api_create_trek_from_osm(request):
    """
    Triggered when a visitor clicks an OSM search result. Runs AI enrichment
    and saves it as a draft — NOT a published trek yet. A team member
    reviews and publishes it manually via Django admin.

    A short-lived cache lock prevents duplicate drafts if multiple visitors
    click the exact same new place within the same few seconds, before the
    first request has finished saving to the database.
    """
    name = request.data.get('name', '').strip()
    display_name = request.data.get('display_name', '')
    lat = request.data.get('lat')
    lon = request.data.get('lon')
    category = request.data.get('category', '')

    if not name:
        return Response({"error": "Destination name is required"}, status=400)

    # ✅ SECURITY FIX: validate coordinates are real numbers before storing them
    try:
        lat = float(lat) if lat not in (None, '') else None
        lon = float(lon) if lon not in (None, '') else None
    except (TypeError, ValueError):
        return Response({"error": "Invalid coordinates"}, status=400)

    lock_key = f"osm_draft_lock_{name.lower().strip()}"
    lock_acquired = cache.add(lock_key, True, timeout=30)

    if not lock_acquired:
        return Response({
            "status": "processing",
            "message": "This destination is already being added — please try again shortly."
        }, status=200)

    try:
        if OsmDraftTrek.objects.filter(name__iexact=name).exists():
            existing = OsmDraftTrek.objects.filter(name__iexact=name).first()
            return Response({"status": "already_exists", "draft_id": existing.id}, status=200)

        if TrekList.objects.filter(name__iexact=name).exists():
            existing = TrekList.objects.filter(name__iexact=name).first()
            return Response({"status": "already_published", "trek_id": existing.id}, status=200)

        state_guess = extract_state_from_display_name(display_name) or "Uttarakhand"

        from .ai_enrichment import enrich_destination_with_ai, create_fallback_enrichment
        location_details = {'display_name': display_name, 'lat': lat, 'lon': lon}
        enriched_data = enrich_destination_with_ai(name, location_details) or create_fallback_enrichment(name, location_details)

        from .utils import get_place_image
        image_url = get_place_image(name, category)

        draft = OsmDraftTrek.objects.create(
            name=name,
            state=state_guess,
            image=image_url,
            short_desc=enriched_data.get('summary', ''),
            activities=', '.join(enriched_data.get('activities', [])) if isinstance(enriched_data.get('activities'), list) else enriched_data.get('activities', ''),
            duration_days=enriched_data.get('estimated_duration', ''),
        )

        send_osm_draft_notification(draft, request)

        return Response({
            "status": "draft_created",
            "draft_id": draft.id
        }, status=201)

    finally:
        cache.delete(lock_key)
# ✅ SECURITY FIX: rate-limit this endpoint (it triggers AI calls, DB writes, and emails)
api_create_trek_from_osm.throttle_scope = 'osm_draft_create'