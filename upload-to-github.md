# 📤 Загрузка проекта в GitHub

## 🎯 Быстрый способ

### 1. Создайте репозиторий на GitHub
- Перейдите на https://github.com/new
- Название: `mvp-platform`
- Описание: `Платформа для организации турниров по Dota 2`
- Сделайте **Public**
- **НЕ** добавляйте README, .gitignore, лицензию

### 2. Выполните команды в терминале

```bash
# Инициализация Git
git init

# Добавление всех файлов
git add .

# Первый коммит
git commit -m "Initial commit: MVP Platform setup"

# Переименование ветки в main
git branch -M main

# Подключение к GitHub (замените USERNAME на ваш)
git remote add origin https://github.com/USERNAME/mvp-platform.git

# Загрузка в GitHub
git push -u origin main
```

### 3. Проверьте результат
- Перейдите на https://github.com/USERNAME/mvp-platform
- Вы должны увидеть все папки: `backend/`, `frontend/`, файлы и т.д.

## 🔍 Если папка frontend не отображается

### Возможные причины:
1. **Файлы не добавлены в Git** - проверьте `.gitignore`
2. **Папка пустая** - добавьте файл в папку
3. **Проблемы с кодировкой** - переименуйте папку

### Решение:
```bash
# Проверьте статус
git status

# Если папка игнорируется, проверьте .gitignore
cat .gitignore

# Принудительно добавьте папку
git add frontend/ -f
git commit -m "Add frontend folder"
git push
```

## 🎉 После успешной загрузки

Теперь вы сможете:
- Кликать на папку `frontend` и видеть её содержимое
- Создавать Issues и Pull Requests
- Приглашать разработчиков в команду
- Использовать GitHub Pages для демо

## 📞 Если что-то не работает

1. Проверьте, что все файлы добавлены: `git status`
2. Убедитесь, что нет ошибок: `git log`
3. Проверьте подключение: `git remote -v`
