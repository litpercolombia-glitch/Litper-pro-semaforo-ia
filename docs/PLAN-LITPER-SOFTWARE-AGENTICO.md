# Plan Maestro — Litper Software: la plataforma agéntica para construir "el Amazon" de LATAM

> Documento estratégico interno · CEO Litper Software · Junio 2026
> Audiencia: Jeferson (CEO/Fundador) y equipo Litper
> Objetivo: definir **qué software necesitamos** para hacer desarrollos agénticos que resuelvan problemas reales, generen ingresos, ahorren costos y funcionen en cualquier parte del mundo.

---

## 0. Lectura honesta antes de empezar (la verdad que un buen CEO te diría)

Quieres "hacer como Amazon pero mejor". Bien — pero copiar a Amazon de frente es la forma más rápida de quebrar. Amazon tiene **1.5M+ empleados, ~$100B/año en inversión de capital y 20 años de ventaja**. No vamos a ganarles en su juego (almacenes propios, aviones, AWS).

**Ganamos cambiando el juego.** La ventaja de Amazon nació de un secreto que hoy ya no es secreto: convirtieron *cada función interna en un servicio con API* (el "API Mandate" de Bezos, 2002), y eso les permitió escalar sin que los equipos se pisaran. Hoy podemos hacer lo mismo, pero con una capa que Amazon construyó tarde y cara: **agentes de IA que ejecutan el trabajo, no solo lo recomiendan.**

La tesis de Litper Software:

> **No construimos "otro e-commerce". Construimos el sistema operativo agéntico para el comercio COD + WhatsApp de mercados emergentes (LATAM primero, luego el mundo). Donde Amazon automatizó con código y robots, nosotros automatizamos con agentes — más barato, más rápido, y vendible a miles de tiendas como producto.**

Tres reglas que no se negocian:
1. **Cada cosa que construyamos debe poder venderse como API a un tercero** (regla de Bezos). Si solo sirve para Litper, es deuda; si sirve para 10.000 tiendas, es un negocio.
2. **Empezar por un dolor que ya sangra y que ya cobramos** (logística COD), no por la fantasía completa.
3. **Cada agente debe tener un número:** dinero que gana, dinero que ahorra, u horas que libera. Sin número, no se construye.

---

## 1. Cómo lo manejan los referentes HOY (investigación, 2025–2026)

### Amazon — qué hacen realmente en lo agéntico
Amazon dejó de hablar de "chatbots" y pasó a **agentes que planean, ejecutan, aprenden y operan solos**. Las piezas concretas que tienen en producción hoy:

- **Amazon Bedrock AgentCore** (GA desde oct-2025): la "fábrica" para desplegar y operar agentes a escala. Sus módulos son el mapa que nosotros también necesitamos:
  - *Runtime* serverless con aislamiento de sesión (cada cliente/tienda aislado).
  - *Memory* — memoria de corto y largo plazo para que el agente recuerde y aprenda de interacciones pasadas.
  - *Observability* — ver paso a paso qué hizo el agente, con scoring y debugging.
  - *Identity* — el agente accede de forma segura a herramientas externas (GitHub, Slack, Salesforce…).
- **Rufus** (asistente de compra agéntico): +250M de usuarios en 2025, interacciones +210% interanual, y quienes lo usan tienen **60% más probabilidad de comprar**. No es un chat: usa *tool calling* para consultar precios, stock y reseñas en tiempo real.
- **Modelos propios Amazon Nova** como cerebro de esos agentes (no dependen de un solo proveedor).
- **Strands** — framework para crear agentes desde cualquier modelo base.

La lección: Amazon separó **modelo** (Nova), **fábrica de agentes** (AgentCore), **producto de cara al cliente** (Rufus). Nosotros copiamos *esa separación de capas*, no su tamaño.

### Cómo construyen software (lo que de verdad los hizo grandes)
- **API Mandate (Bezos, 2002):** todo equipo expone sus datos y funciones como servicio; prohibido leer la base de datos de otro equipo o hacer "puertas traseras". Toda comunicación es vía API. *Esto* es lo que hizo posible AWS y la escala.
- **Two-pizza teams:** equipos tan pequeños que se alimentan con dos pizzas (<10 personas), dueños de su servicio de punta a punta. Menos reuniones, más velocidad.
- **Working backwards:** se escribe el "press release" del producto *antes* de construirlo. Si el comunicado no emociona, no se construye.
- **Microservicios** desacoplados — aunque ojo: hasta Amazon ha *re-fusionado* servicios en monolitos cuando los micro-servicios salían caros (caso Prime Video). Lección: **no sobre-arquitecturar; monolito modular primero, separar solo cuando duela.**

