# LitperPro Semáforo IA — Guía completa para Claude Code

## Qué es esto
Dashboard logístico COD (Cash on Delivery) de **Litper Group LLC** (Wyoming LLC, EIN: 38-4366550).
E-commerce de textiles para el hogar (protectores de colchón, sábanas, cobijas) vendidos via WhatsApp + Meta Ads.
Países objetivo: Colombia (principal), Chile, Ecuador.
URL producción: https://litper-semaforo.vercel.app

Es un **sitio estático multi-página** (HTML/CSS/JS puro) servido desde `public/`, con un backend
ligero de **Vercel Serverless Functions** en `api/` para IA y pagos, y **Supabase** como Auth + base de datos.

## ⚠️ REGLAS CRÍTICAS DE NEGOCIO
- NUNCA usar "waterproof" o "impermeable" para protectores de colchón.
- Semáforo de ciudades: **verde ≥ 80.5%** entrega, **amarillo ≥ 70%**, **rojo < 70%**.
- CPA logístico = `$15.000 COP / tasa_entrega`.
- Meta tasa entrega: 85% objetivo (actual ~80.5%).
- Carriers Colombia: Coordinadora, Interrapidísimo, TCC, Envía.
- Carriers Chile: Chilexpress, Starken.
- **Mobile-first** — la mayoría de usuarios entra desde móvil via WhatsApp.

## Stack técnico
- **Frontend**: HTML/CSS/JS puro, sin framework ni bundler. Páginas en `public/`.
- **Backend**: Vercel Serverless Functions en `api/` (Node, ESM, `export default handler`).
- **Datos/Auth**: Supabase (Auth + PostgreSQL + RLS).
- **IA**: Gemini como modelo principal con **fallback a Groq**, via `/api/ai.js` y `/api/chat.js`.
- **Pagos**: Stripe Checkout (redirect) + webhook.
- **Deploy**: Vercel (Team: `team_NatP2ZfiRnuEUHoydeDtHX5C`). Push a la rama → deploy automático.
- **PWA**: `public/manifest.json` (standalone, theme `#00FF88`, start_url `/dashboard`).

## Estructura del repositorio
```
.
├── api/                       # Vercel Serverless Functions (backend)
│   ├── ai.js                  # Proxy IA single-shot (Gemini + Groq fallback)
│   ├── chat.js                # Proxy chat multi-turno (Gemini + Groq fallback)
│   ├── create-checkout.js     # Crea sesión de Stripe Checkout
│   └── stripe-webhook.js      # Webhook Stripe → actualiza plan en Supabase
├── public/                    # Sitio estático (outputDirectory en Vercel)
│   ├── index.html             # / — Landing principal (estilo Hormozi)
│   ├── landing.html           # Landing alterna (funnel + quiz)
│   ├── dashboard.html         # /dashboard — App: semáforo + analytics IA
│   ├── login.html             # /login — Auth Supabase
│   ├── pricing.html           # /pricing — Planes
│   ├── checkout.html          # /checkout — Checkout 3 pasos + Stripe
│   ├── profile.html           # /profile — Perfil + plan + equipo
│   ├── 404.html               # Fallback de rutas no encontradas
│   ├── manifest.json          # PWA manifest
│   ├── css/dashboard.css      # CSS extraído del dashboard (~69KB)
│   └── js/
│       ├── dashboard.js       # Lógica del dashboard (~258KB)
│       └── supabase-client.js # Helpers de auth + cliente Supabase
├── supabase/migrations/       # Esquema SQL (001 → 003)
├── vercel.json                # Rewrites, headers de seguridad (CSP), funciones
├── package.json               # Scripts npm + deps backend (stripe, supabase, micro)
├── .env.example               # Variables de entorno de referencia
├── BRAND_IDENTITY.md          # Guía de marca (colores, voz, tipografía)
└── README.md
```

## Páginas del ecosistema
| Archivo | Ruta | Descripción | Tamaño aprox. |
|---|---|---|---|
| `public/index.html` | `/` | Landing principal (hero, value stack, social proof, quiz) | ~394KB |
| `public/landing.html` | — | Landing/funnel alterna con quiz de autodescubrimiento | ~71KB |
| `public/dashboard.html` | `/dashboard` | App principal: semáforo + carriers + IA + upload Excel | ~215KB + css/js externos |
| `public/login.html` | `/login` | Auth Supabase (email/password + Google OAuth) | ~175KB |
| `public/pricing.html` | `/pricing` | Planes Starter/Pro/Enterprise | ~172KB |
| `public/checkout.html` | `/checkout` | Checkout 3 pasos + Stripe + confetti | ~194KB |
| `public/profile.html` | `/profile` | Perfil + plan + equipo | ~180KB |
| `public/404.html` | `/(.*)` | Página de error / fallback | ~3KB |

