from rest_framework import serializers
from .models import Meeting, TranscriptChunk, SearchIndex

class TranscriptChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = TranscriptChunk
        fields = ['id', 'speaker', 'text', 'timestamp', 'sequence']

class MeetingSerializer(serializers.ModelSerializer):
    duration_formatted = serializers.ReadOnlyField()
    transcript_chunks = TranscriptChunkSerializer(many=True, read_only=True)
    
    class Meta:
        model = Meeting
        fields = [
            'id', 'meeting_id', 'title', 'platform', 
            'start_time', 'end_time', 'duration', 'duration_formatted',
            'meeting_url', 'summary', 'decisions', 'action_items',
            'transcript', 'participants', 'structured_data',
            'pdf_file', 'pdf_generated', 'transcript_chunks',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

class MeetingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meeting
        fields = [
            'meeting_id', 'title', 'platform', 'start_time', 
            'end_time', 'duration', 'meeting_url', 'summary', 
            'decisions', 'action_items', 'transcript', 'participants',
            'structured_data'
        ]

class PDFGenerationSerializer(serializers.Serializer):
    title = serializers.CharField()
    summary = serializers.CharField(required=False, allow_blank=True)
    decisions = serializers.ListField(child=serializers.CharField(), required=False)
    action_items = serializers.ListField(child=serializers.CharField(), required=False)
    transcript = serializers.CharField(required=False, allow_blank=True)
    date = serializers.CharField(required=False)
    duration = serializers.IntegerField(required=False, default=0)
    # Extended fields for richer PDF output
    topics = serializers.ListField(child=serializers.CharField(), required=False)
    speakers = serializers.ListField(child=serializers.CharField(), required=False)
    series_id = serializers.CharField(required=False, allow_blank=True)
    series_rank = serializers.IntegerField(required=False)

class SearchSerializer(serializers.Serializer):
    query = serializers.CharField()
    content_types = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=['title', 'summary', 'transcript', 'decision', 'action_item']
    )
