from django.db import models
from django.utils import timezone

class Meeting(models.Model):
    """Model for storing meeting data"""
    
    # Basic Info
    meeting_id = models.CharField(max_length=255, unique=True, db_index=True)
    title = models.CharField(max_length=500)
    platform = models.CharField(max_length=100, choices=[
        ('google_meet', 'Google Meet'),
        ('zoom', 'Zoom'),
        ('teams', 'Microsoft Teams'),
        ('other', 'Other')
    ])
    
    # Timestamps
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    duration = models.IntegerField(default=0, help_text="Duration in seconds")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Meeting URL
    meeting_url = models.URLField(max_length=1000, blank=True)
    
    # AI-Generated Content
    summary = models.TextField(blank=True)
    decisions = models.JSONField(default=list, blank=True)
    action_items = models.JSONField(default=list, blank=True)
    
    # Raw Data
    transcript = models.JSONField(default=list, blank=True)
    participants = models.JSONField(default=list, blank=True)
    
    # Metadata
    structured_data = models.JSONField(default=dict, blank=True)
    
    # PDF Storage
    pdf_file = models.FileField(upload_to='meeting_pdfs/', null=True, blank=True)
    pdf_generated = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['-start_time']),
            models.Index(fields=['meeting_id']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.start_time.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def duration_formatted(self):
        """Return formatted duration string"""
        hours = self.duration // 3600
        minutes = (self.duration % 3600) // 60
        seconds = self.duration % 60
        
        if hours > 0:
            return f"{hours}h {minutes}m {seconds}s"
        elif minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"


class TranscriptChunk(models.Model):
    """Model for storing real-time transcript chunks"""
    
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='transcript_chunks')
    speaker = models.CharField(max_length=255)
    text = models.TextField()
    timestamp = models.DateTimeField()
    sequence = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['sequence', 'timestamp']
        indexes = [
            models.Index(fields=['meeting', 'sequence']),
        ]
    
    def __str__(self):
        return f"{self.speaker}: {self.text[:50]}..."


class SearchIndex(models.Model):
    """Model for search indexing"""
    
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='search_indices')
    content = models.TextField()
    content_type = models.CharField(max_length=50, choices=[
        ('title', 'Title'),
        ('summary', 'Summary'),
        ('transcript', 'Transcript'),
        ('decision', 'Decision'),
        ('action_item', 'Action Item')
    ])
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['content_type']),
        ]
    
    def __str__(self):
        return f"{self.meeting.title} - {self.content_type}"
