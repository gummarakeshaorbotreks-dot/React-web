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
from access_control.admin_mixins import RBACAdminMixin

admin.site.site_header = "Aorbo Treks Admin"
admin.site.site_title = "Aorbo Treks Admin Pannel"
admin.site.index_title = "Dashboard"

from .models import (
    Contact, Blog, TrekOrganizer, TrekImage,
    Testimonial, FAQ, SafetyTip, TeamMember, HomepageBanner,
    SocialMedia, ContactInfo, TrekList, Visitor,
    Operator, Tag, TrekPoint, SearchLog, OsmDraftTrek, ContentSection,
    CrashReport, SeoOverride, TrekDeparture,
)
from access_control.rbac_guards import actor_can
from . import trek_rules


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
class ContactAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "contacts"
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
class BlogAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "content"
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
class TrekOrganizerAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "treks"
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
class TrekImageAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "treks"
    list_display  = ('id', 'caption', 'image_preview')
    search_fields = ('caption',)

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="100" />', obj.image.url)
        return "-"
    image_preview.short_description = 'Image Preview'


# ── Testimonial ─────────────────────────────────────────────────────────────
@admin.register(Testimonial)
class TestimonialAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "content"
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
class FAQAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "content"
    list_display  = ('question', 'category', 'order')
    list_filter   = ('category',)
    search_fields = ('question', 'answer')
    list_editable = ('order',)


# ── Safety Tip ──────────────────────────────────────────────────────────────
@admin.register(SafetyTip)
class SafetyTipAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "content"
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
class TeamMemberAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "content"
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
class HomepageBannerAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "content"
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
class SocialMediaAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "content"
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
class ContactInfoAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "content"
    list_display  = ('company_name', 'email', 'phone')
    search_fields = ('company_name', 'address', 'email', 'phone')


# ── Visitor ─────────────────────────────────────────────────────────────────
@admin.register(Visitor)
class VisitorAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "analytics"
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
class TrekListAdminForm(forms.ModelForm):
    """Checks every trek before it is saved (rules and reasons: trek_rules.py).

    On the edit form only, not the list page's quick "pinned" edits, so pinning
    never fails because of an unrelated field.
    """

    class Meta:
        model = TrekList
        fields = "__all__"

    def _others(self):
        qs = TrekList.objects.all()
        return qs.exclude(pk=self.instance.pk) if self.instance.pk else qs

    @staticmethod
    def _rule(fn, *args):
        try:
            return fn(*args)
        except ValueError as e:
            raise forms.ValidationError(str(e))

    def clean_name(self):
        return self._rule(trek_rules.check_name, self.cleaned_data.get("name"),
                          dict(self._others().values_list("id", "name")))

    def clean_state(self):
        return self._rule(trek_rules.normalize_state, self.cleaned_data.get("state"))

    def clean_duration_days(self):
        return self._rule(trek_rules.normalize_duration, self.cleaned_data.get("duration_days"))

    def clean_operating_days(self):
        return self._rule(trek_rules.normalize_operating_days, self.cleaned_data.get("operating_days"))

    def clean_activities(self):
        return trek_rules.tidy_activities(self.cleaned_data.get("activities"))

    def clean_short_desc(self):
        return self._rule(trek_rules.check_description, self.cleaned_data.get("short_desc"),
                          dict(self._others().values_list("id", "short_desc")))

    def clean(self):
        data = super().clean()
        others = {i: (la, lo) for i, la, lo in self._others().exclude(latitude=None).values_list("id", "latitude", "longitude")}
        try:
            trek_rules.check_position(data.get("latitude"), data.get("longitude"), others)
        except ValueError as e:
            self.add_error("latitude", str(e))
        return data


