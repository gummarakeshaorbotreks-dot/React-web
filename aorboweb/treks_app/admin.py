from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from django.utils.safestring import mark_safe
from django.core.cache import cache
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse, path
import supabase
import json
from django import forms

admin.site.site_header = "Aorbo Treks Admin"
admin.site.site_title = "Aorbo Treks Admin Pannel"
admin.site.index_title = "Dashboard"

from .models import (
    Contact, Blog, TrekOrganizer, TrekImage,
    Testimonial, FAQ, SafetyTip, TeamMember, HomepageBanner,
    SocialMedia, ContactInfo, TrekList, Visitor,
    Operator, Tag, TrekPoint, SearchLog, OsmDraftTrek, ContentSection
)


# ── Contact Date Range Filter ────────────────────────────────────────────────
class ContactDateRangeFilter(admin.SimpleListFilter):
    title = 'Date Range'
    parameter_name = 'date_range'

    def lookups(self, request, model_admin):
        return [
            ('today',     'Today'),
            ('this_week', 'This Week'),
            ('this_year', 'This Year'),
        ]

    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == 'today':
            return queryset.filter(created_at__date=now.date())
        if self.value() == 'this_week':
            start_of_week = now - timedelta(days=now.weekday())
            return queryset.filter(created_at__gte=start_of_week)
        if self.value() == 'this_year':
            return queryset.filter(created_at__year=now.year)
        return queryset

# ── Contact Admin ───────────────────────────────────────────────────────────
@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display   = ('name', 'email', 'mobile', 'user_type', 'trek_category', 'created_at', 'is_deleted')
    list_filter    = ('user_type', 'trek_category', 'is_deleted', ContactDateRangeFilter)
    search_fields  = ('name', 'email', 'mobile', 'comment')
    readonly_fields = ('created_at', 'deleted_at')
    date_hierarchy = 'created_at'
    change_list_template = "admin/contact_filter.html"
    actions = ["delete_selected"]

    def changelist_view(self, request, extra_context=None):
        qs = Contact.objects.all().order_by('-created_at').values(
            'id', 'name', 'email', 'mobile', 'user_type', 'trek_category',
            'comment', 'created_at', 'is_deleted', 'deleted_at'
        )
        submissions = []
        for item in qs:
            submissions.append({
                'id':            item['id'],
                'name':          item['name']          or '',
                'email':         item['email']         or '',
                'mobile':        str(item['mobile']    or ''),
                'user_type':     item['user_type']     or 'other',
                'trek_category': item['trek_category'] or '',
                'comment':       item['comment']       or '',
                'created_at':    item['created_at'].isoformat() if item['created_at'] else '',
                'is_deleted':    item['is_deleted'],
                'deleted_at':    item['deleted_at'].isoformat() if item['deleted_at'] else '',
            })
        extra_context = extra_context or {}
        extra_context['submissions'] = submissions
        return super().changelist_view(request, extra_context=extra_context)

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('soft-delete/', self.admin_site.admin_view(self.soft_delete_view), name='contact_soft_delete'),
            path('restore/', self.admin_site.admin_view(self.restore_view), name='contact_restore'),
            path('permanent-delete/', self.admin_site.admin_view(self.permanent_delete_view), name='contact_permanent_delete'),
        ]
        return custom_urls + urls

    def _get_ids_from_request(self, request):
        try:
            payload = json.loads(request.body or '{}')
            return [int(i) for i in payload.get('ids', [])]
        except (ValueError, TypeError):
            return []

    def soft_delete_view(self, request):
        if request.method != 'POST':
            return JsonResponse({'error': 'POST required'}, status=405)
        if not self.has_delete_permission(request):
            return JsonResponse({'error': 'Permission denied'}, status=403)
        ids = self._get_ids_from_request(request)
        updated = Contact.objects.filter(id__in=ids).update(is_deleted=True, deleted_at=timezone.now())
        return JsonResponse({'success': True, 'count': updated})

    def restore_view(self, request):
        if request.method != 'POST':
            return JsonResponse({'error': 'POST required'}, status=405)
        if not self.has_delete_permission(request):
            return JsonResponse({'error': 'Permission denied'}, status=403)
        ids = self._get_ids_from_request(request)
        updated = Contact.objects.filter(id__in=ids).update(is_deleted=False, deleted_at=None)
        return JsonResponse({'success': True, 'count': updated})

    def permanent_delete_view(self, request):
        if request.method != 'POST':
            return JsonResponse({'error': 'POST required'}, status=405)
        if not self.has_delete_permission(request):
            return JsonResponse({'error': 'Permission denied'}, status=403)
        ids = self._get_ids_from_request(request)
        deleted_count, _ = Contact.objects.filter(id__in=ids, is_deleted=True).delete()
        return JsonResponse({'success': True, 'count': deleted_count})


