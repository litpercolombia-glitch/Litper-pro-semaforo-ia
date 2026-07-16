// api/_kb.js — ZYNEX Knowledge Base v1
// Fuente: Drive Litper "Información Transportadoras Colombia/Panamá" (jul 2026).
// La cobertura ciudad×transportadora (COD / no COD) vive en Supabase (tabla zynex_coverage).

export const CARRIERS_CO = {
  INTERRAPIDISIMO: {
    pais: 'CO', poblaciones: 1104, max_recaudo: 3000000,
    pagos: { tarjeta_credito: false, tarjeta_debito: false, pse_wompi: false, nequi_daviplata: 'Código QR' },
    peso_max_kg: 1, refacturacion_sobrepeso: true, novedades_dropi: false,
    nota_novedades: 'Las novedades las gestiona la transportadora directamente, NO Dropi',
    intentos_entrega: 2, cambio_direccion_misma_ciudad: true, cambio_ciudad: false,
    guia_devolucion_nueva: true, cobro_extra_devolucion: false,
    reclamo_oficina: true, dias_reclamo_oficina: 4,
    restriccion_especial: 'No transporta prendas de vestir de color azul'
  },
  ENVIA: {
    pais: 'CO', poblaciones: 1423, max_recaudo: 2000000,
    pagos: { tarjeta_credito: false, tarjeta_debito: false, pse_wompi: false, nequi_daviplata: false },
    peso_max_kg: 1, refacturacion_sobrepeso: true, novedades_dropi: true,
    intentos_entrega: 3, cambio_direccion_misma_ciudad: true, cambio_ciudad: false,
    guia_devolucion_nueva: false, cobro_extra_devolucion: false,
    reclamo_oficina: 'Solo oficinas autorizadas para Dropi', dias_reclamo_oficina: 1
  },
  COORDINADORA: {
    pais: 'CO', poblaciones: 1442, max_recaudo: 2000000,
    pagos: { tarjeta_credito: false, tarjeta_debito: false, pse_wompi: 'WOMPI (TD y TC)', nequi_daviplata: false },
    peso_max_kg: 2, refacturacion_sobrepeso: false, novedades_dropi: true,
    intentos_entrega: 2, cambio_direccion_misma_ciudad: true, cambio_ciudad: false,
    guia_devolucion_nueva: true, cobro_extra_devolucion: false,
    reclamo_oficina: true, dias_reclamo_oficina: 8
  },
  TCC: {
    pais: 'CO', poblaciones: 1307, max_recaudo: 1800000,
    pagos: { tarjeta_credito: false, tarjeta_debito: false, pse_wompi: 'WOMPI y BANCOLOMBIA', nequi_daviplata: false },
    peso_max_kg: 3, refacturacion_sobrepeso: true, novedades_dropi: true,
    intentos_entrega: 3, cambio_direccion_misma_ciudad: true, cambio_ciudad: false,
    guia_devolucion_nueva: true, cobro_extra_devolucion: false,
    reclamo_oficina: 'Solo oficinas principales', dias_reclamo_oficina: 3
  },
  DOMINA: {
    pais: 'CO', poblaciones: 195, max_recaudo: 2500000,
    pagos: { tarjeta_credito: false, tarjeta_debito: false, pse_wompi: 'WOMPI y BANCOLOMBIA', nequi_daviplata: false },
    peso_max_kg: 3, refacturacion_sobrepeso: true, novedades_dropi: true,
    intentos_entrega: 3, cambio_direccion_misma_ciudad: true, cambio_ciudad: false,
    guia_devolucion_nueva: false, cobro_extra_devolucion: false,
    reclamo_oficina: 'Solo oficinas principales', dias_reclamo_oficina: 6,
    restriccion_especial: 'No transporta línea blanca ni productos >8kg'
  },
  VELOCES: {
    pais: 'CO', poblaciones: 10, max_recaudo: 2500000,
    pagos: { tarjeta_credito: false, tarjeta_debito: false, pse_wompi: true, nequi_daviplata: false },
    peso_max_kg: 5, refacturacion_sobrepeso: true, novedades_dropi: true,
    intentos_entrega: 3, cambio_direccion_misma_ciudad: true, cambio_ciudad: false,
    guia_devolucion_nueva: false, cobro_extra_devolucion: false, reclamo_oficina: false
  },
  'JAMV-DRIVE': {
    pais: 'CO', poblaciones: 17, max_recaudo: 2000000,
    pagos: { tarjeta_credito: true, tarjeta_debito: true, pse_wompi: 'SI (notificar con anticipación en notas de la guía)', nequi_daviplata: 'SI (notificar en notas de la guía)' },
    peso_max_kg: 5, refacturacion_sobrepeso: true, novedades_dropi: true,
    intentos_entrega: 3, cambio_direccion_misma_ciudad: true, cambio_ciudad: false,
    guia_devolucion_nueva: false, cobro_extra_devolucion: false, reclamo_oficina: false
  },
  WIILOG: {
    pais: 'CO', poblaciones: 45, max_recaudo: 1000000,
    pagos: { tarjeta_credito: true, tarjeta_debito: true, pse_wompi: true, nequi_daviplata: true },
    peso_max_kg: 5, refacturacion_sobrepeso: true, novedades_dropi: true,
    intentos_entrega: 3, cambio_direccion_misma_ciudad: true, cambio_ciudad: false,
    guia_devolucion_nueva: false, cobro_extra_devolucion: false,
    reclamo_oficina: true, dias_reclamo_oficina: 2
  },
  '99MINUTOS': {
    pais: 'CO', poblaciones: 47, max_recaudo: 800000,
    pagos: { tarjeta_credito: true, tarjeta_debito: true, pse_wompi: false, nequi_daviplata: true },
    peso_max_kg: 5, refacturacion_sobrepeso: true, novedades_dropi: true,
    intentos_entrega: 2, cambio_direccion_misma_ciudad: true, cambio_ciudad: false,
    guia_devolucion_nueva: false, cobro_extra_devolucion: false, reclamo_oficina: false
  },
  SERVIENTREGA: {
    pais: 'CO', poblaciones: 1710, max_recaudo: 2000000,
    pagos: { tarjeta_credito: null, tarjeta_debito: false, pse_wompi: false, nequi_daviplata: false },
    peso_max_kg: 3, refacturacion_sobrepeso: true, novedades_dropi: true,
    intentos_entrega: 2, cambio_direccion_misma_ciudad: true, cambio_ciudad: true,
    guia_devolucion_nueva: false, cobro_extra_devolucion: true,
    reclamo_oficina: 'Solo oficinas autorizadas para Dropi', dias_reclamo_oficina: 8
  },
  FLETEX: {
    pais: 'CO', poblaciones: 9, max_recaudo: 3000000,
    pagos: { tarjeta_credito: false, tarjeta_debito: false, pse_wompi: false, nequi_daviplata: true },
    peso_max_kg: 3, refacturacion_sobrepeso: false, novedades_dropi: true,
    intentos_entrega: 3, cambio_direccion_misma_ciudad: true, cambio_ciudad: false,
    guia_devolucion_nueva: false, cobro_extra_devolucion: false,
    reclamo_oficina: true, dias_reclamo_oficina: 5,
    restriccion_especial: 'No líquidos de más de 5 litros'
  },
  'DE ROCHA': {
    pais: 'CO', poblaciones: 4, max_recaudo: 2000000,
    pagos: { tarjeta_credito: true, tarjeta_debito: true, pse_wompi: true, nequi_daviplata: true },
    peso_max_kg: 5, refacturacion_sobrepeso: true, novedades_dropi: true,
    intentos_entrega: 2, cambio_direccion_misma_ciudad: true, cambio_ciudad: false,
    guia_devolucion_nueva: false, cobro_extra_devolucion: true,
    reclamo_oficina: true, dias_reclamo_oficina: 5
  },
};