### El stack agéntico que usa la industria hoy (2026)
- **Orquestación de agentes:** LangGraph (grafo de estados con checkpoints y human-in-the-loop, lo más maduro para producción) y CrewAI (el más rápido para arrancar). OpenAI Agents SDK y Microsoft Agent Framework como alternativas.
- **Ejecución durable** (que un agente sobreviva caídas y tareas de horas): Temporal.
- **Observabilidad de agentes:** LangSmith, Langfuse, AgentOps, Pydantic Logfire.
- **Memoria / búsqueda semántica:** bases vectoriales (Qdrant, pgvector sobre el mismo Postgres de Supabase).
- **Evals (la pieza que casi todos olvidan):** una suite de regresión que mide éxito por tarea, latencia y costo en *cada* cambio de prompt. Sin esto, el agente se rompe en silencio.
- **MCP (Model Context Protocol):** el estándar para conectar agentes a herramientas. Ya lo tienes vivo en esta sesión: Shopify, Meta Ads, Supabase, Gmail, Slack, Notion, Calendar… son MCP servers. **Esto es oro: ya tienes las "manos" del agente conectadas.**

---

## 2. La arquitectura de Litper Software (las 6 capas)

Pensado como Amazon: capas separadas, cada una con API, cada una vendible.

```
┌─────────────────────────────────────────────────────────────┐
│  6. PRODUCTOS DE CARA AL CLIENTE                             │
│     Dashboard Semáforo · LitperBot · App tiendas · Storefront│
├─────────────────────────────────────────────────────────────┤
│  5. MARKETPLACE DE AGENTES (nuestro "Rufus" + tienda de apps)│
│     Agentes publicables/vendibles · plantillas por vertical  │
├─────────────────────────────────────────────────────────────┤
│  4. ORQUESTACIÓN AGÉNTICA  (nuestro "AgentCore")            │
│     Runtime · Memoria · Observabilidad · Evals · Guardrails  │
├─────────────────────────────────────────────────────────────┤
│  3. CAPA DE HERRAMIENTAS (MCP)  — las "manos" del agente     │
│     Logística · Pagos · Ads · Inventario · WhatsApp · Email  │
├─────────────────────────────────────────────────────────────┤
│  2. CAPA DE DATOS  — la "memoria de la empresa"             │
│     Supabase/Postgres + pgvector · eventos · feature store   │
├─────────────────────────────────────────────────────────────┤
│  1. CAPA DE MODELOS  — el "cerebro" (multi-proveedor)        │
│     Claude · Gemini · GPT · modelos abiertos · ruteo x costo │
└─────────────────────────────────────────────────────────────┘
```

Regla de oro: **cada capa solo habla con la de abajo vía API.** Así un día podemos vender la capa 3 (herramientas) o la 4 (orquestación) a otra empresa — igual que AWS nació de la infraestructura interna de Amazon.

### Qué ya tienes (no partes de cero)
- Capa 1 (modelos): `/api/ai.js` y `/api/chat.js` ya rutean Claude/Gemini/GPT. ✅
- Capa 2 (datos): Supabase con RLS, tablas de uploads/city_stats/carrier_stats. ✅
- Capa 3 (herramientas): MCPs ya conectados (Shopify, Meta Ads, Supabase, Gmail, Slack, Notion…). ✅✅
- Capa 6 (producto): dashboard Semáforo + LitperBot. ✅

**Lo que falta es la capa 4 (orquestación/AgentCore propio) y la capa 5 (marketplace).** Ahí está el salto de "dashboard que recomienda" a "plataforma que ejecuta".

---

## 3. Los agentes que SÍ generan plata o ahorran (priorizados por ROI)

Cada agente lleva su número. No se construye un agente sin responder: *¿cuánto gana, ahorra o libera?*

