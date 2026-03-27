from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Q
from datetime import datetime
import io
import os
import subprocess
import tempfile
import glob
import shutil

from .models import Meeting, TranscriptChunk, SearchIndex
from .serializers import (
    MeetingSerializer, MeetingCreateSerializer, 
    PDFGenerationSerializer, SearchSerializer
)

# PDF Generation
def generate_pdf_bytes(data):
    """Generate PDF using ReportLab - ONLY includes content captured during live meeting"""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
        from reportlab.lib.units import inch
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                               rightMargin=72, leftMargin=72,
                               topMargin=72, bottomMargin=18)
        
        styles = getSampleStyleSheet()
        story = []
        
        # Title - ONLY if provided
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor='#667eea',
            spaceAfter=30,
            alignment=TA_CENTER
        )
        story.append(Paragraph(f"📝 {data.get('title', 'Meeting Notes')}", title_style))
        story.append(Spacer(1, 12))
        
        # Metadata - ONLY what was captured
        meta_style = ParagraphStyle('Meta', parent=styles['Normal'], fontSize=10, textColor='#666666', spaceAfter=20)
        
        if data.get('date'):
            # Attempt nicer date formatting if ISO-like
            date_val = data['date']
            fmt_date = date_val
            try:
                from datetime import datetime
                fmt_date = datetime.fromisoformat(date_val.replace('Z','+00:00')).strftime('%Y-%m-%d %H:%M')
            except Exception:
                pass
            story.append(Paragraph(f"<b>Date:</b> {fmt_date}", meta_style))
        if data.get('duration') and data['duration'] > 0:
            duration_str = format_duration(data['duration'])
            story.append(Paragraph(f"<b>Duration:</b> {duration_str}", meta_style))

        # Series context (if provided)
        if data.get('series_id'):
            series_line = f"Series: {data['series_id']}"
            if data.get('series_rank') is not None:
                series_line += f" (Meeting #{data['series_rank']})"
            story.append(Paragraph(series_line, meta_style))
        
        story.append(Spacer(1, 20))
        
        # Summary - ONLY if AI generated one from live transcript
        if data.get('summary') and data['summary'].strip() and data['summary'] != 'Meeting captured successfully':
            story.append(Paragraph("📋 Summary", styles['Heading2']))
            story.append(Spacer(1, 12))
            story.append(Paragraph(data['summary'], styles['Normal']))
            story.append(Spacer(1, 20))
        
        # Decisions - ONLY if captured during meeting
        if data.get('decisions') and len(data['decisions']) > 0:
            story.append(Paragraph("✅ Key Decisions", styles['Heading2']))
            story.append(Spacer(1, 12))
            for decision in data['decisions']:
                if decision.strip():  # Only non-empty decisions
                    story.append(Paragraph(f"• {decision}", styles['Normal']))
                    story.append(Spacer(1, 6))
            story.append(Spacer(1, 20))
        
        # Action Items - ONLY if captured during meeting
        if data.get('action_items') and len(data['action_items']) > 0:
            story.append(Paragraph("📌 Action Items", styles['Heading2']))
            story.append(Spacer(1, 12))
            for item in data['action_items']:
                if item.strip():  # Only non-empty items
                    story.append(Paragraph(f"• {item}", styles['Normal']))
                    story.append(Spacer(1, 6))
            story.append(Spacer(1, 20))

        # Topics - ONLY if captured/extracted
        if data.get('topics') and len(data['topics']) > 0:
            story.append(Paragraph("🧠 Topics", styles['Heading2']))
            story.append(Spacer(1, 12))
            for topic in data['topics']:
                if isinstance(topic, str) and topic.strip():
                    story.append(Paragraph(f"• {topic.strip()}", styles['Normal']))
                    story.append(Spacer(1, 6))
            story.append(Spacer(1, 20))

        # Speakers map (derived or provided)
        speakers = data.get('speakers') or []
        if not speakers and data.get('transcript'):
            # Derive speakers from transcript lines of form "Speaker: text"
            derived = []
            for line in data['transcript'].split('\n'):
                if ':' in line:
                    speaker = line.split(':',1)[0].strip()
                    if speaker and speaker not in derived:
                        derived.append(speaker)
                        if len(derived) >= 25:  # cap to prevent overflow
                            break
            speakers = derived
        if speakers:
            story.append(Paragraph("👥 Speakers", styles['Heading2']))
            story.append(Spacer(1, 12))
            for s in speakers:
                story.append(Paragraph(f"• {s}", styles['Normal']))
                story.append(Spacer(1, 4))
            story.append(Spacer(1, 20))
        
        # Transcript - ONLY actual captured transcript from live meeting
        if data.get('transcript') and data['transcript'].strip():
            story.append(PageBreak())
            story.append(Paragraph("💬 Live Meeting Transcript", styles['Heading2']))
            story.append(Spacer(1, 12))
            
            transcript_style = ParagraphStyle('Transcript', parent=styles['Normal'], fontSize=9, leading=12)
            
            for line in data['transcript'].split('\n'):
                if line.strip():  # Only non-empty lines
                    story.append(Paragraph(line, transcript_style))
                    story.append(Spacer(1, 4))
        
        # If NO content was captured, add a note
        no_transcript = (not data.get('transcript')) or (isinstance(data.get('transcript'), str) and not data.get('transcript').strip())
        no_summary = not data.get('summary')
        no_decisions = not (data.get('decisions') and any(isinstance(d, str) and d.strip() for d in data.get('decisions', [])))
        no_actions = not (data.get('action_items') and any(isinstance(a, str) and a.strip() for a in data.get('action_items', [])))
        no_topics = not (data.get('topics') and any(str(t).strip() for t in data.get('topics', [])))
        if no_transcript and no_summary and no_decisions and no_actions and no_topics:
            story.append(Paragraph("⚠️ No live content captured for this meeting", styles['Normal']))
        
        doc.build(story)
        return buffer.getvalue()
        
    except Exception as e:
        raise Exception(f"PDF generation failed: {str(e)}")

