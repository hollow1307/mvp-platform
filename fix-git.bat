@echo off
chcp 65001 >nul
echo 🚀 Исправление Git проблем
echo.

echo 📁 Добавление всех изменений в Git...
git add .

echo 💾 Создание коммита с изменениями...
git commit -m "Add all changes including frontend folder"

echo 📤 Отправка изменений в GitHub...
git push origin main

echo.
echo ✅ Все изменения загружены в GitHub!
echo 🌐 Проверьте: https://github.com/hollow1307/mvp-platform
echo.
pause
