# InstaMe

InstaMe este o aplicatie Expo + Express care transforma imagini in stil **old money luxury** folosind Gemini image generation, cu autentificare reala si plati Stripe.

## Functionalitati principale

- Login/Register cu email + Google + Apple (implementare reala, server-side sessions + refresh tokens)
- Plati reale Stripe pentru pachete de credite/subscriptii
- Endpoint dedicat pentru transformare imagini:
  - `POST /api/instame/transform`
  - consuma credite
  - face refund automat daca generarea esueaza
  - foloseste model Gemini image real
- Ecran nou principal `InstaMe` pentru:
  - upload imagine
  - setare intensitate (soft/editorial/dramatic)
  - prompt optional
  - rezultat + download/share

## Setup rapid

1. Creeaza `.env` pe baza `.env.example`.
2. Instaleaza pachete:

```bash
npm install
```

3. Aplica schema in DB:

```bash
npm run db:push
```

4. Porneste backend:

```bash
npm run server:dev
```

5. Porneste frontend Expo:

```bash
npm run start
```

## Deploy pe Railway

Repo-ul este pregatit pentru Railway cu:

- [`railway.json`](./railway.json) (build/start/healthcheck)
- [`Procfile`](./Procfile) fallback
- Health endpoint: `GET /api/health`

### Pasii in Railway

1. Creezi proiect nou din acest repo.
2. Adaugi serviciu PostgreSQL (sau conectezi DB externa).
3. Setezi variabilele de mediu minime:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `GEMINI_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `PUBLIC_WEB_URL` = URL-ul public Railway (ex: `https://instame-production.up.railway.app`)
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (obligatoriu daca vrei Google auth pe web)
4. Optional pentru CORS:
   - `CORS_ORIGINS` (lista separata prin virgula)
   - `CORS_ALLOW_ALL=true` (doar temporar pentru debugging)
5. Rulezi migrarea o singura data cu `npm run db:push` (din Railway shell sau local, pe `DATABASE_URL` de productie).

Comenzile de deploy sunt deja definite:

- Build: `npm run build:railway` (exporta web app + build backend)
- Start: `npm run start:railway`

## Endpoint InstaMe

Request:

```json
{
  "photo": { "base64": "...", "mimeType": "image/jpeg" },
  "customPrompt": "optional",
  "intensity": "soft | editorial | dramatic",
  "preserveBackground": true
}
```

Response:

```json
{
  "imageBase64": "...",
  "creditsCharged": 5,
  "creditsRemaining": 12,
  "model": "gemini-3.1-flash-image-preview"
}
```
