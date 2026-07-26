# Integración del Semáforo con LITPER DESK (escritorio)

> Branch: `claude/order-management-desktop-app-aajeM`
> Documento espejo del plan principal en `litpercolombia-glitch/asda3eeee:PLAN_LITPER_DESK.md`.

---

## 1. Qué se integra

LITPER DESK es la nueva app de escritorio (Electron) que centraliza el equipo de rondas + el semáforo + conectores e-commerce. Este repo (`litper-pro-semaforo-ia`) sigue siendo la fuente de verdad del dashboard, pero LITPER DESK lo embeberá y lo controlará desde:

1. **WebView embebido** del dashboard (`https://litper-semaforo.vercel.app/dashboard`).
2. **Suscripciones Realtime** a `city_stats` y `carrier_stats`.
3. **Tools MCP** que envuelven `/api/ai.js` y `/api/chat.js`.

---

## 2. Cambios mínimos esperados en este repo

Para que la integración sea limpia, este repo necesita pequeños retoques (no en este PR; documentados aquí):

### A) Modo "embedded"
- Detectar query param `?embedded=desktop` en `dashboard.html` y, si está presente:
  - Ocultar header/footer (la chrome ya la dibuja LITPER DESK).
  - Permitir `postMessage` desde `parent` para sync de filtros (ciudad, fecha, carrier).
  - Aceptar token Supabase inyectado por `executeJavaScript` antes del primer render.

### B) Endpoint público de "estado del semáforo"
- Añadir `GET /api/semaforo-status` que devuelve JSON ligero con:
  ```json
  {
    "worst": "rojo",
    "red_cities": [{"name":"Cali","tasa":62.3},{"name":"Cartagena","tasa":58.1}],
    "yellow_count": 8,
    "cpa_today_cop": 18650,
    "delta_vs_yesterday": -2.1,
    "updated_at": "2026-05-08T18:30:00Z"
  }
  ```
- Cache 60s. Sin auth para el `worst` color (color público), con auth para el detalle.
- Esto alimenta el "botón semáforo siempre visible" del Halo flotante sin abrir webview.

### C) Suscripciones Realtime ya disponibles
- Las tablas `city_stats` y `carrier_stats` ya pueden suscribirse vía Supabase Realtime con el token del usuario. Solo verificar que RLS permita SELECT a `organizations.id = jwt.org_id`.

### D) CORS
- Permitir origen `app://litper-desk` (Electron `file://` se ve así con `electron-builder`) en `vercel.json` y/o headers de respuesta de `/api/*`.

---

## 3. Tools MCP que envuelven este repo

El paquete `packages/mcp-server` del monorepo de la suite expone:

```typescript
// Lecturas
litper.semaforo.get_city_status({ city })          // GET supabase.city_stats
litper.semaforo.list_red_cities()                   // GET city_stats WHERE semaforo='rojo'
litper.semaforo.get_carrier_cpa({ carrier, range }) // GET carrier_stats
litper.semaforo.get_worst_status()                  // GET /api/semaforo-status

// Escrituras / IA
litper.semaforo.run_ai_analysis({ upload_id, model }) // POST /api/ai.js
litper.semaforo.chat({ messages, system, model })     // POST /api/chat.js

// Carga de datos
litper.semaforo.upload_excel({ file_path })         // signed URL → Supabase storage
```

Esto deja el dashboard como UI primaria (sigue accesible vía web) y le agrega una capa programática para que **Claude Desktop**, **Cursor** o el propio LITPER DESK orquesten las dos apps como una sola suite.

---

## 4. Flujo de SSO (Supabase compartido)

```
1. Usuario abre LITPER DESK → login Supabase (email/pass o Google OAuth).
2. LITPER DESK guarda { access_token, refresh_token } en electron-store cifrado.
3. Cuando el usuario abre el panel Semáforo en Comando:
   a. Electron crea WebContentsView con preload script.
   b. Antes de loadURL, preload inyecta:
      localStorage.setItem('sb-gtsivwbnhcawvmsfujby-auth-token', JSON.stringify(session))
   c. loadURL('https://litper-semaforo.vercel.app/dashboard?embedded=desktop')
   d. El dashboard hace requireAuth() y la sesión ya está → no redirige a /login.
4. Refresh automático: cuando Supabase emite onAuthStateChange en LITPER DESK,
   el desktop reinyecta el token nuevo en el webview.
```

---

## 5. Reglas de negocio que se respetan en LITPER DESK

Todas las que ya están documentadas en `CLAUDE.md` de este repo:

- Semáforo: verde ≥ 80.5%, amarillo ≥ 70%, rojo < 70%.
- CPA logístico = 15.000 COP / tasa_entrega.
- Meta tasa entrega: 85%.
- NUNCA usar "waterproof" o "impermeable".
- Carriers CO: Coordinadora, Interrapidísimo, TCC, Envía.
- Carriers CL: Chilexpress, Starken.
- Mobile-first sigue aplicando (LITPER DESK no rompe la web).

---

## 6. Qué NO cambia en este repo

- Las 6 páginas estáticas en `/public/` siguen siendo las mismas.
- Stripe checkout sigue siendo el flujo de pago.
- El stack técnico (HTML/CSS/JS puro + Vercel + Supabase) no se toca.
- LITPER DESK consume este repo como cliente; este repo NO depende del desktop.

---

## 7. Próximos pasos en este repo (después de aprobar el plan)

1. Crear endpoint `GET /api/semaforo-status` (cache 60s).
2. Añadir flag `?embedded=desktop` en `dashboard.html` que oculta chrome.
3. Permitir CORS desde origen Electron en `/api/*`.
4. Documentar tools MCP en un README separado.

Estimación: 1-2 días de trabajo en este repo, completamente desacoplado del desktop.