> ⚠️ **Nota sobre el dashboard**: a diferencia de las demás páginas (que llevan su CSS/JS inline),
> `dashboard.html` se apoya en `public/css/dashboard.css` y `public/js/dashboard.js` externos.
> Al modificar el dashboard, verifica cuál de los tres archivos contiene lo que buscas.

> ℹ️ Históricamente `dashboard.html` era el archivo más pesado (~485KB). Tras extraer su CSS/JS a
> archivos externos, el HTML bajó a ~215KB. `index.html` es ahora la página más grande.

### Routing (`vercel.json` → `rewrites`)
- `/dashboard` → `dashboard.html`
- `/landing` → `index.html`  ← (ojo: apunta a index, no a landing.html)
- `/checkout` → `checkout.html`
- `/login` → `login.html`
- `/pricing` → `pricing.html`
- `/profile` → `profile.html`
- `/(.*)` → `404.html` (catch-all)

### Headers de seguridad (`vercel.json` → `headers`)
- **CSP** restrictivo: `script-src` permite `js.stripe.com` y `cdn.jsdelivr.net`; `connect-src`
  permite Supabase, Anthropic, Gemini, OpenAI, Groq y Stripe. Si agregas una nueva API/CDN al
  frontend, **debes añadir su dominio al CSP** o el navegador la bloqueará.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (cámara/mic/geo off).
- `/api/*` con `Cache-Control: no-store`.
- Funciones serverless: `maxDuration: 30`.

## Backend — Vercel Serverless (`api/`)
Todas las funciones son ESM (`export default async function handler(req, res)`) y comparten un patrón:
1. **CORS restringido** via `ALLOWED_ORIGINS` (env var, lista separada por comas; fallback hardcoded
   a `litper-semaforo.vercel.app`, `litperpro.com`, `localhost:3000`).
2. **Verificación JWT**: extraen `Authorization: Bearer <token>` y lo validan contra
   `${SUPABASE_URL}/auth/v1/user` antes de procesar. Sin token / token inválido → 401.
3. Responden JSON.

| Endpoint | Método | Body | Función |
|---|---|---|---|
| `/api/ai.js` | POST | `{ prompt, model='gemini', context }` | Análisis IA single-shot. Gemini con fallback a Groq. |
| `/api/chat.js` | POST | `{ messages, model, system }` | Chat multi-turno (LitperBot). Gemini + Groq fallback. |
| `/api/create-checkout.js` | POST | datos de plan | Crea sesión de Stripe Checkout (redirect flow). |
| `/api/stripe-webhook.js` | POST | evento Stripe | Maneja `checkout.session.completed`, `subscription.updated/deleted`, `invoice.payment_failed` → actualiza plan en Supabase. Fallback a modo demo si Stripe no está configurado. |

⚠️ **Las API keys viven SOLO en env vars del servidor** (`api/`). NUNCA exponer keys de IA/Stripe en el frontend.

## Arquitectura Supabase
- **URL**: `https://gtsivwbnhcawvmsfujby.supabase.co`
- **Tablas**: `organizations`, `profiles`, `uploads`, `city_stats`, `carrier_stats`, `ai_analyses`, `chat_sessions`.
- **Migraciones** (`supabase/migrations/`):
  - `001_schema.sql` — esquema base (originalmente creaba `auth_profiles`).
  - `002_commercial.sql` — campos comerciales (Stripe, onboarding) + intentaba una vista `auth_profiles`.
  - `003_fix_schema_naming.sql` — **resuelve el conflicto de nombres**: renombra `auth_profiles` → `profiles`,
    recrea políticas RLS, arregla el trigger `handle_new_user` y añade columnas Stripe a `organizations`.
- **⚠️ Importante (post-003)**: la tabla canónica es **`profiles`** (NO `auth_profiles`). El trigger
  `on_auth_user_created` inserta en `public.profiles` con `plan='free'` y `ai_quota=50` por defecto.
  Si ves código antiguo referenciando `auth_profiles`, debe actualizarse a `profiles`.
- **Campos comerciales en `profiles`**: `onboarding_completed`, `store_name`, `phone`, `avatar_url`,
  `plan`, `ai_quota`, `ai_used`.
- **Campos Stripe en `organizations`**: `stripe_customer_id`, `stripe_subscription_id`,
  `subscription_status`, `trial_ends_at`, `plan`.
- **Columnas generadas**: `city_stats.semaforo`, `carrier_stats.cpa_cop`.
- **RLS activo** en todas las tablas (políticas por `auth.uid() = user_id`, más `service_role` full access).

