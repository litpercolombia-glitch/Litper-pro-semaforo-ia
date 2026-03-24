# LitperPro — Semáforo de Ciudades + SaaS

Dashboard logístico COD para Litper Group LLC.
**Colombia · Chile · Guatemala · México**

## 6 Páginas del ecosistema

| Archivo | URL | Descripción |
|---|---|---|
| `public/index.html` | `/` | Dashboard semáforo — 20 funciones completas |
| `public/landing.html` | `/landing` | Landing Funnel 400% + quiz de autodescubrimiento |
| `public/login.html` | `/login` | Login/Register + Google OAuth |
| `public/pricing.html` | `/pricing` | Planes Starter/Pro/Enterprise + toggle anual/mensual |
| `public/checkout.html` | `/checkout` | Checkout 3 pasos + confetti de éxito |
| `public/profile.html` | `/profile` | Perfil de usuario + plan + equipo |

## Funciones del Dashboard (index.html)
- 🚦 Semáforo de ciudades (verde ≥80.5% / amarillo ≥70% / rojo <70%)
- 🚚 Scorecard de carriers con CPA ($15K / tasa)
- 🚫 Bloqueo de ciudades críticas
- 📊 Matriz de prioridad y Pareto
- 💰 Calculadora de recuperación financiera
- ⚖️ Asignación dinámica de carriers
- ⚠️ Alertas automáticas
- 🤖 IA multi-modelo: Gemini (auto-conectado), Claude, GPT-4o
- 💬 Chat LitperBot 3 modos + 12 prompts predefinidos
- 📥 Upload Excel de Dropi
- 📤 Export CSV / JSON / TXT / Reporte ejecutivo

## Planes (pricing.html)
| Plan | Precio | Usuarios | IA/mes |
|---|---|---|---|
| Starter | Gratis | 1 | 10 |
| Pro | $79.000 COP/mes | 5 | 50 |
| Enterprise | $299.000 COP/mes | Ilimitado | Ilimitado |

## Base de datos Supabase (ya configurada ✅)
- **URL**: https://gtsivwbnhcawvmsfujby.supabase.co
- **Tablas**: organizations, profiles, uploads, city_stats, carrier_stats, ai_analyses, chat_sessions
- **RLS**: activado en todas las tablas
- **Trigger**: auto-crea org + perfil al registrarse

## Lo que falta conectar (Claude Code)
- [ ] Supabase Auth (login.html → base de datos real)
- [ ] Guardar uploads en Supabase (uploads + city_stats + carrier_stats)
- [ ] Historial de análisis IA persistente (ai_analyses)
- [ ] Chat con historial en DB (chat_sessions)
- [ ] API backend segura para keys de IA (Vercel Edge Function)

## Cómo correr localmente
```bash
npx serve public -p 3000
# Abrir http://localhost:3000
```

## Deploy a Vercel
```bash
vercel deploy --prod
# URL: litpersemaforo.vercel.app
```
