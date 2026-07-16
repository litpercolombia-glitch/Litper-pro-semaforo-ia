# ZYNEX MCP — conecta cualquier IA a tu logística

Expone el cerebro ZYNEX (Zyan + 7 skills) como servidor MCP estándar.

## Instalación (Claude Desktop)

1. `cd zynex-mcp && npm install`
2. En `%APPDATA%\Claude\claude_desktop_config.json` agrega:

```json
{
  "mcpServers": {
    "zynex": {
      "command": "node",
      "args": ["C:\\ruta\\a\\zynex-mcp\\index.mjs"],
      "env": {
        "ZYNEX_BRAIN_URL": "https://litper-semaforo.vercel.app/api/brain",
        "ZYNEX_BRAIN_KEY": "<key de app: una de ZYNEX_BRAIN_KEYS en Vercel>"
      }
    }
  }
}
```

3. Reinicia Claude Desktop → aparecen las 8 herramientas `zynex_*`.

## Requisito en Vercel
Variable `ZYNEX_BRAIN_KEYS` = lista de keys de app separadas por coma (genera una por app:
`zynex_desktop_xxx, zynex_n8n_xxx, zynex_sofia_xxx`). Revoca una key = desconectas esa app.

## Herramientas
recomendar_transportadora · cobertura_cod · traducir_novedad · oficina_retiro ·
condiciones_transportadora · whatsapp_cliente · reporte_operacion · preguntar (libre)
