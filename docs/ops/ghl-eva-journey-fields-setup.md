# GHL — Campos de journey Eva (setup propuesto, EVA-CJ-1)

Esta fase NO crea campos ni escribe en GHL (GHL_WRITE_JOURNEY_FIELDS=false,
would_write=false siempre). Este doc es la guía para crearlos manualmente
y el field map propuesto para la fase de escritura futura.

## Campos custom a crear (tipo: texto de línea única)

| Key lógica | Nombre visible sugerido | Enum (ver constants.js) |
| --- | --- | --- |
| eva_fuente_lead | Eva - Fuente del lead | eva_wa, landing_carreras, test_vocacional, desconocido |
| eva_metodo_captura | Eva - Método de captura | 8 valores |
| eva_contexto_entrada | Eva - Contexto de entrada | 11 valores |
| eva_ultimo_touch | Eva - Último touch | 6 valores |
| eva_tema_atencion | Eva - Tema de atención | 9 valores |
| eva_estado_journey | Eva - Estado del journey | 15 valores |
| eva_siguiente_accion | Eva - Siguiente acción | 13 valores |

## Field map propuesto (secret NUEVO, separado)

`GHL_EVA_JOURNEY_FIELD_MAP` = JSON {key lógica → field id de GHL}, mismo
formato y validación que GHL_WA_FIELD_MAP. PROHIBIDO reutilizar el id
quemado yBz675YEp1pdvwnvloXP / wa_test_checkbox_a (lista forbidden vigente).

## Encendido futuro (fase posterior, NO ahora)
1. Crear los 7 campos en GHL y capturar sus ids.
2. Configurar GHL_EVA_JOURNEY_FIELD_MAP en InsForge.
3. GHL_WRITE_JOURNEY_FIELDS=true con GHL_SYNC_MODE=dry_run → validar preview.
4. Solo entonces evaluar live con allowlist.