export const CARRIERS_PA = {
  SERVIENTREGA_PA: {
    pais: 'PA', poblaciones: '10 provincias', max_recaudo: 500, moneda: 'USD (efectivo)',
    pagos: { tarjeta_credito: true, tarjeta_debito: true, pse_wompi: false, nequi_daviplata: false },
    peso_max_kg: 10, intentos_entrega: 2, cambio_direccion_misma_ciudad: true, cambio_ciudad: true,
    reclamo_oficina: true, dias_reclamo_oficina: 7
  },
  'HL-EXPRESS': {
    pais: 'PA', poblaciones: 10, max_recaudo: 1000, moneda: 'USD',
    pagos: { tarjeta_credito: true, tarjeta_debito: true, pse_wompi: 'WOMPI', nequi_daviplata: 'YAPPY' },
    peso_max_kg: 3, refacturacion_sobrepeso: true, intentos_entrega: 3,
    cambio_direccion_misma_ciudad: true, cambio_ciudad: false,
    recoleccion_fija: 'Desde 5 paquetes', recoleccion_esporadica: 'Desde 1 paquete'
  },
};

// Diccionario base de novedades COD (v1 — genérico multi-transportadora).
// v2: cargar los 12 Excels "Significado Estatus y Novedades" a Supabase.
export const NOVEDADES = {
  'DESTINATARIO AUSENTE': { accion: 'Contactar al cliente por WhatsApp, confirmar franja horaria y solicitar 2do intento', urgencia: 'alta', reintento: true },
  'DIRECCION ERRADA': { accion: 'Validar dirección con el cliente. Casi todas las transportadoras permiten cambio de dirección en la misma ciudad (NO de ciudad, salvo Servientrega)', urgencia: 'alta', reintento: true },
  'REHUSADO': { accion: 'Cliente rechazó el pedido. Confirmar motivo por WhatsApp: si es precio/dudas, el vendedor puede rescatar. Si es definitivo, autorizar devolución rápido para reducir costo', urgencia: 'critica', reintento: false },
  'SIN DINERO': { accion: 'Coordinar nuevo intento cuando el cliente tenga el efectivo. Verificar si la transportadora acepta QR/Nequi (Inter: QR; Wiilog/99min/JAMV: sí) y ofrecer esa vía', urgencia: 'alta', reintento: true },
  'ZONA DE DIFICIL ACCESO': { accion: 'Ofrecer al cliente retiro en oficina (usar puntos de recolección ZYNEX) o coordinar punto de encuentro', urgencia: 'media', reintento: true },
  'TELEFONO ERRADO': { accion: 'Cruzar con datos de la orden en Dropi/Shopify y actualizar teléfono en la guía', urgencia: 'alta', reintento: true },
  'NO CONOCEN AL DESTINATARIO': { accion: 'Validar nombre y dirección con el cliente; posible dirección de trabajo vs casa', urgencia: 'alta', reintento: true },
  'EN OFICINA': { accion: 'Enviar al cliente la dirección exacta de la oficina y el plazo máximo de reclamo (Inter 4 días, Coordinadora 8, TCC 3, Envía 1). Después de ese plazo se devuelve', urgencia: 'critica', reintento: false },
  'DEVOLUCION EN TRANSITO': { accion: 'Pedido perdido. Registrar causa raíz en ZYNEX para el score de la ciudad/transportadora', urgencia: 'baja', reintento: false },
  'ENTREGA PROGRAMADA': { accion: 'Confirmar con el cliente que estará presente en la fecha acordada', urgencia: 'media', reintento: true },
};

export function kbSummary() {
  const co = Object.entries(CARRIERS_CO).map(([n, c]) =>
    `${n}: cobertura ${c.poblaciones} poblaciones, recaudo máx $${c.max_recaudo?.toLocaleString('es-CO')}, ${c.intentos_entrega} intentos, peso ${c.peso_max_kg}kg${c.restriccion_especial ? ', ⚠ ' + c.restriccion_especial : ''}`
  ).join('\n');
  return `TRANSPORTADORAS COLOMBIA (Dropi):\n${co}\n\nPANAMÁ: Servientrega (recaudo máx $500 USD efectivo), HL-Express (máx $1.000, acepta Yappy/Wompi).`;
}