### Tier 1 — construir YA (resuelven dolor que ya cobramos, ROI en semanas)

| # | Agente | Qué hace solo (no solo recomienda) | Número que mueve |
|---|--------|-----------------------------------|------------------|
| 1 | **Agente Semáforo / Entregabilidad** | Detecta ciudades/carriers en rojo (<70%), y *ejecuta*: re-rutea pedidos al carrier ganador por zona, dispara confirmación WhatsApp antes de despachar, agenda reintentos. | Subir tasa de entrega 80.5% → 85% = baja el CPA logístico (CPA = $15.000/tasa). Cada punto de entrega es margen directo. |
| 2 | **Agente Confirmación COD (WhatsApp)** | Antes de despachar, confirma dirección/disponibilidad con el cliente por WhatsApp, reagenda, y marca "no despachar" los de alto riesgo de devolución. | Menos devoluciones COD = menos flete pagado a la basura. En COD la devolución es la sangría #1. |
| 3 | **Agente de Pauta (Meta Ads)** | Lee insights de Meta (MCP ya conectado), pausa anuncios con CPA fuera de meta, reasigna presupuesto al creativo ganador, alerta fatiga de creativo. | Cada peso de pauta mal gastado es pérdida. Optimización diaria automática = más ROAS. |
| 4 | **Agente Analista (el que ya tienes, con manos)** | El análisis IA del dashboard pero que *actúa*: genera el reporte, lo manda por email/Slack al equipo, crea tareas en Notion. | Libera horas de Catalina/coordinadores. |

### Tier 2 — siguiente trimestre (escalan el negocio)

| # | Agente | Qué hace | Número |
|---|--------|----------|--------|
| 5 | **Agente de Inventario/Reabasto** | Predice quiebres de stock por SKU/ciudad y genera orden de compra. | Evita perder ventas por agotados y capital muerto en exceso. |
| 6 | **Agente de Atención (post-venta)** | Resuelve "¿dónde está mi pedido?" con tracking real, gestiona PQR, escala solo lo complejo. | Reduce carga de soporte; mejora reseñas. |
| 7 | **Agente de Pricing/Oferta** | Ajusta precio/combos por elasticidad y margen logístico real por zona. | Protege margen donde el flete es caro. |
| 8 | **Agente Contable/Cobros** | Concilia COD recaudado vs. despachado por carrier, detecta faltantes. | El dinero que los carriers "se quedan" en COD es enorme. Recuperarlo es caja pura. |

### Tier 3 — la apuesta grande (convierte Litper en plataforma, no en tienda)

| # | Producto | Qué es | Modelo de negocio |
|---|----------|--------|-------------------|
| 9 | **Litper Cloud / Agentes-como-servicio** | Vendemos los agentes Tier 1–2 a *otras* tiendas COD de LATAM. Multi-tenant, RLS por tienda (ya lo tienes). | SaaS por tienda — el verdadero "AWS de Litper". Aquí está el dinero serio. |
| 10 | **Marketplace de agentes** | Tiendas publican/instalan agentes y plantillas por vertical (moda, hogar, suplementos). | Comisión por agente instalado (modelo App Store). |
| 11 | **Litper Pay / fintech COD** | Adelanto de caja COD, conciliación, payouts a tiendas. | Spread financiero + fee. Amazon hace esto con Amazon Lending. |

> **El patrón Amazon:** lo que construyes para ti mismo (logística, nube, pagos, ads), lo abres como producto. Tier 1–2 te hacen rentable. Tier 3 te hace una empresa de software de verdad.

---

## 4. Software y herramientas concretas que necesitas

Recomendación con criterio de costo/velocidad para una empresa de tu tamaño (no para Amazon).

### Capa 1 — Modelos (cerebro)
- **Mantener multi-proveedor** vía tu `/api/ai.js`. Default a **Claude (Opus/Sonnet)** para razonamiento y agentes; **Gemini Flash / Haiku** para tareas baratas de alto volumen (clasificar mensajes, etiquetar). Ruteo por costo: tarea simple → modelo barato; tarea crítica → modelo fuerte.
- **Prompt caching** para abaratar (clave cuando un agente repite contexto).

