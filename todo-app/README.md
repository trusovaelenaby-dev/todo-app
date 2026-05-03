# Мои задачи — Ежедневный планировщик

## Запуск локально

```bash
npm install
npm run dev
```

Открой http://localhost:5173

## Деплой на Vercel (рекомендуется)

1. Зарегистрируйся на https://vercel.com
2. Установи Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. В папке проекта:
   ```bash
   vercel
   ```
4. Следуй инструкциям — через 1 минуту получишь ссылку вида `https://todo-app-xxx.vercel.app`

## Деплой на Netlify

1. Зарегистрируйся на https://netlify.com
2. Собери проект:
   ```bash
   npm run build
   ```
3. Перетащи папку `dist/` на https://app.netlify.com/drop

Или через Netlify CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

## Деплой через GitHub (автоматический)

1. Создай репозиторий на GitHub и запушь код
2. Зайди на vercel.com или netlify.com
3. Нажми "Import from GitHub" → выбери репозиторий
4. Vercel/Netlify сами соберут и задеплоят проект
5. Каждый push в main будет автоматически деплоиться

## Структура проекта

```
todo-app/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    └── App.jsx     ← весь код приложения
```
