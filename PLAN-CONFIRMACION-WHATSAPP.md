# MÓDULO CONFIRMACIÓN WHATSAPP — PLAN ESTRUCTURADO (Semana 2 del Plan 30 días)
*Basado en la documentación completa del API Chatea Pro (SOP-API-CP-v1, 208 endpoints, workspace 140701 "Litper Oficial")*

## LA IDEA EN UNA FRASE
Cuando entra un pedido COD, ZYNEX mira el semáforo de la ciudad. Si es **roja**, le manda WhatsApp al cliente por Chatea Pro ANTES de despachar: "¿Confirmas tu pedido?". Si dice NO o no responde → no se despacha → devolución evitada → plata ahorrada.

---

## 1. CÓMO FUNCIONA (flujo completo)

```
Pedido nuevo (Dropi / Shopify / n8n)
        │
        ▼
POST https://www.zynexapp.com/api/confirmar
        │
        ├─ 1. Consulta semáforo de la ciudad×transportadora
        │      • VERDE  → responde {accion:"DESPACHAR"} y listo
        │      • ROJA/AMARILLA → sigue ↓
        │
        ├─ 2. Busca el cliente en Chatea Pro POR TELÉFONO
        │      GET /subscriber/get-info-by-user-id?user_id=573001234567
        │      → devuelve user_ns (ej: f140701u761661861)
        │      → si no existe: POST /subscriber/create {phone, email}
        │
        ├─ 3. Le marca el tag "zynex_confirmar_pendiente"
        │      POST /subscriber/add-tag-by-name {user_ns, tag_name}
        │
        ├─ 4. Le envía la confirmación
        │      • Si escribió hace <24h: POST /subscriber/send-text
        │      • Si no (lo normal):     POST /subscriber/send-whatsapp-template
        │        (plantilla aprobada Meta, con nombre + producto + ciudad)
        │
        └─ 5. Guarda el pedido en Supabase como "esperando_confirmacion"
        
Cliente responde SÍ / NO / cambio dirección
        │
        ▼ (flow de Chatea Pro le pone tag según respuesta,
           o webhook/n8n lee la respuesta)
        │
        ├─ SÍ  → pedido pasa a "confirmado" → DESPACHAR
        ├─ NO  → pedido "cancelado a tiempo" → DEVOLUCIÓN EVITADA ✅ (se cuenta)
        └─ Cambio dirección / sin respuesta 24h → entra a la BANDEJA de ZYNEX
           para que Angie/Karen decidan con solución sugerida por Zyan
```

## 2. LOS ENDPOINTS EXACTOS QUE USAMOS (ya documentados en tu vault)

| Paso | Endpoint Chatea Pro | Nota |
|---|---|---|
| Buscar por teléfono | `GET /subscriber/get-info-by-user-id?user_id={phone}` | phone CON código país (57...) |
| Crear si no existe | `POST /subscriber/create` | requiere phone + email |
| Marcar estado | `POST /subscriber/add-tag-by-name` | tags: zynex_confirmar_pendiente / zynex_confirmado / zynex_cancelado |
| Enviar texto (ventana 24h) | `POST /subscriber/send-text` | `{user_ns, content}` |
| Enviar plantilla (siempre) | `POST /subscriber/send-whatsapp-template` | `{user_ns, content:{namespace, name, lang, params}}` |
| Disparar flow de confirmación | `POST /subscriber/send-sub-flow` | si prefieres que un subflow de Chatea maneje SÍ/NO con botones |
| Crear los tags (una vez) | `POST /flow/create-tag` | 3 tags zynex_* |

Auth en todas: `Authorization: Bearer $CHATEAPRO_API_KEY` — Base: `https://chateapro.app/api`

**Detalle clave del schema Subscriber:** el campo `allow_send_message` — si está en false, el envío falla; el endpoint lo valida antes y lo reporta. Y `last_message_at` + `last_message_type` nos dicen si estamos en ventana de 24h (texto libre) o toca plantilla.