def format_duration(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours}h {minutes}m {secs}s"
    elif minutes > 0:
        return f"{minutes}m {secs}s"
    else:
        return f"{secs}s"


class MeetingViewSet(viewsets.ModelViewSet):
    """ViewSet for Meeting CRUD operations"""
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MeetingCreateSerializer
        return MeetingSerializer
    
    def create(self, request):
        """Create new meeting"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        meeting = serializer.save()
        
        # Create search indices
        self._create_search_indices(meeting)
        
        return Response(
            MeetingSerializer(meeting).data,
            status=status.HTTP_201_CREATED
        )
    
    def _create_search_indices(self, meeting):
        """Create search indices for meeting"""
        SearchIndex.objects.create(
            meeting=meeting,
            content=meeting.title,
            content_type='title'
        )
        
        if meeting.summary:
            SearchIndex.objects.create(
                meeting=meeting,
                content=meeting.summary,
                content_type='summary'
            )
        
        for decision in meeting.decisions:
            SearchIndex.objects.create(
                meeting=meeting,
                content=decision,
                content_type='decision'
            )
        
        for action_item in meeting.action_items:
            SearchIndex.objects.create(
                meeting=meeting,
                content=action_item,
                content_type='action_item'
            )
    
    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Upload meeting with transcript chunks"""
        meeting_data = request.data.get('meeting_data', {})
        
        # Parse if string
        if isinstance(meeting_data, str):
            import json
            meeting_data = json.loads(meeting_data)
        
        serializer = MeetingCreateSerializer(data=meeting_data)
        serializer.is_valid(raise_exception=True)
        meeting = serializer.save()
        
        # Create search indices
        self._create_search_indices(meeting)
        
        return Response({
            'status': 'success',
            'meeting_id': meeting.meeting_id,
            'id': meeting.id
        })
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent meetings"""
        limit = int(request.query_params.get('limit', 10))
        meetings = self.queryset[:limit]
        serializer = self.get_serializer(meetings, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_transcript(self, request, pk=None):
        """Add transcript chunk to meeting"""
        meeting = self.get_object()
        
        TranscriptChunk.objects.create(
            meeting=meeting,
            speaker=request.data.get('speaker', 'Unknown'),
            text=request.data.get('text', ''),
            timestamp=request.data.get('timestamp', datetime.now()),
            sequence=request.data.get('sequence', 0)
        )
        
        return Response({'status': 'success'})


@api_view(['POST'])
def generate_pdf(request):
    """Generate PDF from meeting data"""
    serializer = PDFGenerationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    try:
        pdf_bytes = generate_pdf_bytes(serializer.validated_data)
        
        safe_filename = serializer.validated_data['title'].replace(' ', '_').replace('/', '_')
        
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="meeting_{safe_filename}.pdf"'
        return response
        
    except Exception as e:
        return Response(
            {'error': f'PDF generation failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def search_meetings(request):
    """Search meetings"""
    serializer = SearchSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    query = serializer.validated_data['query']
    content_types = serializer.validated_data.get('content_types', [])
    
    # Search in search index
    search_results = SearchIndex.objects.filter(
        content__icontains=query
    )
    
    if content_types:
        search_results = search_results.filter(content_type__in=content_types)
    
    # Get unique meetings
    meeting_ids = search_results.values_list('meeting_id', flat=True).distinct()
    meetings = Meeting.objects.filter(id__in=meeting_ids)
    
    serializer = MeetingSerializer(meetings, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({
        'status': 'healthy',
        'service': 'MemoSphere Django Backend',
        'database': 'sqlite',
        'meetings_count': Meeting.objects.count()
    })


@api_view(['POST'])
def upload_meeting(request):
    """Upload a completed meeting with PDF"""
    try:
        data = request.data
        # Normalize start_time
        start_time = datetime.now()
        if data.get('date'):
            try:
                start_time = datetime.fromisoformat(str(data['date']).replace('Z','+00:00'))
            except Exception:
                pass

        import uuid
        meeting_id = data.get('meeting_id') or f"upload_{uuid.uuid4().hex[:12]}"

        platform_raw = data.get('platform', '')
        platform = 'other'
        pr = str(platform_raw).lower()
        if 'google' in pr: platform = 'google_meet'
        elif 'zoom' in pr: platform = 'zoom'
        elif 'team' in pr: platform = 'teams'

        meeting = Meeting.objects.create(
            meeting_id=meeting_id,
            title=data.get('title', 'Untitled Meeting'),
            platform=platform,
            start_time=start_time,
            end_time=None,
            duration=int(data.get('duration', 0)) or 0,
            transcript=data.get('transcript', [] if isinstance(data.get('transcript'), list) else data.get('transcript', '')),
            summary=data.get('summary', ''),
            decisions=data.get('decisions', []) or [],
            action_items=data.get('action_items', []) or [],
            participants=data.get('participants', []) or [],
            structured_data=data.get('structured_data', {}) or {}
        )
        
        # Create transcript chunks if provided
        chunks = data.get('transcript_chunks', [])
        for chunk in chunks:
            TranscriptChunk.objects.create(
                meeting=meeting,
                speaker=chunk.get('speaker', 'Unknown'),
                text=chunk.get('text', ''),
                timestamp=chunk.get('timestamp', 0)
            )
        
        # Create granular search indices (title, summary, decisions, action items, transcript)
        SearchIndex.objects.create(meeting=meeting, content=meeting.title, content_type='title')
        if meeting.summary:
            SearchIndex.objects.create(meeting=meeting, content=meeting.summary, content_type='summary')
        for decision in meeting.decisions:
            if isinstance(decision, str) and decision.strip():
                SearchIndex.objects.create(meeting=meeting, content=decision.strip(), content_type='decision')
        for item in meeting.action_items:
            if isinstance(item, str) and item.strip():
                SearchIndex.objects.create(meeting=meeting, content=item.strip(), content_type='action_item')
        # Transcript indexing (limit for performance)
        if isinstance(meeting.transcript, str) and meeting.transcript.strip():
            lines = meeting.transcript.strip().split('\n')[:200]
            SearchIndex.objects.create(meeting=meeting, content='\n'.join(lines), content_type='transcript')
        elif isinstance(meeting.transcript, list) and meeting.transcript:
            collected = []
            for entry in meeting.transcript[:200]:
                if isinstance(entry, dict):
                    speaker = entry.get('speaker','Unknown')
                    text = entry.get('text','')
                    if text.strip():
                        collected.append(f"{speaker}: {text.strip()}")
                elif isinstance(entry, str) and entry.strip():
                    collected.append(entry.strip())
            if collected:
                SearchIndex.objects.create(meeting=meeting, content='\n'.join(collected), content_type='transcript')
        
        serializer = MeetingSerializer(meeting)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': f'Upload failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def transcribe_audio(request):
    """Transcribe audio using faster-whisper (4x faster than openai-whisper)"""
    try:
        from faster_whisper import WhisperModel
        import tempfile
        import os
        
        # Get audio file from request
        if 'audio' not in request.FILES:
            return Response({
                'error': 'No audio file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        audio_file = request.FILES['audio']
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp_file:
            for chunk in audio_file.chunks():
                tmp_file.write(chunk)
            tmp_path = tmp_file.name
        
        try:
            # Load faster-whisper model (medium for better accuracy, still 4x faster)
            # Uses CTranslate2 for optimized inference
            model = WhisperModel("medium", device="cpu", compute_type="int8")
            
            # Transcribe - returns generator of segments
            segments, info = model.transcribe(tmp_path, language="en")
            
            # Collect segments and full text
            segment_list = []
            full_text = []
            
            for segment in segments:
                segment_list.append({
                    'start': segment.start,
                    'end': segment.end,
                    'text': segment.text
                })
                full_text.append(segment.text)
            
            return Response({
                'text': ' '.join(full_text),
                'segments': segment_list,
                'language': info.language,
                'duration': info.duration
            })
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        return Response({
            'error': f'Transcription failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def transcribe_audio_whispercpp(request):
    """Transcribe audio using local whisper.cpp binary.

    Strategy:
    - Save uploaded audio to a temp file
    - If FFmpeg exists, convert to 16kHz mono WAV for maximum compatibility
    - Invoke whisper.cpp main binary with -otxt and parse the output file
    - Return text + simple segment list (single blob when using txt output)
    - Fallback: if binary/model missing, return 503 so client can try alternative
    """
    try:
        # Validate upload
        if 'audio' not in request.FILES:
            return Response({'error': 'No audio file provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve whisper.cpp paths
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        whisper_root = os.path.join(repo_root, 'whisper.cpp')

        # Candidate binaries (Windows Release/Debug names vary); check common patterns
        bin_candidates = [
            os.path.join(whisper_root, 'build', 'bin', 'main.exe'),
            os.path.join(whisper_root, 'build', 'bin', 'whisper.exe'),
            os.path.join(whisper_root, 'build', 'bin', 'main'),
            os.path.join(whisper_root, 'build', 'bin', 'whisper'),
        ]
        whisper_bin = next((p for p in bin_candidates if os.path.exists(p)), None)

        if whisper_bin is None:
            return Response({
                'error': 'whisper.cpp binary not found. Build it first.',
                'hint': 'From whisper.cpp folder: cmake -B build -S . ; cmake --build build --config Release',
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Model resolution: prefer base.en if present, else any *.bin
        model_dir = os.path.join(whisper_root, 'models')
        preferred = ['ggml-base.en.bin', 'ggml-small.en.bin', 'ggml-tiny.en.bin', 'ggml-medium.en.bin', 'ggml-large-v3.bin']
        model_path = None
        for name in preferred:
            p = os.path.join(model_dir, name)
            if os.path.exists(p):
                model_path = p
                break
        if model_path is None:
            # Fallback to any bin in models
            bins = glob.glob(os.path.join(model_dir, '*.bin'))
            if bins:
                model_path = bins[0]
        if model_path is None:
            return Response({
                'error': 'No whisper.cpp model found in whisper.cpp/models/.',
                'hint': 'Download a model, e.g., ggml-base.en.bin into whisper.cpp/models',
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Save incoming audio to temp
        audio_file = request.FILES['audio']
        with tempfile.TemporaryDirectory() as td:
            src_path = os.path.join(td, 'in.webm')
            with open(src_path, 'wb') as f:
                for chunk in audio_file.chunks():
                    f.write(chunk)

            # Convert to wav if ffmpeg is available; improves compatibility
            dst_path = os.path.join(td, 'in.wav')
            ffmpeg = shutil.which('ffmpeg') or shutil.which('ffmpeg.exe')
            wav_input = src_path
            if ffmpeg:
                try:
                    subprocess.run([
                        ffmpeg, '-y', '-i', src_path,
                        '-ar', '16000', '-ac', '1', dst_path
                    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    wav_input = dst_path
                except Exception:
                    # Fallback to original if conversion failed
                    wav_input = src_path

            out_prefix = os.path.join(td, 'out')

            # Build command
            cmd = [
                whisper_bin,
                '-m', model_path,
                '-f', wav_input,
                '-of', out_prefix,
                '-osrt',            # produce SRT for segmentation
                '-oj',              # also produce JSON file with segments
                '-np',              # no progress in stdout
                '-l', 'en',         # language hint
                '-bs', '5',         # beam size for better decoding quality
                '-otxt'             # still produce plain text for backward compatibility
            ]

            try:
                subprocess.run(cmd, check=True, cwd=whisper_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            except subprocess.CalledProcessError as e:
                return Response({
                    'error': 'whisper.cpp failed',
                    'stderr': e.stderr.decode(errors='ignore')[-2000:],
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Read plain text output
            txt_path = out_prefix + '.txt'
            text = ''
            if os.path.exists(txt_path):
                with open(txt_path, 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read().strip()

            # Parse JSON segments if available
            json_path = out_prefix + '.json'
            segments = []
            if os.path.exists(json_path):
                try:
                    import json as _json
                    with open(json_path, 'r', encoding='utf-8', errors='ignore') as jf:
                        data_json = _json.load(jf)
                    for seg in data_json.get('segments', []):
                        segments.append({
                            'start': seg.get('start', 0.0),
                            'end': seg.get('end', None),
                            'text': seg.get('text', '').strip()
                        })
                    # If text empty, rebuild from segments
                    if not text and segments:
                        text = ' '.join(s['text'] for s in segments if s['text'])
                except Exception:
                    pass

            # Fallback: if still no text, send error
            if not text:
                return Response({'error': 'No transcription output produced'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            if not segments:
                # provide single segment fallback
                segments = [{ 'start': 0.0, 'end': None, 'text': text }]

            return Response({
                'text': text,
                'segments': segments,
                'engine': 'whisper.cpp',
                'model': os.path.basename(model_path),
                'beam_size': 5
            })

    except Exception as e:
        return Response({'error': f'Transcription failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
