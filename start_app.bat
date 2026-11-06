@echo off
echo ========================================================
echo Starting RoomVision AI (Backend + Frontend)
echo Assessment for iTileswale Private Limited
echo ========================================================

echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "RoomVision Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak > nul

echo Starting Vite React Frontend on http://localhost:5173 ...
start "RoomVision Frontend" cmd /k "cd frontend && npm run dev"

echo ========================================================
echo Both servers are launching!
echo Backend API:  http://127.0.0.1:8000/docs
echo Frontend App: http://localhost:5173
echo ========================================================
pause

