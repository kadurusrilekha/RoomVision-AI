# PowerShell startup script for RoomVision AI
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting RoomVision AI (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "Assessment for iTileswale Private Limited" -ForegroundColor DarkGray
Write-Host "========================================================" -ForegroundColor Cyan

# Start Backend
Write-Host "Launching FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Launching Vite React Frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "Both servers have been launched in separate terminal windows!" -ForegroundColor Green
Write-Host "Web Application: http://localhost:5173" -ForegroundColor White
Write-Host "API Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan

