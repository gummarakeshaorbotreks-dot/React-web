from django.db import models
from django.utils import timezone
from django.urls import reverse
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from django.utils.html import mark_safe
from django.conf import settings
from ckeditor.fields import RichTextField
from PIL import Image, ImageEnhance
import bleach
import uuid
import mimetypes
import io
from io import BytesIO
import os
from django.template.defaultfilters import filesizeformat
from .supabase_client import supabase

class Visitor(models.Model):
    ip_address = models.GenericIPAddressField()
    session_id = models.CharField(max_length=255, blank=True, db_index=True)
    user_agent = models.CharField(max_length=255, blank=True)
    visit_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["visit_time"]),
            models.Index(fields=["ip_address"]),
        ]

    def __str__(self):
        return f"{self.ip_address} @ {self.visit_time}"


def validate_image_file_extension(value):
    """
    Validate image file extension, size, and actual image content using Pillow.
    """

    VALID_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in VALID_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file extension. Allowed: {', '.join(VALID_EXTENSIONS)}"
        )
    if value.size > MAX_FILE_SIZE:
        raise ValidationError(
            f"File size too large. Max size is {filesizeformat(MAX_FILE_SIZE)}."
        )
    try:
        value.seek(0)
        img = Image.open(value)
        img.verify()  
    except Exception:
        raise ValidationError("Uploaded file is not a valid image.")
    finally:
        value.seek(0) 

class Contact(models.Model):
    """Store contact form submissions."""
    USER_TYPE_CHOICES = [
        ('trekker', 'Trekker'),
        ('organizer', 'Trek Organizer'),
        ('other', 'Other'),
    ]
    TREK_CATEGORY_CHOICES = [
        ('adventure', 'Adventure Treks'),
        ('weekend', 'Weekend Treks'),
        ('nature', 'Nature Escapes'),
        ('beach', 'Beach Treks'),
        ('camping', 'Camping Treks'),
        ('spiritual', 'Spiritual Treks'),
    ]

    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100)
    mobile = models.CharField(max_length=20)
    user_type = models.CharField(max_length=50, choices=USER_TYPE_CHOICES, blank=True, null=True)
    trek_category = models.CharField(max_length=50, choices=TREK_CATEGORY_CHOICES, blank=True, null=True)
    comment = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Contact Submission'
        verbose_name_plural = 'Contact Submissions'

    def __str__(self):
        return f"{self.name} — {self.user_type} ({self.created_at.strftime('%d %b %Y')})"
    
class Blog(models.Model):
    """Blog articles with WebP images stored ONLY in Supabase (no media files)."""

    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)
    content = RichTextField()
    excerpt = models.TextField(
        max_length=300,
        blank=True,
        help_text="Short description for blog listings"
    )

    image_url = models.URLField(blank=True, null=True)
    original_image_url = models.URLField(blank=True, null=True)

    author = models.CharField(max_length=100)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_featured = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def convert_to_webp(self, image_file):
        image = Image.open(image_file).convert("RGB")
        output = BytesIO()
        image.save(output, format="WEBP", quality=85)
        output.seek(0)
        return output

    def upload_to_supabase(self, image_file):
        bucket = supabase.storage.from_("blogs")
        folder = "blogs"

        # original
        original_webp = self.convert_to_webp(image_file)
        original_name = f"{uuid.uuid4()}.webp"
        original_path = f"{folder}/originals/{original_name}"

        bucket.upload(
            original_path,
            original_webp.read(),
            {"content-type": "image/webp"}
        )

        # main image
        image_file.seek(0)
        webp = self.convert_to_webp(image_file)
        name = f"{uuid.uuid4()}.webp"
        path = f"{folder}/{name}"

        bucket.upload(
            path,
            webp.read(),
            {"content-type": "image/webp"}
        )

        return (
            bucket.get_public_url(path),
            bucket.get_public_url(original_path)
        )

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)

        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class TrekOrganizer(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    logo = models.ImageField(upload_to='organizers/', validators=[validate_image_file_extension])
    website = models.URLField(blank=True)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20)
    is_verified = models.BooleanField(default=False)
    
    def __str__(self):
        return self.name


class Testimonial(models.Model):
    name = models.CharField(max_length=100)
    photo = models.ImageField(upload_to='testimonials/', blank=True, null=True, validators=[validate_image_file_extension])
    trek = models.ForeignKey('TrekList', on_delete=models.SET_NULL, null=True, blank=True, related_name='testimonials')
    trek_name = models.CharField(max_length=200, blank=True, help_text="Only required if trek is not selected")
    date = models.DateField()
    content = models.TextField()
    rating = models.PositiveSmallIntegerField(choices=[(i, i) for i in range(1, 6)])
    is_featured = models.BooleanField(default=False)
    
    def save(self, *args, **kwargs):
        # Sanitize content before saving to prevent XSS
        self.content = bleach.clean(self.content, tags=[], attributes={}, strip=True)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.trek or self.trek_name}"

