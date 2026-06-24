# WA Agent Unilatino

Agente conversacional de WhatsApp para **Universidad Latino**. Atiende consultas de prospectos y estudiantes, orienta sobre programas académicos, admisiones y procesos institucionales, e integra con GoHighLevel (GHL) y n8n para automatización de flujos.

## Estructura del proyecto

```
wa-agent-unilatino/
├── docs/              # Documentación del producto y arquitectura
│   └── knowledge/     # Base de conocimiento de la universidad
├── prompts/           # System prompts del agente (Eva)
├── tools/             # Definición de herramientas MCP (GHL)
└── n8n/workflows/     # Workflows de automatización
```

## Próximos pasos

- Completar `docs/PRD.md`, `Architecture.md`, `Stack.md` y `Decisions.md`
- Configurar el system prompt en `prompts/eva-system-prompt.md`
- Definir herramientas GHL en `tools/ghl-mcp-tools.md`
- Implementar workflows en `n8n/workflows/`
