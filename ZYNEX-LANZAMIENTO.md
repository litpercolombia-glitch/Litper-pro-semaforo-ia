# ZYNEX — Checklist de lanzamiento (pendientes de Jeferson)

## 1. Vercel → Settings → Environment Variables (proyecto litper-semaforo)
| Variable | Valor | Para qué |
|---|---|---|
| ANTHROPIC_API_KEY | (tu llave NUEVA de Anthropic) | Agente Zyan + Bandeja "generar" |
| SUPABASE_URL | https://gtsivwbnhcawvmsfujby.supabase.co | API |
| SUPABASE_ANON_KEY | anon key del proyecto | API con RLS |
| SUPABASE_SERVICE_ROLE_KEY | service role NUEVA (rotada) | Quota IA + webhook Stripe |
| ALLOWED_ORIGINS | https://tu-dominio.vercel.app | CORS |
| ZYNEX_BRAIN_KEYS | genera 1+ claves largas aleatorias, separadas por coma | /api/brain para apps externas / MCP |
| GEMINI_API_KEY / GROQ_API_KEY | llaves NUEVAS (las viejas quedaron expuestas en el repo) | features IA secundarias |
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | de tu dashboard Stripe | pagos |
| STRIPE_PRICE_BASICO_MONTHLY / ANNUAL | crear producto Básico $39.000 (anual −20%) | checkout |
| STRIPE_PRICE_PRO_* / STRIPE_PRICE_ENTERPRISE_* | productos Pro $79.000 / Enterprise $299.000 | checkout |

## 2. Rotar llaves (URGENTE — quedaron pegadas en el chat / repo)
- GitHub PAT (revocar el viejo, crear uno nuevo solo para el push de esta noche y revocarlo después)
- Anthropic API key
- Supabase service role (Dashboard → Settings → API → rotate)
- Gemini y Groq
- Hacer el repo **privado** en GitHub

## 3. Stripe
- Crear los 3 productos (Básico, Pro, Enterprise) con precios mensual/anual y copiar los price IDs a Vercel
- Configurar webhook → https://TU-DOMINIO/api/stripe-webhook (evento checkout.session.completed)

## 4. Esta noche con el PAT nuevo
- Yo hago: push del commit de la Bandeja Zyan → verifico deploy READY → pruebo en producción

## 5. Deuda de seguridad detectada (no es de ZYNEX, decidir después)
- 8 tablas `luo_*` y `temp_files` sin RLS (proyecto n8n/agentes) — si solo las usa n8n con service key, activar RLS sin policies las protege sin romper nada
- 7 vistas `v_*` con SECURITY DEFINER (dashboards internos) — revisar si deben ser visibles para usuarios finales
- Funciones ZYNEX ya endurecidas ✅ (search_path fijo, anon sin ejecución)