### Persistencia (qué se guarda y cuándo)
- `uploads`, `city_stats`, `carrier_stats` — al subir un Excel de Dropi en el dashboard.
- `ai_analyses` — cada análisis de IA se persiste.
- `chat_sessions` — conversaciones del LitperBot.

## Frontend — JS compartido
- `public/js/supabase-client.js` — crea el cliente Supabase (`window.supabase`) y expone helpers globales:
  - `getUser()`, `requireAuth()` (redirige a `/login` si no hay sesión), `signOut()` (→ `/login`),
    y redirección a `/dashboard` si ya hay sesión.
- **`requireAuth()` protege**: dashboard, profile, checkout.
- `public/js/dashboard.js` — toda la lógica del dashboard (semáforo, carriers, IA, upload, export).

## Pagos (Stripe)
- Stripe Checkout (redirect flow) para suscripciones.
- Webhook actualiza el plan tras `checkout.session.completed`, `subscription.updated/deleted`,
  `invoice.payment_failed`.
- Fallback a **modo demo** si Stripe no está configurado.
- Planes: **starter** (gratis), **pro** ($79K COP/mes), **enterprise** ($299K COP/mes).
  Toggle anual/mensual en `pricing.html`.

## Onboarding
- Wizard de 3 pasos al primer login (`onboarding_completed=false` en `profiles`).
- Paso 1: nombre de tienda · Paso 2: subir primer Excel · Paso 3: overview de features.
- El dashboard auto-carga el último upload desde Supabase al entrar.

## Variables de entorno (Vercel) — ver `.env.example`
```
# IA (backend only)
GEMINI_API_KEY=...
GROQ_API_KEY=...          # fallback de Gemini
CLAUDE_API_KEY=...        # opcional
OPENAI_API_KEY=...        # opcional

# Stripe (backend only)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_ANNUAL=price_...

# Supabase
SUPABASE_URL=https://gtsivwbnhcawvmsfujby.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# CORS — dominios permitidos separados por coma
ALLOWED_ORIGINS=https://litper-semaforo.vercel.app,https://litperpro.com,http://localhost:3000
```
> El frontend usa `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (valores públicos). Las keys
> sensibles solo se leen desde `api/`.

## Cómo correr localmente
```bash
# Solo estático:
npx serve public -p 3000     # o: npm run dev

# Con funciones /api/* (requiere Vercel CLI + env vars):
vercel dev
```

## Deploy
```bash
git add . && git commit -m "mejora: descripción" && git push
# Vercel despliega automáticamente al hacer push.
# Manual: vercel deploy --prod
```

## Reglas de desarrollo
1. **Mobile-first** siempre.
2. **No renombrar páginas** sin actualizar `vercel.json` (rewrites) y todas las referencias internas.
3. **Archivos grandes** — editar con precisión quirúrgica; usar búsqueda dirigida en vez de leer todo.
4. **Variables de entorno solo via `/api/`**, nunca en frontend.
5. Al **agregar tablas**, verificar siempre que RLS esté activo.
6. Al **agregar un dominio/API externa al frontend**, actualizar el **CSP** en `vercel.json`.
7. Dashboard: recordar la separación HTML / `css/dashboard.css` / `js/dashboard.js`.
8. Usar la tabla **`profiles`** (no `auth_profiles`) — ver migración 003.

## Prioridades de mejora (en orden)
1. `index.html` — conversión de la landing (hero, CTA, social proof).
2. `dashboard.html` — UX (la app más crítica).
3. `checkout.html` — flujo de pago y conversión.
4. Performance — lazy loading, archivos pesados.
5. Mobile responsiveness en el dashboard.
6. `pricing.html` — claridad de planes y conversión.
7. `login.html` — onboarding first-run.

## Equipo Litper
- **Jeferson** — CEO/Fundador (Duitama, Boyacá)
- **Catalina** — GM
- **Jimmy / Evan** — Coordinadores
- **Angie / Felipe / Karen** — Ops

## Documentación relacionada
- `BRAND_IDENTITY.md` — guía de marca (paleta, voz, tipografía). Consultar antes de cambios visuales.
- `README.md` — overview público (puede ir por detrás de este CLAUDE.md).

## Skills de Claude Code disponibles (CLI)
`/audit` · `/polish` · `/optimize` · `/frontend-design` · `/bolder` · `/animate` · `/harden` ·
`/adapt` · `/distill` · `/critique` · `/colorize` · `/clarify` · `/onboard` · `/typeset`

Flujo recomendado:
```bash
cd ~/Litper-pro-semaforo-ia && claude
/audit public/dashboard.html      # auditar
/optimize public/dashboard.html   # aplicar mejoras
/polish public/index.html         # pase final
git add . && git commit -m "mejora: ..." && git push   # deploy via Vercel
```
