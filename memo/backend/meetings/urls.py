from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'meetings', views.MeetingViewSet, basename='meeting')

urlpatterns = [
    path('', include(router.urls)),
    # Accept both with and without trailing slash for robustness
    path('generate-pdf', views.generate_pdf, name='generate-pdf'),
    path('generate-pdf/', views.generate_pdf, name='generate-pdf-slash'),
    path('upload', views.upload_meeting, name='upload'),
    path('upload/', views.upload_meeting, name='upload-slash'),
    path('search', views.search_meetings, name='search'),
    path('search/', views.search_meetings, name='search-slash'),
    path('transcribe', views.transcribe_audio, name='transcribe'),
    path('transcribe/', views.transcribe_audio, name='transcribe-slash'),
    path('transcribe-whispercpp', views.transcribe_audio_whispercpp, name='transcribe-whispercpp'),
    path('transcribe-whispercpp/', views.transcribe_audio_whispercpp, name='transcribe-whispercpp-slash'),
    path('health', views.health_check, name='health'),
    path('health/', views.health_check, name='health-slash'),
]
