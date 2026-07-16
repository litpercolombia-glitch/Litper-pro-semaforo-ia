#!/usr/bin/env node
// ZYNEX MCP Server (Fase B) — conecta Claude Desktop (o cualquier cliente MCP) al cerebro ZYNEX.
// Config: env ZYNEX_BRAIN_URL (default producción) y ZYNEX_BRAIN_KEY (key de app).
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const BRAIN_URL = process.env.ZYNEX_BRAIN_URL || 'https://litper-semaforo.vercel.app/api/brain';
const BRAIN_KEY = process.env.ZYNEX_BRAIN_KEY || '';

async function askBrain(prompt) {
  const r = await fetch(BRAIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-zynex-key': BRAIN_KEY },
    body: JSON.stringify({ message: prompt })
  });
  if (!r.ok) throw new Error(`ZYNEX Brain ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  return d.text || JSON.stringify(d);
}

const TOOLS = [
  { name: 'zynex_recomendar_transportadora', description: 'Recomienda la mejor transportadora COD para una ciudad usando el semáforo ZYNEX (histórico real + tope de recaudo + método de pago).', input: { city: 'Ciudad destino', cod_value: 'Valor a recaudar en COP (opcional)', payment_method: 'efectivo|nequi|tarjeta|pse (opcional)' } },
  { name: 'zynex_cobertura_cod', description: 'Verifica qué transportadoras llegan a una ciudad con contraentrega (matriz oficial Dropi, 8.686 registros).', input: { city: 'Ciudad destino' } },
  { name: 'zynex_traducir_novedad', description: 'Traduce un estatus/novedad de guía al significado oficial de esa transportadora (426 estatus) con acción recomendada.', input: { novedad: 'Texto de la novedad', carrier: 'Transportadora (opcional)' } },
  { name: 'zynex_oficina_retiro', description: 'Encuentra oficinas de retiro/reclamo de transportadoras en una ciudad con dirección exacta (849 oficinas).', input: { city: 'Ciudad', carrier: 'Transportadora (opcional)' } },
  { name: 'zynex_condiciones_transportadora', description: 'Condiciones operativas de una transportadora: tope recaudo, pagos, peso, intentos, devoluciones, restricciones.', input: { carrier: 'Nombre de la transportadora' } },
  { name: 'zynex_whatsapp_cliente', description: 'Redacta un WhatsApp para el cliente final según la situación de su pedido (ausente, sin dinero, en oficina...).', input: { situacion: 'Qué pasó con el pedido', nombre_cliente: 'Nombre (opcional)', ciudad: 'Ciudad (opcional)' } },
  { name: 'zynex_reporte_operacion', description: 'Resumen ejecutivo de la operación logística: tasa de entrega, ciudades problema, acciones priorizadas.', input: { periodo: 'hoy|semana|mes (opcional)' } },
  { name: 'zynex_preguntar', description: 'Pregunta libre al cerebro ZYNEX (agente Zyan con todas sus skills logísticas COD).', input: { pregunta: 'La pregunta' } },
];

const server = new Server({ name: 'zynex-brain', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: { type: 'object', properties: Object.fromEntries(Object.entries(t.input).map(([k, v]) => [k, { type: k === 'cod_value' ? 'number' : 'string', description: v }])), required: [Object.keys(t.input)[0]] }
  }))
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const prompts = {
    zynex_recomendar_transportadora: a => `Recomienda la mejor transportadora para ${a.city}${a.cod_value ? `, recaudo $${a.cod_value}` : ''}${a.payment_method ? `, el cliente paga con ${a.payment_method}` : ''}.`,
    zynex_cobertura_cod: a => `¿Qué transportadoras tienen cobertura contraentrega en ${a.city}?`,
    zynex_traducir_novedad: a => `¿Qué significa la novedad "${a.novedad}"${a.carrier ? ` de ${a.carrier}` : ''} y qué debo hacer?`,
    zynex_oficina_retiro: a => `Busca oficinas de retiro en ${a.city}${a.carrier ? ` de ${a.carrier}` : ''} con dirección exacta y plazo de reclamo.`,
    zynex_condiciones_transportadora: a => `Dame las condiciones operativas completas de ${a.carrier}.`,
    zynex_whatsapp_cliente: a => `Redacta un WhatsApp para el cliente${a.nombre_cliente ? ` ${a.nombre_cliente}` : ''}${a.ciudad ? ` en ${a.ciudad}` : ''}: ${a.situacion}`,
    zynex_reporte_operacion: a => `Dame el reporte ejecutivo de la operación (${a.periodo || 'hoy'}).`,
    zynex_preguntar: a => a.pregunta,
  };
  try {
    const text = await askBrain(prompts[name](args || {}));
    return { content: [{ type: 'text', text }] };
  } catch (e) {
    return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('ZYNEX MCP server corriendo (stdio)');
