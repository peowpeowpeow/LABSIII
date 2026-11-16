# Платформа донорства крови

Курсовой проект: Node.js + Express + PostgreSQL (Sequelize) + MongoDB (Mongoose) + Socket.IO, клиент — React (Vite).

## Запуск в Docker (лабораторная работа 8)

Нужен только Docker Desktop. Для РБ в Settings → Docker Engine добавить зеркала:
"registry-mirrors": ["https://mirror.gcr.io", "https://dockerhub.timeweb.cloud"]

1. Скопировать `.env.example` в `.env` и заполнить POSTGRES_PASSWORD и JWT_SECRET.
2. Собрать и запустить:
   docker compose up --build
3. Во втором терминале заполнить базы тестовыми данными:
   docker compose exec backend npx sequelize-cli db:seed:all
   docker compose exec backend node mongo/seed.js
4. Зарегистрировать пользователя: POST http://localhost:3000/auth/register
   с полями email и password (не менее 8 символов, заглавная буква и цифра).
5. Открыть http://localhost.

| Сервис | Образ | Порт |
|---|---|---|
| frontend | React + nginx:1.27-alpine (reverse-proxy на backend) | 80 |
| backend | node:22-alpine, server.js | 3000 |
| postgres | postgres:16-alpine, том pgdata | — |
| mongo | mongo:7, том mongodata | — |

Проверка состояния: http://localhost:3000/health. Остановка: docker compose down
(с флагом -v удаляются и данные баз).

## Запуск без Docker

1. PostgreSQL: база `blood_donation`, параметры — в `config/config.json`.
2. В корне: npm install, npx sequelize-cli db:migrate, npx sequelize-cli db:seed:all.
3. В `.env` указать MONGO_URI (Atlas или mongodb://127.0.0.1:27017/blood_donation).
4. Сервер: npm run dev (http://localhost:3000).
5. Клиент: в папке client — npm install, npm run dev (http://localhost:5173).

## Ветки

lab21–lab28 — лабораторные работы 1–8.