class FAQ(models.Model):
    CATEGORY_CHOICES = [
        ('booking', 'Booking & Payment'),
        ('treks', 'Treks & Activities'),
        ('safety', 'Safety & Equipment'),
        ('Cancellation & Refund', 'Cancellation & Refund'),
        ('Payment-Related', 'Payment-Related'),
        ('Customer-support', 'Customer-Support'),
    ]
    
    question = models.CharField(max_length=300)
    answer = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='general')
    order = models.PositiveIntegerField(default=0, help_text="Order of display")
    
    class Meta:
        ordering = ['category', 'order']
        verbose_name = "FAQ"
        verbose_name_plural = "FAQs"
    
    def __str__(self):
        return self.question

class SafetyTip(models.Model):
    section_title = models.CharField(max_length=200, default='Safety Tips')
    title = models.CharField(max_length=200)
    content = models.TextField()
    icon = models.ImageField(upload_to='safety_icons/', blank=True, null=True, validators=[validate_image_file_extension])
    order = models.PositiveIntegerField(default=0, help_text="Order of display")
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return self.title

class TeamMember(models.Model):
    name = models.CharField(max_length=100)
    position = models.CharField(max_length=100)
    bio = models.TextField()
    photo = models.ImageField(upload_to='team/', validators=[validate_image_file_extension])
    email = models.EmailField(blank=True)
    linkedin = models.URLField(blank=True)
    order = models.PositiveIntegerField(default=0, help_text="Order of display")
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return f"{self.name} - {self.position}"

class HomepageBanner(models.Model):
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=300, blank=True)
    image = models.ImageField(upload_to='banners/', validators=[validate_image_file_extension])
    button_text = models.CharField(max_length=50, blank=True)
    button_url = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, help_text="Order of display")
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return self.title

class SocialMedia(models.Model):
    platform = models.CharField(max_length=50)
    url = models.URLField()
    icon = models.ImageField(upload_to='social_icons/', blank=True, null=True, validators=[validate_image_file_extension])
    order = models.PositiveIntegerField(default=0, help_text="Order of display")
    
    class Meta:
        ordering = ['order']
        verbose_name_plural = "Social Media Links"
    
    def __str__(self):
        return self.platform

class ContactInfo(models.Model):
    company_name = models.CharField(max_length=200)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    map_url = models.URLField(blank=True, help_text="Google Maps URL")
    
    class Meta:
        verbose_name_plural = "Contact Information"
    
    def __str__(self):
        return self.company_name

class TermsAndConditions(models.Model):
    title = models.CharField(max_length=255, default="Terms and Conditions")
    content = RichTextField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} (Last updated: {self.updated_at.strftime('%Y-%m-%d')})"

    def content_preview(self):
        return mark_safe(self.content[:300] + "...")
    
class Operator(models.Model):
    name = models.CharField(max_length=200, unique=True)
    def __str__(self): return self.name

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    def __str__(self): return self.name

class TrekPoint(models.Model):
    name = models.CharField(max_length=200)
    def __str__(self): return self.name