class TrekDepartureForm(forms.ModelForm):
    """Checks a departure city before it is saved (rules: trek_rules.py)."""

    class Meta:
        model = TrekDeparture
        # Where a row came from and its booking link are set by the app sync only.
        exclude = ("source", "book_url")

    @staticmethod
    def _rule(fn, value):
        try:
            return fn(value)
        except ValueError as e:
            raise forms.ValidationError(str(e))

    def clean_city(self):
        return self._rule(trek_rules.normalize_city, self.cleaned_data.get("city"))

    def clean_pickup_point(self):
        return self._rule(trek_rules.tidy_pickup, self.cleaned_data.get("pickup_point"))

    def clean_days(self):
        days = (self.cleaned_data.get("days") or "").strip()
        return self._rule(trek_rules.normalize_operating_days, days) if days else ""

    def clean_price_from(self):
        price = self.cleaned_data.get("price_from")
        if price is None or not (100 <= price <= 500000):
            raise forms.ValidationError("Enter the price per person in rupees, between 100 and 5,00,000.")
        return price

    def clean(self):
        # Rows from the Aorbo app are rewritten every hour (manage.py sync_app_departures):
        # a hand edit would vanish, so it is refused with where to change it instead.
        data = super().clean()
        if self.instance.pk and self.instance.source == "app" and self.has_changed():
            raise forms.ValidationError("This departure comes from the Aorbo app (the vendor's trek). "
                                        "Change it there, or link a different app destination on the trek.")
        return data


class TrekDepartureInline(admin.TabularInline):
    """Departure cities, edited on the trek's own page. Each one gives the trek a
    "<destination> trip from <city>" page on the website (scripts/route-pages.mjs)."""
    model = TrekDeparture
    form = TrekDepartureForm
    extra = 0
    fields = ('city', 'pickup_point', 'departure_time', 'price_from', 'days', 'operator', 'is_active', 'source')
    readonly_fields = ('source',)
    verbose_name = "Departure city"
    verbose_name_plural = "🚌 Departure cities (city, pickup point, time and price from that city)"

    # Same rule as the trek itself ("treks:edit"); the RBAC mixin's signatures don't fit inlines.
    def _can(self, request, action):
        return actor_can(request.user, f"treks:{action}") if hasattr(request.user, "staff_profile") else None

    def has_view_permission(self, request, obj=None):
        r = self._can(request, "read")
        return super().has_view_permission(request, obj) if r is None else (r or bool(self._can(request, "edit")))

    def has_add_permission(self, request, obj=None):
        r = self._can(request, "edit")
        return super().has_add_permission(request, obj) if r is None else r

    def has_change_permission(self, request, obj=None):
        r = self._can(request, "edit")
        return super().has_change_permission(request, obj) if r is None else r

    def has_delete_permission(self, request, obj=None):
        r = self._can(request, "edit")
        return super().has_delete_permission(request, obj) if r is None else r


@admin.register(TrekList)
class TrekListAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "treks"
    form = TrekListAdminForm
    inlines = (TrekDepartureInline,)
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
        ("📍 Map position",  {"fields": ('latitude', 'longitude'),
                              "description": "The trek's real place (trailhead or peak), used for the 'Treks near your city' "
                                             "pages. On Google Maps, right-click the place and click the numbers to copy them: "
                                             "the first is the latitude, the second the longitude. Leave both empty if unsure: "
                                             "the SEO bot finds a checked position itself."}),
        ("Relationships",    {"fields": ('tags', 'operators', 'trek_points', 'related_treks')}),
        ("🔗 Aorbo app",     {"fields": ('app_destination_ids',),
                              "description": "Real departures from vendors on the Aorbo app show on this page by themselves "
                                             "(hourly). By default the app destination with exactly this trek's name is used; "
                                             "for a page with a different name, enter the app destination IDs here."}),
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
def _name_form(model, tidy, what):
    """Admin form that tidies the name (capitals) and refuses a second entry of the same name:
    the same place had been saved up to 4 times ("Mattupetty Dam")."""
    class NameForm(forms.ModelForm):
        class Meta:
            fields = "__all__"

        def clean_name(self):
            try:
                name = tidy(self.cleaned_data.get("name"))
            except ValueError as e:
                raise forms.ValidationError(str(e))
            same = model.objects.filter(name__iexact=name)
            if self.instance.pk:
                same = same.exclude(pk=self.instance.pk)
            if same.exists():
                raise forms.ValidationError(f"{what} '{name}' already exists: pick it from the list instead of adding it again.")
            return name
    NameForm.Meta.model = model
    return NameForm


@admin.register(Operator)
class OperatorAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "treks"
    form = _name_form(Operator, trek_rules.title_case, "Organiser")
    list_display  = ('name',)
    search_fields = ('name',)

