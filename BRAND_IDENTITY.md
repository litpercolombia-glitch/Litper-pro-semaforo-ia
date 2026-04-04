# LitperPro by Litper Group LLC — Brand Identity System

> **Version**: 2.0
> **Last updated**: 2026-04-03
> **Owner**: Jeferson Rodriguez, CEO & Founder

---

## 1. Mision y Vision

### Mision
Transformar la logistica COD en Latinoamerica con inteligencia artificial y datos en tiempo real.

### Vision
Ser la plataforma #1 de optimizacion logistica COD en LATAM para 2027.

### Proposito (Why)
Porque cada paquete devuelto es dinero que una empresa LATAM pierde sin siquiera saberlo. Existimos para hacer visible lo invisible y convertir datos en decisiones rentables.

### Value Equation (Alex Hormozi — $100M Offers)
```
Value = (Dream Outcome x Perceived Likelihood) / (Time Delay x Effort)
```

| Variable              | LitperPro Implementation                                           |
|-----------------------|--------------------------------------------------------------------|
| Dream Outcome         | Reducir perdidas logisticas 40%, optimizar carriers automaticamente |
| Perceived Likelihood  | Dashboard con datos reales, IA predictiva, semaforo visual          |
| Time Delay            | Setup 5 minutos, resultados desde dia 1                            |
| Effort                | Zero learning curve, todo en una pantalla, sin integraciones       |

---

## 2. Arquitectura de Marca

### Jerarquia
```
Litper Group LLC              (Holding / Wyoming, USA — EIN: 38-4366550)
  |
  +-- LitperPro               (Producto SaaS principal)
  |     |
  |     +-- Semaforo de Ciudades (TM)   — Feature insignia
  |     +-- LitperBot IA               — Asistente conversacional
  |     +-- Modo Jimmy                  — Operaciones diarias
  |     +-- Scorecard de Carriers       — Comparacion automatizada
  |
  +-- [Futuros productos]
```

### Naming Convention

| Contexto         | Nombre           | Uso                                        |
|------------------|------------------|--------------------------------------------|
| Legal/Oficial    | Litper Group LLC | Contratos, facturacion, footer             |
| Producto         | LitperPro        | App, marketing, pricing, landing           |
| Casual/Brand     | Litper           | Social media, conversacion, dominio        |
| Feature          | Semaforo(TM)     | Dentro del producto, marketing             |
| Bot/IA           | LitperBot        | Chat, asistente inteligente                |

### Taglines
- **Principal**: "Inteligencia logistica que salva tu margen"
- **Hero**: "Reduce tus perdidas logisticas en un 40% desde el dia 1"
- **Tecnico**: "El semaforo que tus carriers no quieren que veas"
- **ROI**: "Cada dato, menos devoluciones. Cada decision, mas margen."

---

## 3. Paleta de Colores

