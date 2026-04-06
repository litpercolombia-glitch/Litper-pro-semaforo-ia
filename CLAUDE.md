# LitperPro Semáforo IA — Guía completa para Claude Code

## Qué es esto
Dashboard logístico COD (Cash on Delivery) de **Litper Group LLC** (Wyoming LLC, EIN: 38-4366550).
E-commerce textiles hogar (protectores de colchón, sábanas, cobijas) via WhatsApp + Meta Ads.
Países: Colombia (principal), Chile, Ecuador.
URL producción: https://litper-semaforo.vercel.app

## ⚠️ REGLAS CRÍTICAS DE NEGOCIO
- NUNCA usar "waterproof" o "impermeable" para protectores de colchón
- Semáforo: verde >= 80.5% entrega, amarillo >= 70%, rojo < 70%
- CPA logístico = $15.000 COP / tasa_entrega
- Meta tasa entrega: 85% objetivo (actual ~80.5%)
- Carriers Colombia: Coordinadora, Interrapidísimo, TCC, Envía
- Carriers Chile: Chilexpress, Starken
- Mobile-first — mayoría de usuarios en móvil via WhatsApp

## Stack técnico
- Frontend: HTML/CSS/JS puro — 6 páginas en /public/ (archivos 150KB–485KB)
- Backend: Supabase (Auth + PostgreSQL + RLS) + Vercel Serverless en /api/
- IA: Gemini, Claude Sonnet, ChatGPT via /api/ai.js y /api/chat.js
- Deploy: Vercel (Team: team_NatP2ZfiRnuEUHoydeDtHX5C)
- Auth: Supabase Auth (email/password + Google OAuth)
- Pagos: Stripe en checkout

## Páginas del ecosistema
| Archivo | Ruta | Descripción | Tamaño |
|---|---|---|---|
| public/index.html | / | Landing principal + hero + features | 353KB |
| public/login.html | /login | Auth Supabase | 169KB |
| public/dashboard.html | /dashboard | Semáforo + analytics IA + upload Excel | 485KB |
| public/pricing.html | /pricing | Planes Starter/Pro/Enterprise | 167KB |
| public/checkout.html | /checkout | Checkout 3 pasos + Stripe | 188KB |
| public/profile.html | /profile | Perfil + plan + equipo | 174KB |

### Persistencia (Supabase)
- uploads, city_stats, carrier_stats — se guardan al subir Excel
- ai_analyses — cada analisis de IA se persiste
- chat_sessions — conversaciones del LitperBot
- Columnas generadas: city_stats.semaforo, carrier_stats.cpa_cop

### API Backend (Vercel Serverless)
- `/api/ai.js` — Proxy para analisis IA (POST {model, prompt})
- `/api/chat.js` — Proxy para chat multi-turno (POST {model, messages, system})
- `/api/create-checkout.js` — Crea sesion de Stripe Checkout
- `/api/stripe-webhook.js` — Webhook de Stripe para actualizar plan
- Keys seguras en env vars del servidor

### Pagos (Stripe)
- Stripe Checkout (redirect flow) para suscripciones
- Webhook maneja: checkout.session.completed, subscription.updated/deleted, invoice.payment_failed
- Fallback a modo demo si Stripe no esta configurado
- Plans: starter (gratis, 10 IA), pro ($79K COP/mes, 50 IA), enterprise ($299K, ilimitado)

### Onboarding
- Wizard de 3 pasos al primer login (onboarding_completed=false en profiles)
- Paso 1: Nombre de tienda, Paso 2: Subir primer Excel, Paso 3: Features overview
- Dashboard auto-carga ultimo upload desde Supabase al entrar

## Arquitectura Supabase
- URL: https://gtsivwbnhcawvmsfujby.supabase.co
- Tablas: organizations, profiles, uploads, city_stats, carrier_stats, ai_analyses, chat_sessions
- Schema completo en: supabase/migrations/001_schema.sql + 002_commercial.sql
- View auth_profiles apunta a profiles (el codigo usa auth_profiles)
- Campos comerciales: onboarding_completed, store_name, phone, avatar_url en profiles
- Campos Stripe: stripe_customer_id, stripe_subscription_id, subscription_status en organizations
- Columnas generadas: city_stats.semaforo, carrier_stats.cpa_cop
- Auth trigger: auto-crea org + profile al registrarse
- RLS activo en todas las tablas

## API Backend (Vercel Serverless)
- /api/ai.js — Proxy IA (POST {model, prompt})
- /api/chat.js — Chat multi-turno (POST {model, messages, system})
- Keys en Vercel env vars: GEMINI_API_KEY, CLAUDE_API_KEY, OPENAI_API_KEY
- ⚠️ NUNCA exponer keys en frontend

## Variables de entorno necesarias en Vercel
```
GEMINI_API_KEY=...
CLAUDE_API_KEY=...
OPENAI_API_KEY=...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_ANNUAL=price_...
SUPABASE_SERVICE_ROLE_KEY=...
```

## JS compartido
- public/js/supabase-client.js — helpers auth + Supabase
- requireAuth() protege: dashboard, profile, checkout

## Reglas de desarrollo
1. Mobile-first siempre
2. No renombrar páginas sin actualizar todas las referencias
3. Archivos grandes — modificar con precisión quirúrgica
4. Variables de entorno solo via /api/, nunca en frontend
5. Siempre verificar que RLS esté activo al agregar tablas

## Cómo correr localmente
```
npx serve public -p 3000
Para /api/*: vercel dev
```

## Prioridades de mejora (en orden)
1. index.html — conversión landing (hero, CTA, social proof)
2. dashboard.html — UX (485KB, el más crítico)
3. checkout.html — flujo de pago y conversión
4. Performance — lazy loading, archivos muy pesados
5. Mobile responsiveness en dashboard
6. pricing.html — claridad planes y conversión
7. login.html — onboarding first-run

## Equipo Litper
- Jeferson — CEO/Fundador (Duitama, Boyacá)
- Catalina — GM
- Jimmy / Evan — Coordinadores
- Angie / Felipe / Karen — Ops

## Skills Claude Code disponibles
Usar desde CLI: cd ~/Litper-pro-semaforo-ia && claude

/audit          — Auditoría técnica completa (accesibilidad, perf, responsive)
/polish         — Pase final antes de deploy
/optimize       — Performance y velocidad de carga
/frontend-design — Interfaces premium desde cero
/bolder         — Más impacto visual y personalidad
/animate        — Micro-interacciones y animaciones
/harden         — Edge cases, errores, producción
/adapt          — Responsive y mobile-first
/distill        — Simplificar y limpiar complejidad
/critique       — Evaluación UX con scoring cuantitativo
/colorize       — Color estratégico
/clarify        — UX copy y microcopy
/onboard        — Onboarding y empty states
/typeset        — Tipografía y jerarquía visual

## Flujo de trabajo recomendado
```
cd ~/Litper-pro-semaforo-ia
claude

# Auditar página objetivo
/audit public/dashboard.html

# Aplicar mejoras
/optimize public/dashboard.html
/polish public/index.html

# Commit y deploy automático via Vercel
git add . && git commit -m "mejora: descripción" && git push
```
