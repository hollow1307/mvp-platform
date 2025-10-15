@echo off
echo 🚀 Настройка Git для проекта MVP Platform
echo.

echo 📁 Инициализация Git репозитория...
git init

echo 📝 Добавление всех файлов...
git add .

echo 💾 Создание первого коммита...
git commit -m "Initial commit: MVP Platform setup with frontend and backend"

echo 🌿 Создание основной ветки...
git branch -M main

echo.
echo ✅ Git настроен! Теперь добавьте remote origin:
echo git remote add origin https://github.com/hollow1307/mvp-platform.git
echo git push -u origin main
echo.
pause