### Filosofia
Dark-mode-first. Inspirado en Linear, Vercel y Stripe. El verde esmeralda (#00FF88) como color insignia representa crecimiento, dinero y entregas exitosas.

### Colores Primarios

| Token               | Value                       | Uso                                     |
|----------------------|-----------------------------|-----------------------------------------|
| `--brand`            | `#00FF88`                   | Color insignia, CTAs, exito, acento     |
| `--brand-hover`      | `#00CC6A`                   | Hover state del primario                |
| `--brand-muted`      | `rgba(0,255,136,0.1)`      | Backgrounds sutiles de brand            |
| `--brand-glow`       | `0 0 25px rgba(0,255,136,.4), 0 0 60px rgba(0,255,136,.12)` | Glow effect signature |

### Backgrounds

| Token               | Value                       | Uso                                     |
|----------------------|-----------------------------|-----------------------------------------|
| `--bg`               | `#07080A`                   | Background principal (casi negro)       |
| `--surface`          | `#0D1117`                   | Cards, panels                           |
| `--surface-elevated` | `#161B22`                   | Surface elevada, dropdowns              |
| `--border`           | `rgba(255,255,255,0.08)`   | Borders default                         |
| `--border-hover`     | `rgba(255,255,255,0.15)`   | Borders hover                           |

### Texto

| Token               | Value                       | Uso                                     |
|----------------------|-----------------------------|-----------------------------------------|
| `--text-primary`     | `#F0F6FC`                   | Titulos, texto principal                |
| `--text-secondary`   | `rgba(240,246,252,0.7)`    | Texto secundario                        |
| `--text-tertiary`    | `rgba(240,246,252,0.4)`    | Texto terciario, placeholders           |

### Acentos y Semanticos

| Token               | Value      | Uso                                      |
|----------------------|------------|------------------------------------------|
| `--accent-cyan`      | `#00D4FF`  | Informacion, links, datos                |
| `--accent-violet`    | `#A855F7`  | Premium, features pro, upsell            |
| `--error`            | `#FF4757`  | Errores, semaforo rojo, danger           |
| `--warning`          | `#FFBE0B`  | Warnings, semaforo amarillo              |
| `--success`          | `#00FF88`  | Exito, semaforo verde (= brand)          |

### Colores Semanticos del Semaforo

| Estado   | Color     | Hex       | Threshold         |
|----------|-----------|-----------|--------------------|
| Verde    | Success   | `#00FF88` | >= 80.5% entrega   |
| Amarillo | Warning   | `#FFBE0B` | 70% - 79.9%        |
| Rojo     | Error     | `#FF4757` | < 70%              |

---

## 4. Tipografia

### Font Stack

| Rol       | Fuente            | Weights      | Uso                                |
|-----------|-------------------|--------------|------------------------------------|
| Headings  | **Inter**         | 600, 700     | Titulos, headlines, CTAs           |
| Body/UI   | **Inter**         | 400, 500     | Todo el UI, cuerpo, botones        |
| Mono      | **JetBrains Mono**| 400, 500, 600| Datos, metricas, codigo, KPIs      |

### CSS Variables
```css
--font: 'Inter', system-ui, -apple-system, sans-serif;
--mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Google Fonts Import
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### Escala Tipografica

| Nivel  | Desktop | Mobile | Weight | Uso                       |
|--------|---------|--------|--------|---------------------------|
| Hero   | 64px    | 36px   | 700    | Hero headlines             |
| H1     | 48px    | 32px   | 700    | Page titles                |
| H2     | 36px    | 26px   | 700    | Section titles             |
| H3     | 24px    | 20px   | 600    | Subsections                |
| H4     | 20px    | 18px   | 600    | Card headers               |
| Body   | 16px    | 15px   | 400    | Texto general              |
| Body-sm| 14px    | 13px   | 400    | Labels, captions           |
| Tiny   | 12px    | 11px   | 500    | Badges, tags, metadata     |
| Mono   | 14px    | 13px   | 500    | Datos, KPIs, metricas      |

---

## 5. Spacing y Sizing

### Base Grid: 4px

| Token    | Value | Uso                                 |
|----------|-------|-------------------------------------|
| `--sp-1` | 4px   | Micro gaps, icon padding            |
| `--sp-2` | 8px   | Tight gaps, inline spacing          |
| `--sp-3` | 12px  | Input padding, pill padding         |
| `--sp-4` | 16px  | Standard gap, card padding compact  |
| `--sp-5` | 24px  | Card padding default, section gap   |
| `--sp-6` | 32px  | Section margin                      |
| `--sp-7` | 48px  | Large section gap                   |
| `--sp-8` | 64px  | Hero padding                        |
| `--sp-9` | 96px  | Landing section spacing             |

### Border Radius

| Token     | Value   | Uso                        |
|-----------|---------|----------------------------|
| `--r-sm`  | 6px     | Pills, tags, badges        |
| `--r-md`  | 8px     | Botones, inputs            |
| `--r-lg`  | 12px    | Cards                      |
| `--r-xl`  | 16px    | Modales, feature cards     |
| `--r-full`| 9999px  | Avatars, circles           |

### Breakpoints

| Name    | Value  | Uso                  |
|---------|--------|----------------------|
| Mobile  | 480px  | Phones               |
| Tablet  | 768px  | Tablets              |
| Desktop | 1024px | Desktop small        |
| Wide    | 1280px | Desktop standard     |
| Ultra   | 1536px | Large screens        |

---

## 6. Tono de Voz

### Principios

1. **Directo**: Sin rodeos. "Tu carrier TCC tiene 65% de entrega en Cali" no "Hemos detectado una oportunidad de mejora..."
2. **Data-driven**: Siempre respaldar con numeros. "Reduce 40% tus devoluciones" no "mejora tus envios"
3. **LATAM-authentic**: Lenguaje natural colombiano/latam. "Plata" > "dinero", sin jerga innecesaria
4. **Empoderador**: El usuario toma decisiones informadas con datos reales
5. **Urgente sin panico**: Crear sentido de oportunidad, no de miedo

### Voz por Contexto

| Contexto      | Tono                     | Ejemplo                                           |
|---------------|--------------------------|---------------------------------------------------|
| Landing/Hero  | Aspiracional, bold       | "Reduce tus perdidas logisticas en un 40%"        |
| Dashboard     | Analitico, preciso       | "Coordinadora: 82.3% entrega, CPA $18,200"       |
| Pricing       | Valor > precio           | "ROI de 200x desde el primer mes"                 |
| Error/Alert   | Claro, solucionable      | "No pudimos cargar los datos. Intenta de nuevo."  |
| LitperBot     | Consultor experto        | "Basado en tus datos, te recomiendo..."           |
| Onboarding    | Guia amigable            | "Sube tu Excel y en 30 segundos ves todo"         |

### Palabras Marca (usar)
`margen`, `tasa de entrega`, `semaforo`, `optimizar`, `accionable`, `en tiempo real`, `inteligencia`, `plata`, `ROI`, `automatico`, `carriers`, `COD`

### Palabras Prohibidas (evitar)
`solucion`, `innovador`, `disruptivo`, `lider`, `de clase mundial`, `synergy`, `leverage`, `holistic`, `revolucionario`

---

## 7. Logo Guidelines

### Logotipo Principal
Wordmark tipografico: **LitperPro** en Inter weight 700 con letter-spacing 0.02em y color `#00FF88`.

### Variantes

| Variante           | Contexto                         | Color          |
|--------------------|----------------------------------|----------------|
| Full Color (dark)  | Sobre fondos oscuros (#07080A)   | #00FF88        |
| Full Color (light) | Sobre fondos claros              | #07080A        |
| Monochrome White   | Sobre imagenes/gradientes        | #FFFFFF        |
| Monochrome Black   | Documentos impresos              | #000000        |

### Favicon
Cuadrado con fondo `#07080A` y la letra "L" en `#00FF88` con Inter bold.

### Zona de Exclusion
Espacio minimo = altura de la "L" alrededor de todo el logo.

### Prohibiciones
- No rotar
- No cambiar colores fuera de variantes aprobadas
- No agregar sombras/outlines no especificados
- No comprimir/estirar desproporcionalmente

---

## 8. Componentes UI Base

### Botones

```css
/* Primary — Green CTA with glow */
.btn-primary {
  background: #00FF88;
  color: #07080A;
  font-family: var(--font);
  font-weight: 600;
  font-size: 15px;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all .2s cubic-bezier(.34, 1.56, .64, 1);
  box-shadow: 0 0 20px rgba(0,255,136,.25);
}
.btn-primary:hover {
  background: #00CC6A;
  transform: translateY(-1px);
  box-shadow: 0 0 30px rgba(0,255,136,.4), 0 0 60px rgba(0,255,136,.12);
}

/* Secondary — Ghost */
.btn-secondary {
  background: transparent;
  color: #F0F6FC;
  border: 1px solid rgba(255,255,255,0.08);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all .2s;
}
.btn-secondary:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.15);
}

/* Danger */
.btn-danger {
  background: rgba(255,71,87,0.12);
  color: #FF4757;
  border: 1px solid rgba(255,71,87,0.2);
  padding: 12px 24px;
  border-radius: 8px;
}
.btn-danger:hover {
  background: rgba(255,71,87,0.2);
}
```

### Cards (Glassmorphism)

```css
.card {
  background: rgba(13,17,23,0.8);
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 24px;
  transition: border-color .2s;
}
.card:hover {
  border-color: rgba(0,255,136,0.2);
}
```

### Inputs

```css
.input {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 12px 16px;
  color: #F0F6FC;
  font-family: var(--font);
  font-size: 15px;
  transition: all .2s;
}
.input:focus {
  border-color: #00FF88;
  box-shadow: 0 0 0 3px rgba(0,255,136,0.12);
  outline: none;
}
.input::placeholder {
  color: rgba(240,246,252,0.4);
}
```

### Tablas

```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--mono);
  font-size: 14px;
}
.table th {
  color: rgba(240,246,252,0.4);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .05em;
  font-size: 11px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  text-align: left;
}
.table td {
  padding: 12px 16px;
  color: rgba(240,246,252,0.85);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.table tr:nth-child(even) {
  background: rgba(255,255,255,0.02);
}
.table tr:hover {
  background: rgba(0,255,136,0.03);
}
```

### Badges / Pills

```css
.badge {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  letter-spacing: .02em;
}
.badge-green  { background: rgba(0,255,136,0.12); color: #00FF88; border: 1px solid rgba(0,255,136,0.2); }
.badge-amber  { background: rgba(255,190,11,0.1); color: #FFBE0B; border: 1px solid rgba(255,190,11,0.2); }
.badge-red    { background: rgba(255,71,87,0.1);  color: #FF4757; border: 1px solid rgba(255,71,87,0.2); }
.badge-cyan   { background: rgba(0,212,255,0.1);  color: #00D4FF; border: 1px solid rgba(0,212,255,0.2); }
.badge-violet { background: rgba(168,85,247,0.1); color: #A855F7; border: 1px solid rgba(168,85,247,0.2); }
```

---

## 9. Efectos y Animaciones

### Glow Signature
```css
.glow-green {
  box-shadow: 0 0 20px rgba(0,255,136,0.3),
              0 0 60px rgba(0,255,136,0.1);
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(0,255,136,.3); }
  50% { box-shadow: 0 0 40px rgba(0,255,136,.5), 0 0 80px rgba(0,255,136,.15); }
}
```

### Easing Curves
```css
--ease-spring: cubic-bezier(.34, 1.56, .64, 1);
--ease-out: cubic-bezier(.16, 1, .3, 1);
--ease-in-out: cubic-bezier(.65, 0, .35, 1);
--ease-back: cubic-bezier(.34, 1.4, .64, 1);
```

### Glassmorphism
```css
backdrop-filter: blur(20px) saturate(1.2);
background: rgba(7,8,10,0.85);
border: 1px solid rgba(255,255,255,0.08);
```

### Noise Texture
SVG fractal noise overlay al 3-5% opacidad como background sutil.

### Scroll Animations
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 10. Grand Slam Offer (Hormozi) — Pricing Strategy

### Oferta Principal
**LitperPro Dashboard** — La herramienta que reduce tus perdidas logisticas 40%

### Plans

| Feature                       | Starter (Free) | Pro ($29/mes)  | Enterprise ($199/mes) |
|-------------------------------|----------------|----------------|-----------------------|
| Dashboard completo (14 tabs)  | Si             | Si             | Si                    |
| Paises disponibles            | 1 (demo)       | 4              | Ilimitados            |
| Datos reales                  | Demo only      | Ilimitados     | Ilimitados            |
| IA predictiva (3 modelos)     | —              | Si             | Si                    |
| Chat inteligente LitperBot    | —              | Si             | Si                    |
| API access                    | —              | Si             | Dedicada              |
| Export multi-formato          | Basico         | Completo       | Completo              |
| White label                   | —              | —              | Si                    |
| SLA                           | —              | —              | 99.9%                 |
| Account manager               | —              | —              | Dedicado              |

### Bonus Stack (Plan Pro)
1. Templates de reportes ejecutivos — valor $97/mes — GRATIS
2. Onboarding personalizado 1-on-1 — valor $200 — GRATIS
3. Grupo privado operadores LATAM — valor $47/mes — GRATIS
4. Soporte prioritario WhatsApp — valor $50/mes — GRATIS

### Value Stack
| Item                           | Valor     |
|--------------------------------|-----------|
| Dashboard LitperPro            | $49/mes   |
| Templates reportes ejecutivos  | $97/mes   |
| Onboarding personalizado       | $200      |
| Grupo privado operadores       | $47/mes   |
| Soporte prioritario WhatsApp   | $50/mes   |
| **Total valor**                | **$443**  |
| **Precio early bird**          | **$29/mes** |
| **Ahorro**                     | **93%**   |

### Garantia
30 dias money-back. Sin preguntas. Si no reduces tus perdidas en 30 dias, devolvemos el 100%.

### Urgencia/Escasez
- Precio early-bird: $29/mes (sube a $49/mes cuando se llenen 100 slots por pais)
- Slots limitados: 50 empresas por ciudad principal
- Countdown timer visible en landing

---

## 11. Empresas de Referencia

| Empresa  | Que tomamos                                                  |
|----------|--------------------------------------------------------------|
| Linear   | Dark-mode-first, alta densidad info, velocidad percibida     |
| Vercel   | Tipografia como identidad, contraste alto, clean aesthetics  |
| Stripe   | Confianza financiera, gradientes sutiles, cohesion total     |
| Notion   | Flexibilidad, minimalismo funcional                          |

### Tendencias 2025 Aplicadas
- Product-Led Branding: Landing y app son UN sistema visual cohesivo
- Dark mode como DEFAULT
- Alta densidad de informacion sin clutter
- Micro-animaciones con proposito (spring, glass, glow)
- Tipografia custom que define la marca (Inter everywhere)

---

## 12. Assets Checklist

| Asset                    | Estado       | Nota                        |
|--------------------------|--------------|-----------------------------|
| Favicon SVG             | Existe       | Inline base64 en HTMLs      |
| Logo wordmark           | CSS-based    | Inter 700 + #00FF88         |
| Paleta colores          | Definida     | Este documento              |
| Google Fonts (Inter)    | Integrada    | CDN                         |
| OG Image                | PENDIENTE    | Necesita diseno             |
| Twitter Card            | PENDIENTE    | Necesita meta tags          |
| PWA Manifest            | PENDIENTE    | manifest.json               |
| Email Templates         | PENDIENTE    | Para transaccionales        |
| Pitch Deck              | PENDIENTE    | Para investors              |

---

*Litper Group LLC — Duitama, Boyaca, Colombia / Wyoming, USA*
*EIN: 38-4366550 | CEO: Jeferson Rodriguez*
*URL: litper-semaforo.vercel.app*
