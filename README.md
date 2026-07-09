# EasyGenerator Auth Task

Full-stack authentication module built for the EasyGenerator technical task.

The app includes a NestJS API, MongoDB persistence, React TypeScript frontend, signup/signin forms, access tokens, refresh token rotation, and one protected application page.

## Tech Stack

- Backend: NestJS, Mongoose, Passport JWT, bcrypt, class-validator
- Frontend: React, TypeScript, Vite, React Router, React Hook Form, Zod, Axios
- Database: MongoDB

## Project Structure

```text
backend/   NestJS API
frontend/  React application
AI.md      AI usage notes required by the task
```

## Prerequisites

- Node.js 20+
- npm
- MongoDB connection string, either local MongoDB or MongoDB Atlas

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

Update `backend/.env` before starting:

```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
JWT_ACCESS_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<long-random-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

Do not commit real credentials or JWT secrets.

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Default frontend env:

```env
VITE_API_URL=http://localhost:3000
```

Open:

```text
http://localhost:5173
```

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/signup` | Create user and start session |
| `POST` | `/auth/signin` | Sign in and start session |
| `POST` | `/auth/refresh` | Rotate refresh token and return a new access token |
| `POST` | `/auth/logout` | Clear refresh token and end session |
| `GET` | `/me` | Protected route returning the welcome message |

The refresh token is stored in an `httpOnly` cookie. The access token is returned to the frontend and sent as a Bearer token.

## Validation Rules

Signup requires:

- valid email format
- name with at least 3 characters
- password with at least 8 characters
- password includes at least one letter
- password includes at least one number
- password includes at least one special character

The frontend validates these rules live while typing, and the backend enforces the same rules.

## Manual Test Flow

1. Start the backend on `http://localhost:3000`.
2. Start the frontend on `http://localhost:5173`.
3. Visit `/signup`.
4. Confirm validation errors appear while typing invalid fields.
5. Create an account.
6. Confirm redirect to `/app`.
7. Confirm the protected page shows `Welcome to the application.`
8. Log out.
9. Sign in again with the same credentials.

## Verification Commands

```bash
cd backend
npm run build
npx eslint "src/**/*.ts"
npm run test:e2e
```

```bash
cd frontend
npm run build
npm run lint
```
