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
  - foloseste automat style references din `assets/style-references` (stil/vibe/aesthetic/gender tags)
- Librarie vizuala de stil:
  - 110 imagini importate din `C:\Users\stiul\OneDrive\Pictures\Screenshots\Styles`
  - metadata multi-label in `assets/style-references/library.json`
  - endpoint de inspectie: `GET /api/instame/style-library`
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
   - `OPENAI_API_KEY`
   - `TOGETHER_API_KEY`
   - `REVE_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `PUBLIC_WEB_URL` = URL-ul public Railway (ex: `https://instame-production.up.railway.app`)
   - `PUBLIC_APP_URL` = acelasi URL public Railway, folosit pentru imagini private temporare in Together
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (obligatoriu daca vrei Google auth pe web)
   - optional pentru Reve:
     - `REVE_API_BASE_URL=https://api.reve.com`
     - `REVE_EDIT_VERSION_REVE_V1_1_PREVIEW=latest-fast`
     - `REVE_EDIT_VERSION_REVE_V1_1_HIGH_RES=latest`
4. Optional pentru CORS:
   - `CORS_ORIGINS` (lista separata prin virgula)
   - `CORS_ALLOW_ALL=true` (doar temporar pentru debugging)
5. Nu e nevoie de Railway shell pentru migrare: `start:railway` ruleaza automat:
   - `npm run db:prepare` (asigura `pgcrypto`)
   - `npm run db:push`
   - `npm run server:prod`

### Resetare parola pe email

Pentru forgot-password securizat, mai ai nevoie de:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Setup complet aici:

- [`docs/password-reset-railway-setup.md`](./docs/password-reset-railway-setup.md)

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

## Prompt-Only Style Presets

Stilurile importate din `assets/instame-style-presets` pot avea propriul `Prompt.txt`, cu modelul implicit specificat in acel fisier.

- La prima utilizare a unui stil: aplicatia poate folosi flow cu style references.
- De la a doua utilizare a aceluiasi stil: aplicatia foloseste promptul din folderul stilului.
- Modelul implicit este luat in ordinea definita in `Prompt.txt`.
- Daca promptul cere `Reve v1.1`, backendul foloseste direct `Reve API` pentru `image edit`, pastrand fotografia userului ca sursa de identitate.

Response:

```json
{
  "imageBase64": "...",
  "creditsCharged": 5,
  "creditsRemaining": 12,
  "model": "gemini-3.1-flash-image-preview",
  "styleReferenceIds": ["style_ref_004", "style_ref_072"]
}
```

## Import Style Dataset

Pentru a reimporta setul de imagini de stil:

```powershell
python scripts\import_style_references.py --source "C:\Users\stiul\OneDrive\Pictures\Screenshots\Styles"
```

Detalii despre structura sunt in `assets/style-references/README.md`.