### Capa 2 — Datos (memoria)
- **Seguir en Supabase/Postgres** (ya lo tienes, con RLS — esto es tu mayor activo técnico). Añadir **pgvector** para memoria semántica del agente (no necesitas otra base vectorial todavía).
- **Tabla de eventos / event log** — todo lo que hace un agente queda registrado (auditoría + entrenamiento de evals).

### Capa 3 — Herramientas (manos) — **ya la tienes casi resuelta vía MCP**
- Logística: integrar APIs de Coordinadora, Interrapidísimo, TCC, Envía (tracking + generación de guía + estado).
- Pagos: Stripe (ya) + pasarela COD local.
- Ads: Meta Ads MCP (✅ conectado).
- WhatsApp: **WhatsApp Cloud API** (Meta) — el canal #1 de tu negocio, hoy probablemente manual.
- E-commerce: Shopify MCP (✅), email (Gmail MCP ✅), tareas (Notion MCP ✅), avisos (Slack MCP ✅).

### Capa 4 — Orquestación (tu "AgentCore") — **lo que hay que construir**
- **Framework:** empezar con **LangGraph** (estados, checkpoints, human-in-the-loop) — el más sólido para producción. Para prototipos rápidos, CrewAI.
- **Ejecución durable:** Temporal cuando los agentes corran tareas largas/críticas (cobros, reabasto).
- **Observabilidad:** **Langfuse** (open-source, self-host barato) o LangSmith — ver cada paso, costo y latencia.
- **Evals:** suite de regresión propia (un set de casos reales de Litper) corriendo en CI antes de cada deploy. *Innegociable.*
- **Guardrails:** límites duros (un agente NO puede gastar pauta sobre X sin aprobación humana; NUNCA usar "waterproof/impermeable" — regla de negocio en el system prompt).

### Capa 5 y 6 — Marketplace y producto
- Reutilizar tu front actual (`/public`) + dashboard. El marketplace es fase 2.

### Infra y operación
- **Deploy:** Vercel (ya) para front/API; servicios de agentes en contenedores (Railway/Fly.io/AWS) cuando crezcan.
- **Versionado:** GitHub (ya). Cada agente es un repo/servicio con su API (regla de Bezos).
- **Seguridad:** secretos solo en server (ya lo respetas), RLS por tienda, aislamiento de sesión por cliente (como AgentCore Runtime).

---

## 5. Cómo organizar el equipo (modelo Amazon adaptado a Litper)

No tienes 1.5M de empleados. Tienes ~8 personas. Aplica *two-pizza* literal: **un equipo, un producto, una métrica.**

- **Working backwards:** antes de construir cada agente, escribe en una página su "comunicado de prensa" (¿qué problema resuelve, para quién, qué número mueve?). Si no emociona, no se construye.
- **Dueños de número:** cada agente tiene un responsable humano que vigila su métrica (Jimmy/Evan → logística; alguien → pauta).
- **Humano en el lazo (HITL)** al principio: el agente *propone*, un humano *aprueba* las acciones costosas. A medida que confías en sus evals, le das autonomía. Así escaló Amazon la confianza.

---

## 6. Hoja de ruta (90 días → 12 meses)

### Fase 0 — Fundaciones (semanas 1–4)
- [ ] Montar capa 4 mínima: LangGraph + Langfuse + tabla de eventos en Supabase.
- [ ] Definir 1 eval suite con 20 casos reales de Litper.
- [ ] Conectar WhatsApp Cloud API (canal crítico hoy manual).

