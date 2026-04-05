# Password Reset Setup on Railway

Status recomandat pentru launch-ul curent: suport-based temporary.

Adica:

- utilizatorul este directionat spre suport pentru recuperare parola
- flow-ul cu email reset prin Resend ramane pregatit, dar poate fi activat mai tarziu
- domeniul nou `chicoo.app` poate fi configurat dupa lansare, fara sa blocheze release-ul

Acest proiect are acum forgot-password sigur, bazat pe token trimis pe email.

Flow-ul implementat este:

1. Userul cere resetare din login.
2. Backend-ul genereaza un token temporar si il salveaza hash-uit in baza de date.
3. Backend-ul trimite email prin Resend.
4. Userul deschide linkul de resetare si seteaza o parola noua.

## Mod temporar de launch

Pentru launch-ul actual, poti lasa recuperarea parolei pe suport:

1. In ecranul de login, butonul de ajutor pentru parola trimite userul spre suport.
2. Schimbarea parolei pentru userii deja autentificati ramane disponibila in aplicatie.
3. Flow-ul complet cu email reset se activeaza doar cand ai domeniul si Resend configurate.

Asta iti permite sa lansezi acum, fara sa blochezi release-ul pe setup de domeniu/email.

## Ce trebuie configurat

### 1. Railway PostgreSQL

Aplicatia are nevoie de `DATABASE_URL` valid in Railway.

Fara acest env var:

- `npm run db:push` nu ruleaza
- coloanele noi pentru resetare parola nu pot fi create
- deploy-ul Railway nu va putea initializa schema noua

Coloanele noi adaugate in `users` sunt:

- `password_reset_token_hash`
- `password_reset_token_expires_at`

### 2. Resend

Aplicatia foloseste Resend pentru emailurile tranzactionale de resetare parola.

Env vars necesare in Railway:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Valoare recomandata pentru `RESEND_FROM_EMAIL`:

- `Chicoo <no-reply@instame.app>`

Sau, daca deja ai domeniul verificat cu alta adresa de trimitere:

- `Chicoo <support@instame.app>`

Important:

- domeniul din adresa `from` trebuie sa fie verificat in Resend
- daca domeniul nu este verificat, trimiterea va esua

### Recomandare pragmatica pentru launch

Daca vrei sa termini mai intai lansarea aplicatiei si sa cumperi mai tarziu domeniul `chicoo.app`, foloseste temporar:

- `RESEND_FROM_EMAIL=Chicoo <no-reply@instame.app>`

Asta este acceptabil pentru launch daca:

- numele expeditorului ramane `Chicoo`
- continutul emailului mentioneaza clar brandul Chicoo
- schimbi ulterior domeniul de trimitere dupa ce cumperi si verifici `chicoo.app`

Cand faci migrarea de brand pe domeniu propriu, tinta finala recomandata ramane:

- `RESEND_FROM_EMAIL=Chicoo <no-reply@chicoo.app>`

### 3. URL-uri publice corecte

Env vars recomandate in Railway:

- `PUBLIC_WEB_URL=https://instame.up.railway.app`
- `PUBLIC_APP_URL=https://instame.up.railway.app`

Reset link-ul foloseste in prezent URL web public, nu deep link nativ.

Asta inseamna ca emailul va trimite userul catre:

- `https://instame.up.railway.app/reset-password?email=...&token=...`

Route-ul exista deja in aplicatie prin:

- `app/(auth)/reset-password.tsx`

## Pasii exacți in Railway

### A. Adauga env vars

In serviciul web Railway, seteaza:

- `DATABASE_URL`
- `SESSION_SECRET`
- `PUBLIC_WEB_URL=https://instame.up.railway.app`
- `PUBLIC_APP_URL=https://instame.up.railway.app`
- `RESEND_API_KEY=...`
- `RESEND_FROM_EMAIL=Chicoo <no-reply@instame.app>`

Pastreaza si env vars deja folosite de aplicatie, daca exista:

- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `TOGETHER_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### B. Configureaza Resend

In Resend:

1. Adauga si verifica domeniul de email.
2. Creeaza API key pentru production.
3. Copiaza cheia in Railway la `RESEND_API_KEY`.
4. Seteaza `RESEND_FROM_EMAIL` cu o adresa din domeniul verificat.

### C. Redeploy

Nu trebuie sa rulezi shell manual daca `DATABASE_URL` este configurat.

La boot, Railway ruleaza deja:

1. `npm run db:prepare`
2. `npm run db:push`
3. `npm run server:prod`

Prin urmare, dupa ce pui env vars si faci deploy, schema ar trebui sa se actualizeze automat.

## Testare dupa deploy

Testeaza exact in ordinea asta:

1. Deschide login si apasa `Forgot password?`
2. Introdu un email real de cont `email/password`
3. Verifica faptul ca aplicatia raspunde cu mesaj de succes
4. Verifica inbox-ul
5. Deschide linkul primit
6. Seteaza o parola noua care trece toate criteriile
7. Verifica autentificarea cu noua parola
8. Verifica faptul ca parola veche nu mai functioneaza

## Ce se intampla daca ceva nu merge

### Daca primesti eroare la forgot-password

Verifica:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- domeniul verificat in Resend

### Daca deploy-ul pica la boot

Verifica:

- `DATABASE_URL`
- conectarea serviciului PostgreSQL in Railway

### Daca linkul din email se deschide dar nu merge resetarea

Verifica:

- `PUBLIC_WEB_URL`
- daca deploy-ul curent include noul ecran `reset-password`
- daca tabela `users` are coloanele noi pentru reset token

## Observatii importante

- Reset token-ul este salvat hash-uit, nu in clar.
- Token-ul expira dupa 1 ora.
- Dupa resetare, toate sesiunile userului sunt revocate.
- Change Password pentru user logat este separat de forgot-password.
- Conturile Apple/Google nu folosesc acest flow; ele raman pe sign-in social.