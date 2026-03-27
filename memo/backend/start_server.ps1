# Start MemoSphere Django Backend
Write-Host "🚀 Starting MemoSphere Django Backend..." -ForegroundColor Green
Write-Host ""

# Change to backend directory
Set-Location "c:\Users\aakas\Downloads\memo\backend"

# Check if database exists
if (!(Test-Path "db.sqlite3")) {
    Write-Host "📊 Creating database..." -ForegroundColor Yellow
    python manage.py migrate
    Write-Host ""
}

# Start Django server
Write-Host "✅ Django Backend Starting..." -ForegroundColor Green
Write-Host ""
Write-Host "📝 API Endpoints:" -ForegroundColor Cyan
Write-Host "  - Home: http://127.0.0.1:8000/" -ForegroundColor White
Write-Host "  - API: http://127.0.0.1:8000/api/" -ForegroundColor White
Write-Host "  - Health: http://127.0.0.1:8000/api/health/" -ForegroundColor White
Write-Host "  - Meetings: http://127.0.0.1:8000/api/meetings/" -ForegroundColor White
Write-Host "  - Generate PDF: http://127.0.0.1:8000/api/generate-pdf/" -ForegroundColor White
Write-Host "  - Search: http://127.0.0.1:8000/api/search/" -ForegroundColor White
Write-Host "  - Admin: http://127.0.0.1:8000/admin/" -ForegroundColor White
Write-Host ""
Write-Host "💾 Database: SQLite (db.sqlite3)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press CTRL+C to stop the server" -ForegroundColor Yellow
Write-Host ""

python manage.py runserver