@admin.register(Tag)
class TagAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "treks"
    form = _name_form(Tag, trek_rules.title_case, "Tag")
    list_display  = ('name',)
    search_fields = ('name',)

@admin.register(TrekPoint)
class TrekPointAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "treks"
    form = _name_form(TrekPoint, trek_rules.tidy_place, "Place")
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(SearchLog)
class SearchLogAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "analytics"
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
class OsmDraftTrekAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "osm_drafts"
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

            # Same checks as the trek form (trek_rules.py): a draft with a wrong state,
            # duration or a copied description is not published.
            existing = TrekList.objects.all()
            try:
                checked = {
                    "name": trek_rules.check_name(draft.name, dict(existing.values_list("id", "name"))),
                    "state": trek_rules.normalize_state(draft.state),
                    "duration_days": trek_rules.normalize_duration(draft.duration_days),
                    "operating_days": trek_rules.normalize_operating_days(draft.operating_days),
                    "short_desc": trek_rules.check_description(draft.short_desc, dict(existing.values_list("id", "short_desc"))),
                }
            except ValueError as e:
                self.message_user(request, f"Skipped '{draft.name}': {e} Fix it in the draft, then publish again.",
                                  level='warning')
                skipped_count += 1
                continue

            trek = TrekList.objects.create(
                image=draft.image,
                activities=trek_rules.tidy_activities(draft.activities),
                price_start=draft.price_start,
                currency='INR',
                is_ai_generated=True,
                **checked,
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
class ContentSectionAdmin(RBACAdminMixin, admin.ModelAdmin):
    resource = "content"
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


@admin.register(CrashReport)
class CrashReportAdmin(admin.ModelAdmin):
    """Crash reports only ever get created by code (the crash-report API
    endpoint or the exception-logging middleware) - there's no legitimate
    reason for a human to hand-create or delete one via this admin, so
    add/delete stay off regardless of role."""

    list_display = ("report_id", "platform", "severity", "route", "is_resolved", "created_at")
    list_filter = ("platform", "severity", "is_resolved")
    search_fields = ("report_id", "error_message", "route")
    readonly_fields = (
        "report_id", "platform", "severity", "error_message", "stack_trace",
        "route", "user_agent", "ip_address", "app_version", "extra_context", "created_at",
    )
    fields = readonly_fields + ("is_resolved", "resolved_by", "resolved_at", "resolution_notes")
    actions = ["mark_resolved"]

    def has_module_permission(self, request):
        from access_control.rbac_guards import actor_can
        return request.user.is_superuser or actor_can(request.user, "crash_reports:read")

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        from access_control.rbac_guards import actor_can
        return request.user.is_superuser or actor_can(request.user, "crash_reports:resolve")

    def save_model(self, request, obj, form, change):
        if obj.is_resolved and not obj.resolved_at:
            obj.resolved_by = request.user
            obj.resolved_at = timezone.now()
        super().save_model(request, obj, form, change)

    @admin.action(description="Mark selected reports as resolved")
    def mark_resolved(self, request, queryset):
        queryset.filter(is_resolved=False).update(
            is_resolved=True, resolved_by=request.user, resolved_at=timezone.now()
        )


@admin.register(SeoOverride)
class SeoOverrideAdmin(admin.ModelAdmin):
    list_display = ("path", "title", "source", "active", "updated_at")
    list_filter = ("source", "active")
    search_fields = ("path", "title", "description", "note")
    readonly_fields = ("created_at", "updated_at")


@admin.register(TrekDeparture)
class TrekDepartureAdmin(RBACAdminMixin, admin.ModelAdmin):
    """All departure cities in one list (they are added on each trek's page)."""
    resource = "treks"
    form = TrekDepartureForm
    list_display = ('trek', 'city', 'pickup_point', 'departure_time', 'price_from', 'operator', 'is_active', 'source', 'updated_at')
    list_filter = ('source', 'city', 'is_active', 'operator')
    search_fields = ('trek__name', 'city', 'pickup_point')
    autocomplete_fields = ('trek',)
    list_editable = ('is_active',)
    readonly_fields = ('source', 'book_url')