### Fase 1 — Primeros agentes rentables (semanas 5–12)
- [ ] **Agente Confirmación COD (WhatsApp)** → atacar devoluciones (el dolor #1).
- [ ] **Agente Semáforo/Entregabilidad** → re-ruteo automático por carrier ganador.
- [ ] **Agente de Pauta Meta** → optimización diaria automática.
- [ ] Medir: tasa de entrega, % devoluciones, CPA, ROAS. *Esto es el "press release" cumplido.*

### Fase 2 — Escalar y empaquetar (meses 4–6)
- [ ] Agentes Tier 2 (inventario, post-venta, conciliación COD).
- [ ] Multi-tenant pulido (RLS por tienda) para vender a terceros.
- [ ] Beta de **Litper Cloud** con 3–5 tiendas COD aliadas.

### Fase 3 — Plataforma (meses 7–12)
- [ ] Marketplace de agentes (instalable por tienda).
- [ ] Litper Pay (piloto conciliación/adelanto COD).
- [ ] Expansión Chile/Ecuador (carriers Chilexpress/Starken ya mapeados).

---

## 7. Cómo se gana, se ahorra y se vuelve global

- **Gana dinero:** más tasa de entrega (margen directo), más ROAS en pauta, SaaS a otras tiendas (Litper Cloud), comisión de marketplace, spread de Litper Pay.
- **Ahorra dinero:** menos devoluciones COD (flete tirado), menos horas humanas en tareas repetitivas, menos pauta mal gastada, menos capital muerto en inventario, recuperar COD que carriers retienen.
- **Sirve en cualquier lugar del mundo:** la arquitectura es multi-tenant, multi-país, multi-moneda y multi-idioma desde el diseño. Los agentes hablan por WhatsApp/email/web — canales universales. Cambias el set de carriers y la pasarela local, y el mismo software opera en México, Perú, o donde el COD exista (que es casi todo el mundo emergente).

---

## 8. Los 5 errores que nos quebrarían (y cómo evitarlos)

1. **Construir la plataforma completa antes de tener 1 agente rentable.** → Empezar por Tier 1, dolor que ya cobramos.
2. **Sobre-arquitecturar (mil microservicios).** → Monolito modular primero; separar solo cuando duela (lección Prime Video).
3. **Agentes sin evals → se rompen en silencio.** → Eval suite en CI desde el día 1.
4. **Dar autonomía total a un agente sobre dinero.** → Human-in-the-loop hasta ganar confianza con datos.
5. **Atarnos a un solo proveedor de IA.** → Multi-modelo con ruteo por costo (ya lo tienes).

---

## Resumen en una frase

> Litper Software no será "Amazon más pequeño". Será **la capa agéntica que Amazon construyó tarde y carísima, pero empaquetada y vendible a las miles de tiendas COD/WhatsApp del mundo emergente** — empezando por arreglar, con agentes que ejecutan, el dolor que Litper ya conoce: entregar más, devolver menos, pautar mejor y liberar a su gente.

---

### Fuentes (investigación junio 2026)
- [Introducing Amazon Bedrock AgentCore (AWS)](https://aws.amazon.com/blogs/aws/introducing-amazon-bedrock-agentcore-securely-deploy-and-operate-ai-agents-at-any-scale/)
- [New Amazon Bedrock AgentCore capabilities (About Amazon)](https://www.aboutamazon.com/news/aws/aws-amazon-bedrock-agent-core-ai-agents)
- [How Rufus scales conversational shopping with Bedrock (AWS)](https://aws.amazon.com/blogs/machine-learning/how-rufus-scales-conversational-shopping-experiences-to-millions-of-amazon-customers-with-amazon-bedrock/)
- [AWS makes a hard pitch for agentic AI (Digital Commerce 360)](https://www.digitalcommerce360.com/2025/11/03/amazon-aws-agentic-ai-commerce-q3-fy25/)
- [Building AI Agents on AWS in 2025 (AWS Builder Center)](https://builder.aws.com/content/37j0ql3ZfI6mE0SDYxxGvq18YCM/building-ai-agents-on-aws-in-2025-a-practitioners-guide-to-bedrock-agentcore-and-beyond)
- [The Bezos API Mandate (Nordic APIs)](https://nordicapis.com/the-bezos-api-mandate-amazons-manifesto-for-externalization/)
- [Amazon's Two-Pizza Teams (AWS Executive Insights)](https://aws.amazon.com/executive-insights/content/amazon-two-pizza-team/)
- [Why Amazon Prime moved from microservices back to monolith (Medium)](https://abhishekjoshi-dev.medium.com/why-amazon-prime-teams-moved-from-microservices-back-to-a-monolithic-architecture-5efba0ff6e96)
- [Agentic AI Frameworks 2026: LangGraph vs CrewAI vs OpenAI SDK (Uvik)](https://uvik.net/blog/agentic-ai-frameworks/)
- [Definitive Guide to Agentic Frameworks 2026 (Softmax)](https://softmaxdata.com/blog/definitive-guide-to-agentic-frameworks-in-2026-langgraph-crewai-ag2-openai-and-more/)