# ── Blog Admin ──────────────────────────────────────────────────────────────
class BlogAdminForm(forms.ModelForm):
    image_upload = forms.ImageField(
        required=False,
        help_text="Upload image (stored in Supabase as WebP)"
    )
    class Meta:
        model  = Blog
        fields = "__all__"


@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    form = BlogAdminForm
    list_display       = ('title', 'author', 'created_at', 'is_featured', 'image_preview')
    list_filter        = ('is_featured', 'created_at')
    search_fields      = ('title', 'content', 'author')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields    = ('created_at', 'updated_at', 'image_preview')
    date_hierarchy     = 'created_at'
    fieldsets = (
        (None,             {'fields': ('title', 'slug', 'author', 'is_featured')}),
        ('Content',        {'fields': ('content', 'excerpt')}),
        ('Image (Supabase)', {'fields': ('image_upload', 'image_preview')}),
        ('Dates',          {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def save_model(self, request, obj, form, change):
        image_file = form.cleaned_data.get('image_upload')
        if image_file:
            image_url, original_url = obj.upload_to_supabase(image_file)
            obj.image_url         = image_url
            obj.original_image_url = original_url
        super().save_model(request, obj, form, change)

    def image_preview(self, obj):
        if obj.image_url:
            return format_html('<img src="{}" style="max-height:120px;border-radius:8px;" />', obj.image_url)
        return "No image"
    image_preview.short_description = "Image Preview"


# ── Trek Organizer ──────────────────────────────────────────────────────────
@admin.register(TrekOrganizer)
class TrekOrganizerAdmin(admin.ModelAdmin):
    list_display  = ('name', 'contact_email', 'contact_phone', 'is_verified', 'logo_preview')
    list_filter   = ('is_verified',)
    search_fields = ('name', 'description', 'contact_email')

    def logo_preview(self, obj):
        if obj.logo:
            return format_html('<img src="{}" width="50" />', obj.logo.url)
        return "-"
    logo_preview.short_description = 'Logo'


# ── Trek Image ──────────────────────────────────────────────────────────────
@admin.register(TrekImage)
class TrekImageAdmin(admin.ModelAdmin):
    list_display  = ('id', 'caption', 'image_preview')
    search_fields = ('caption',)

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="100" />', obj.image.url)
        return "-"
    image_preview.short_description = 'Image Preview'


# ── Testimonial ─────────────────────────────────────────────────────────────
@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display  = ('name', 'trek_display', 'rating', 'date', 'is_featured', 'photo_preview')
    list_filter   = ('rating', 'is_featured', 'date')
    search_fields = ('name', 'content', 'trek_name')
    readonly_fields = ('photo_preview',)

    def trek_display(self, obj):
        return obj.trek.name if obj.trek else obj.trek_name

    trek_display.short_description = 'Trek'

    def photo_preview(self, obj):
        if obj.photo:
            return format_html('<img src="{}" width="50" />', obj.photo.url)
        return "-"
    photo_preview.short_description = 'Photo'


# ── FAQ ─────────────────────────────────────────────────────────────────────
@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display  = ('question', 'category', 'order')
    list_filter   = ('category',)
    search_fields = ('question', 'answer')
    list_editable = ('order',)


# ── Safety Tip ──────────────────────────────────────────────────────────────
@admin.register(SafetyTip)
class SafetyTipAdmin(admin.ModelAdmin):
    list_display  = ('section_title','title', 'order', 'icon_preview')
    search_fields = ('title', 'content')
    list_editable = ('order',)

    def icon_preview(self, obj):
        if obj.icon:
            return format_html('<img src="{}" width="30" />', obj.icon.url)
        return "-"
    icon_preview.short_description = 'Icon'


# ── Team Member ─────────────────────────────────────────────────────────────
@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display  = ('name', 'position', 'order', 'photo_preview')
    search_fields = ('name', 'position', 'bio')
    list_editable = ('order',)

    def photo_preview(self, obj):
        if obj.photo:
            return format_html('<img src="{}" width="50" />', obj.photo.url)
        return "-"
    photo_preview.short_description = 'Photo'


# ── Homepage Banner ─────────────────────────────────────────────────────────
@admin.register(HomepageBanner)
class HomepageBannerAdmin(admin.ModelAdmin):
    list_display  = ('title', 'is_active', 'order', 'image_preview')
    list_filter   = ('is_active',)
    search_fields = ('title', 'subtitle')
    list_editable = ('is_active', 'order')

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="100" />', obj.image.url)
        return "-"
    image_preview.short_description = 'Image Preview'


# ── Social Media ────────────────────────────────────────────────────────────
@admin.register(SocialMedia)
class SocialMediaAdmin(admin.ModelAdmin):
    list_display  = ('platform', 'url', 'order', 'icon_preview')
    search_fields = ('platform',)
    list_editable = ('order',)

    def icon_preview(self, obj):
        if obj.icon:
            return format_html('<img src="{}" width="30" />', obj.icon.url)
        return "-"
    icon_preview.short_description = 'Icon'


# ── Contact Info ────────────────────────────────────────────────────────────
@admin.register(ContactInfo)
class ContactInfoAdmin(admin.ModelAdmin):
    list_display  = ('company_name', 'email', 'phone')
    search_fields = ('company_name', 'address', 'email', 'phone')


# ── Visitor ─────────────────────────────────────────────────────────────────
@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display    = ("ip_address", "session_id", "user_agent", "visit_time")
    list_filter     = ("visit_time",)
    date_hierarchy  = "visit_time"
    search_fields   = ("ip_address", "session_id", "user_agent")
    readonly_fields = ("ip_address", "session_id", "user_agent", "visit_time")
    change_list_template = "admin/visitor_changelist.html"

    def changelist_view(self, request, extra_context=None):
        from django.db.models.functions import TruncDate
        today = timezone.localdate()
        qs    = Visitor.objects.all()
        total_visitors  = qs.count()
        unique_sessions = qs.values("session_id").distinct().count()
        today_unique    = qs.filter(visit_time__date=today).values("session_id").distinct().count()
        daily_unique    = (
            qs.annotate(day=TruncDate("visit_time"))
              .values("day")
              .annotate(unique=Count("session_id", distinct=True))
              .order_by("-day")[:14]
        )
        extra = {
            "total_visitors":  total_visitors,
            "unique_sessions": unique_sessions,
            "today_unique":    today_unique,
            "daily_unique":    list(daily_unique),
        }
        extra_context = {**(extra_context or {}), **extra}
        return super().changelist_view(request, extra_context=extra_context)

# ── Trek List ───────────────────────────────────────────────────────────────
@admin.register(TrekList)
class TrekListAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'state', 'is_pinned', 'pin_priority',
        'duration_days', 'price_start', 'currency', 'is_ai_generated', 'created_at'
    )
    list_editable  = ('is_pinned', 'pin_priority')
    list_filter    = ('state', 'currency', 'is_pinned', 'created_at' , 'is_ai_generated')
    ordering       = ('pin_priority', '-created_at')
    search_fields  = ('name', 'state', 'short_desc')
    date_hierarchy = 'created_at'
    readonly_fields = ('id', 'created_at', 'image_preview', 'hero_image_preview')
    fieldsets = (
        ("Basic Info",       {"fields": ('id', 'name', 'state')}),
        ("📌 Pin Settings",  {"fields": ('is_pinned', 'pin_priority'),
                              "description": "Pinned treks appear first based on priority (1 = highest)"}),
        ("Pricing & Duration", {"fields": ('duration_days', 'price_start', 'currency', 'operating_days')}),
        ("Content",          {"fields": ('short_desc', 'activities')}),
        ("Relationships",    {"fields": ('tags', 'operators', 'trek_points', 'related_treks')}),
        ("🤖 AI Generation Status", {
            "fields": ('is_ai_generated',),
            "description": "Checked = auto-created from an OpenStreetMap search, may still need a real photo, price, and schedule. Uncheck once fully reviewed and finished."
        }),
        ("Meta",             {"fields": ('created_at',), "classes": ('collapse',)}),
    )
    filter_horizontal = ('tags', 'operators', 'trek_points', 'related_treks')

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="120" />', obj.image)
        return "No image"
    image_preview.short_description = "Image Preview"

    def hero_image_preview(self, obj):
        if obj.hero_image:
            return format_html('<img src="{}" width="200" />', obj.hero_image)
        return "No hero image"
    hero_image_preview.short_description = "Hero Image Preview"

    def save_model(self, request, obj, form, change):
        if not obj.is_pinned:
            obj.pin_priority = None
        super().save_model(request, obj, form, change)


# ── Operator / Tag / Trek Point ─────────────────────────────────────────────
@admin.register(Operator)
class OperatorAdmin(admin.ModelAdmin):
    list_display  = ('name',)
    search_fields = ('name',)

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display  = ('name',)
    search_fields = ('name',)

@admin.register(TrekPoint)
class TrekPointAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    list_display = ('query', 'tag', 'trek', 'ip_address', 'searched_at')
    list_filter = ('tag',)
    search_fields = ('query', 'tag')
    readonly_fields = ('query', 'tag', 'trek', 'ip_address', 'searched_at')
    ordering = ('-searched_at',)
    change_list_template = "admin/searchlog_changelist.html"

    def get_queryset(self, request):
        """
        Filters data dynamically using our custom session-safe period parameter
        without crashing Django Admin's validation loop.
        """
        qs = super().get_queryset(request)

        period = request.GET.get('period') or getattr(self, '_current_period', '30days')
        now = timezone.now()

        if period == 'today':
            qs = qs.filter(searched_at__date=timezone.localdate())
        elif period == '7days':
            qs = qs.filter(searched_at__gte=now - timedelta(days=7))
        elif period == '30days':
            qs = qs.filter(searched_at__gte=now - timedelta(days=30))
        elif period == 'year':
            qs = qs.filter(searched_at__year=now.year)

        elif period == 'custom_year':
            year = request.GET.get('year')
            if year and year.isdigit():
                qs = qs.filter(searched_at__year=int(year))
            
        return qs

    def changelist_view(self, request, extra_context=None):
        period = request.GET.get('period', '30days')

        self._current_period = period  
        selected_year = request.GET.get('year', '')
        available_years = [d.year for d in SearchLog.objects.dates('searched_at', 'year', order='DESC')]


        qs = self.get_queryset(request)
        total_searches = qs.count()

        top_treks_chart_qs = list(
            qs.exclude(trek=None)
            .values('trek__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )

        top_tags_qs = list(
            qs.exclude(tag='')
            .values('tag')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        top_treks_qs = list(
            qs.exclude(trek=None)
            .values('trek__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:1]
        )

        top_queries_qs = list(
            qs.exclude(query='')
            .values('query')
            .annotate(count=Count('id'))
            .order_by('-count')[:1]
        )

        top_query = top_queries_qs[0]['query'] if top_queries_qs else '-'
        top_query_count = top_queries_qs[0]['count'] if top_queries_qs else 0
        top_tag = top_tags_qs[0]['tag'] if top_tags_qs else '-'
        top_tag_count = top_tags_qs[0]['count'] if top_tags_qs else 0
        top_trek = top_treks_qs[0]['trek__name'] if top_treks_qs else '-'
        top_trek_count = top_treks_qs[0]['count'] if top_treks_qs else 0

        extra = {
            'period': period,
            'selected_year': selected_year,
            'available_years': available_years,
            'total_searches': total_searches,
            'top_query': top_query,
            'top_query_count': top_query_count,
            'top_tag': top_tag,
            'top_tag_count': top_tag_count,
            'top_trek': top_trek,
            'top_trek_count': top_trek_count,
            'top_queries_labels': [t['trek__name'] for t in top_treks_chart_qs],
            'top_queries_data': [t['count'] for t in top_treks_chart_qs],
            'top_tags_labels': [t['tag'] for t in top_tags_qs],
            'top_tags_data': [t['count'] for t in top_tags_qs],
        }

        extra_context = {**(extra_context or {}), **extra}

        request.GET = request.GET.copy()
        if 'period' in request.GET:
            request.GET.pop('period')
        if 'year' in request.GET:
            request.GET.pop('year')

        return super().changelist_view(request, extra_context=extra_context)

@admin.register(OsmDraftTrek)
class OsmDraftTrekAdmin(admin.ModelAdmin):
    list_display = ('name', 'state', 'price_start', 'operating_days', 'is_published', 'created_at')
    list_filter = ('is_published', 'state')
    search_fields = ('name', 'state')
    filter_horizontal = ('operators', 'trek_points', 'related_treks')

    fieldsets = (
        ("Auto-generated (from OSM/AI)", {
            "fields": ('name', 'state', 'image', 'short_desc', 'activities'),
        }),
        ("Fill in manually before publishing", {
            "fields": ('operators', 'trek_points', 'related_treks', 'price_start', 'operating_days', 'duration_days'),
            "description": "Fill these in, then use the 'Publish to Trek List' action below."
        }),
    )

    actions = ['publish_to_treklist']

    def publish_to_treklist(self, request, queryset):
        published_count = 0
        skipped_count = 0

        for draft in queryset:
            if draft.is_published:
                skipped_count += 1
                continue

            if not draft.price_start or not draft.operating_days:
                self.message_user(
                    request,
                    f"Skipped '{draft.name}' — price and operating days must be filled in first.",
                    level='warning'
                )
                skipped_count += 1
                continue

            trek = TrekList.objects.create(
                name=draft.name,
                state=draft.state,
                image=draft.image,
                short_desc=draft.short_desc,
                activities=draft.activities,
                duration_days=draft.duration_days,
                operating_days=draft.operating_days,
                price_start=draft.price_start,
                currency='INR',
                is_ai_generated=True,
            )
            trek.operators.set(draft.operators.all())
            trek.trek_points.set(draft.trek_points.all())
            trek.related_treks.set(draft.related_treks.all())

            draft.is_published = True
            draft.save()
            published_count += 1

        cache.delete("featured_treks_qs")

        self.message_user(request, f"Published {published_count} trek(s). Skipped {skipped_count}.")
    publish_to_treklist.short_description = "✅ Publish selected drafts to Trek List"


@admin.register(ContentSection)
class ContentSectionAdmin(admin.ModelAdmin):
    list_display = (
        "heading",
        "page",
        "order",
        "is_active",
        "updated_at",
    )

    list_filter = (
        "page",
        "is_active",
    )

    search_fields = (
        "heading",
        "content",
    )

    list_editable = (
        "order",
        "is_active",
    )

    ordering = (
        "page",
        "order",
    )

    fieldsets = (
        (
            "Content Details",
            {
                "fields": (
                    "page",
                    "heading",
                    "sub_heading",
                    "content",
                    "order",
                    "is_active",
                )
            },
        ),
    )