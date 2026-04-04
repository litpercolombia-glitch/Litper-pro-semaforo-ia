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

## Arquitectura Supabase
- URL: https://gtsivwbnhcawvmsfujby.supabase.co
- Tablas: organizations, profiles, uploads, city_stats, carrier_stats, ai_analyses, chat_sessions
- Columnas generadas: city_stats.semaforo, carrier_stats.cpa_cop
- Auth trigger: auto-crea org + profile al registrarse
- RLS activo en todas las tablas
- Schema: supabase/migrations/001_schema.sql

## API Backend (Vercel Serverless)
- /api/ai.js — Proxy IA (POST {model, prompt})
- /api/chat.js — Chat multi-turno (POST {model, messages, system})
- Keys en Vercel env vars: GEMINI_API_KEY, CLAUDE_API_KEY, OPENAI_API_KEY
- ⚠️ NUNCA exponer keys en frontend

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
