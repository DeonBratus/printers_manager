# Используем официальный образ Python
FROM python:3.9-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем необходимые системные зависимости
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копируем файлы зависимостей
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Копируем код приложения
COPY . .

# Пользовательские переменные окружения
ENV ALLOW_CORS=true
ENV CORS_ALLOW_ORIGINS="*"
ENV CORS_ALLOW_CREDENTIALS=true
ENV CORS_ALLOW_METHODS="GET,POST,PUT,DELETE,OPTIONS"
ENV CORS_ALLOW_HEADERS="*"
ENV PYTHONIOENCODING=utf-8

# Экспонируем порт
EXPOSE 8000

# Запускаем приложение
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]