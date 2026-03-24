# LitperPro Semaforo — Guia para Claude Code

## Que es esto
Dashboard logistico COD de Litper Group LLC (Duitama, Colombia).
El archivo principal es `public/index.html` — contiene toda la logica en un solo HTML.

## Stack
- Frontend: HTML/CSS/JS puro (6 paginas en public/)
- Backend: Supabase (Auth + PostgreSQL + RLS) + Vercel Serverless Functions
- IA: Gemini, Claude, ChatGPT via /api/ai.js y /api/chat.js (keys en servidor)
- Deploy: Vercel

## Arquitectura

### Autenticacion
- Supabase Auth integrado en login.html (email/password + Google OAuth)
- `public/js/supabase-client.js` — modulo compartido con helpers
- requireAuth() protege dashboard, profile, checkout
- Trigger auto-crea org + profile al registrarse

### Persistencia (Supabase)
- uploads, city_stats, carrier_stats — se guardan al subir Excel
- ai_analyses — cada analisis de IA se persiste
- chat_sessions — conversaciones del LitperBot
- Columnas generadas: city_stats.semaforo, carrier_stats.cpa_cop

### API Backend (Vercel Serverless)
- `/api/ai.js` — Proxy para analisis IA (POST {model, prompt})
- `/api/chat.js` — Proxy para chat multi-turno (POST {model, messages, system})
- Keys seguras en env vars del servidor

## Supabase
- URL: https://gtsivwbnhcawvmsfujby.supabase.co
- Anon key: ver .env.example
- Tablas: organizations, profiles, uploads, city_stats, carrier_stats, ai_analyses, chat_sessions
- Schema completo en: supabase/migrations/001_schema.sql

## Vercel
- Team: team_NatP2ZfiRnuEUHoydeDtHX5C
- Proyecto actual: asda3eeee (prj_kI6O555rFBGuNl9mlVR5EqB6tvs1)

## Variables de entorno necesarias en Vercel
```
GEMINI_API_KEY=...
CLAUDE_API_KEY=...
OPENAI_API_KEY=...
```

## Como correr localmente
```bash
npx serve public -p 3000
# Abrir http://localhost:3000
# Nota: /api/* requiere Vercel CLI: vercel dev
```

## Reglas
- El semaforo usa verde >= 80.5%, amarillo >= 70%, rojo < 70%
- CPA logistico = $15.000 COP / tasa_entrega
- Meta tasa entrega: 85% (actual ~80.5%)
- Carriers principales: Coordinadora, Interrapidisimo, TCC, Envia
