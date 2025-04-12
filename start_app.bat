@echo off
echo Starting 3D Printer Management System...
echo.

REM Start the backend server
start cmd /k "cd backend && python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start the frontend development server
start cmd /k "cd frontend && npm start"

echo Both servers are starting...
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause >nul 