# 3D Printer Management System

Система управления 3D-принтерами с функциями отслеживания заданий печати, мониторинга состояния принтеров и генерации отчетов.

## Структура проекта

Проект состоит из двух основных частей:
- **Backend**: FastAPI приложение (Python)
- **Frontend**: React приложение (JavaScript/TypeScript)

## Требования

### Backend
- Python 3.8 или выше
- PostgreSQL (или SQLite для тестирования)
- Зависимости из `backend/requirements.txt`

### Frontend
- Node.js 14 или выше
- npm или yarn
- Зависимости из `frontend/package.json`

## Установка и запуск

### Установка зависимостей для Backend

```bash
cd backend
pip install -r requirements.txt
```

### Установка зависимостей для Frontend

```bash
cd frontend
npm install
```

### Запуск приложения

Вы можете запустить оба сервера одновременно с помощью скрипта `start_app.bat` (Windows) или вручную запустить каждый сервер по отдельности:

#### Backend

```bash
cd backend
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd frontend
npm start
```

## Доступ к приложению

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Документация API: http://localhost:8000/docs

## Функциональность

### Backend API

- `/printers` - управление принтерами
- `/models` - управление моделями
- `/printings` - управление заданиями печати
- `/reports` - статистика и отчеты

### Frontend

- Дашборд с общим статусом принтеров
- Управление принтерами (добавление, просмотр, контроль)
- Управление заданиями печати
- Управление моделями
- Отчеты и статистика

## Устранение проблем

### База данных

По умолчанию используется SQLite. Если вы хотите использовать PostgreSQL, измените настройки в `backend/database.py`.

### CORS

Если возникают проблемы с CORS, убедитесь, что правильные origin'ы добавлены в список `origins` в `backend/app.py`.

### Прокси для разработки

В `frontend/package.json` настроен прокси на `http://localhost:8000`, что позволяет избежать проблем с CORS во время разработки. 

# build exe
pyinstaller --onefile --windowed --icon=printer_icon.ico desktop_client.py

# printers endpoints

get gcodes:         /server/files/list?root=gcodes
get status printer: /printer/objects/query