class TrekList(models.Model):
    id = models.SlugField(primary_key=True, editable=False)
    name = models.CharField(max_length=200)
    state = models.CharField(max_length=100, blank=True, null=True)
    
    # 🗺️ OpenStreetMap coordinates for map integration
    latitude = models.FloatField(blank=True, null=True, help_text="Latitude coordinate (auto-geocoded)")
    longitude = models.FloatField(blank=True, null=True, help_text="Longitude coordinate (auto-geocoded)")

    is_pinned = models.BooleanField(default=False)
    pin_priority = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Lower number = higher priority (1 comes first)"
    )

    image = models.CharField(max_length=500, blank=True, null=True)
    hero_image = models.CharField(max_length=500, blank=True, null=True)
    duration_days = models.CharField(max_length=100, blank=True, null=True)

    price_start = models.PositiveIntegerField(blank=True, null=True)
    currency = models.CharField(max_length=10, default="INR")
    operating_days = models.CharField(max_length=200, blank=True, null=True)

    tags = models.ManyToManyField(Tag, blank=True)
    operators = models.ManyToManyField(Operator, blank=True)
    trek_points = models.ManyToManyField(TrekPoint, blank=True)

    short_desc = models.TextField(blank=True, null=True)
    highlights = models.TextField(blank=True, null=True)
    activities = models.TextField(
        blank=True,
        null=True,
        help_text="Comma-separated values. Example: Trekking, Camping, Bonfire"
    )
    related_treks = models.ManyToManyField('self', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_ai_generated = models.BooleanField(default=False, help_text="True if this trek was created from an OSM search result and may still need review (photo, price, schedule).")

    def save(self, *args, **kwargs):
        if not self.id:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1

            while TrekList.objects.filter(id=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            self.id = slug

        # 🗺️ Auto-geocode if coordinates are missing but state is present
        if self.state and (not self.latitude or not self.longitude):
            from .utils import geocode_location
            try:
                coords = geocode_location(self.state)
                if coords:
                    self.latitude = coords['lat']
                    self.longitude = coords['lon']
            except Exception as e:
                print(f"Geocoding failed for {self.state}: {e}")

        super().save(*args, **kwargs)

    @property
    def activities_list(self):
        if not self.activities:
            return []
        return [a.strip() for a in self.activities.split(",") if a.strip()]

    def __str__(self):
        return self.name

 
class TrekImage(models.Model):
    trek = models.ForeignKey(
        TrekList,
        related_name="images",
        on_delete=models.CASCADE
    )

    # Used ONLY for upload input (admin/form)
    image = models.ImageField(
        upload_to="trek_images/",
        validators=[validate_image_file_extension],
        blank=True,
        null=True
    )

    # Actual frontend-consumed field
    image_url = models.URLField(
        blank=True,
        null=True,
        editable=False
    )

    caption = models.CharField(max_length=200, blank=True)

    def save(self, *args, **kwargs):
        bucket = supabase.storage.from_("blogs")
        folder = "trek_images"

        # Upload new image
        if self.image:
            ext = self.image.name.split(".")[-1].lower()
            file_name = f"{uuid.uuid4()}.{ext}"
            path = f"{folder}/{file_name}"

            # Compress image
            img = Image.open(self.image)
            img_io = io.BytesIO()

            if ext in ["jpg", "jpeg"]:
                img.save(img_io, format="JPEG", optimize=True, quality=70)
                mime = "image/jpeg"
            elif ext == "png":
                img.save(img_io, format="PNG", optimize=True)
                mime = "image/png"
            elif ext == "webp":
                img.save(img_io, format="WEBP", quality=80)
                mime = "image/webp"
            else:
                img.save(img_io, format=img.format)
                mime = mimetypes.guess_type(self.image.name)[0] or "application/octet-stream"

            img_io.seek(0)

            # Remove old image if updating
            if self.image_url:
                base = bucket.get_public_url("").rstrip("/") + "/"
                old_path = self.image_url.replace(base, "", 1)
                bucket.remove([old_path])

            # Upload to Supabase
            bucket.upload(path, img_io.getvalue(), {"content-type": mime})
            self.image_url = bucket.get_public_url(path)

            # Prevent Django from storing the file locally
            self.image = None

        super().save(*args, **kwargs)

    def __str__(self):
        return self.caption or f"{self.trek.name} - Image"
    
class SearchLog(models.Model):
    query = models.CharField(max_length=255, blank=True)
    tag = models.CharField(max_length=100, blank=True)
    trek = models.ForeignKey(
        TrekList, on_delete=models.SET_NULL,
        null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    searched_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.query or self.tag} @ {self.searched_at}"
    

class OsmDraftTrek(models.Model):
    name = models.CharField(max_length=200)
    state = models.CharField(max_length=100, blank=True, null=True)
    image = models.CharField(max_length=500, blank=True, null=True)
    short_desc = models.TextField(blank=True, null=True)
    activities = models.TextField(blank=True, null=True)

    operators = models.ManyToManyField(Operator, blank=True)
    trek_points = models.ManyToManyField(TrekPoint, blank=True)
    related_treks = models.ManyToManyField(TrekList, blank=True)
    price_start = models.PositiveIntegerField(blank=True, null=True)
    operating_days = models.CharField(max_length=200, blank=True, null=True)
    duration_days = models.CharField(max_length=100, blank=True, null=True)

    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (draft)"

class ContentSection(models.Model):
    PAGE_CHOICES = [
        ("safety", "Safety"),
        ("terms", "Terms & Conditions"),
        ("privacy", "Privacy Policy"),
        ("agreement", "User Agreement"),
    ]

    page = models.CharField(
        max_length=30,
        choices=PAGE_CHOICES
    )

    heading = models.CharField(max_length=255)

    sub_heading = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Optional subsection heading"
    )

    content = RichTextField()

    order = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["page", "order"]
        verbose_name = "Content Section"
        verbose_name_plural = "Content Sections"

    def __str__(self):
        return f"{self.get_page_display()} - {self.heading}"