## 3. LÍMITES QUE RESPETAMOS (de tu SOP Rate Limits)
- Global: ~1000 requests/ventana (~1h) → con 2.000 pedidos/semana (~300/día) vamos sobrados; igual leo el header `x-ratelimit-remaining` y freno si baja de 100.
- Broadcasts: `max_per_minute: 30` (recomendado para plantillas WA).
- Paginación: máx 10/página (no nos afecta: buscamos directo por teléfono, sin listar).

## 4. QUÉ CONSTRUYO YO vs QUÉ PONES TÚ

**Yo (Claude) — código listo:**
1. `/api/confirmar` en ZYNEX (Vercel) con toda la lógica de arriba.
2. `/api/confirmar-respuesta` — recibe la respuesta del cliente (desde n8n o webhook de Chatea) y actualiza pedido + Bandeja.
3. Tabla `zynex_confirmaciones` en Supabase (pedido, teléfono, ciudad, estado, timestamps, resultado).
4. Panel en el dashboard: confirmados / cancelados a tiempo / sin respuesta + **contador de devoluciones evitadas en COP**.
5. Flujo n8n listo para importar (pedido Dropi → /api/confirmar).

**Tú — 3 cosas (15 min total):**
1. **CHATEAPRO_API_KEY** → agregarla en Vercel (Settings → Environment Variables). La sacas de Chatea Pro → configuración API. *No me la pegues en el chat.*
2. **Plantilla WhatsApp aprobada por Meta** para la confirmación. Sugerida (mándala a aprobación en Chatea Pro → Plantillas):
   > Hola {{1}} 👋 Tu pedido de {{2}} está listo para despacharse a {{3}}. Responde **SÍ** para confirmarlo o **NO** si deseas cancelarlo. Litper 🚚
   Cuando esté aprobada me pasas el `name` y `namespace` de la plantilla.
3. **Subflow SÍ/NO en Chatea Pro** (opcional pero recomendado): botones SÍ/NO que al tocarlos ponen el tag zynex_confirmado o zynex_cancelado. Así la respuesta queda marcada sola.

## 5. DROPI (lo estás gestionando tú)
Cuando tengas el API de Dropi, lo conectamos así:
- **Opción A (ideal):** webhook/consulta de pedidos nuevos de Dropi → n8n → POST /api/confirmar. 
- **Opción B (bonus descubierto en tu vault):** Chatea Pro tiene integración NATIVA con Dropi (`GET/POST /integration/dropi`) — revisamos qué datos ya fluyen ahí; puede que los pedidos ya estén llegando a Chatea Pro solos.
Mientras llega el API de Dropi, el módulo funciona igual recibiendo pedidos desde Shopify o carga manual/CSV.

## 6. VALIDACIÓN (tarea 2.4 del plan)
1. Prueba con TU número: pedido falso a ciudad roja → te llega el WhatsApp → respondes NO → se marca "devolución evitada".
2. Piloto con 100 pedidos reales (Jimmy/Evan supervisan 2-3 días).
3. Métricas objetivo: >70% responden en 24h, 10+ devoluciones evitadas/semana = $100-150k COP demostrables.

## 7. ORDEN DE EJECUCIÓN
| # | Acción | Quién | Cuándo |
|---|---|---|---|
| 1 | Enviar plantilla WA a aprobación Meta (tarda 1-48h — HACERLO YA) | Tú | Hoy |
| 2 | CHATEAPRO_API_KEY en Vercel | Tú | Hoy |
| 3 | Construir /api/confirmar + tabla + panel | Claude | Apenas esté la key |
| 4 | Crear tags zynex_* vía API + probar búsqueda por tu teléfono | Claude | Mismo día |
| 5 | Subflow SÍ/NO en Chatea Pro | Tú (10 min, te guío) | Esta semana |
| 6 | Flujo n8n Dropi→confirmar | Claude + tú importas | Cuando esté el API Dropi |
| 7 | Piloto 100 pedidos | Jimmy/Evan | Semana 2 |
