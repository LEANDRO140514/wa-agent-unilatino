# WA-PILOT-1 — Encendido controlado y pruebas reales de WhatsApp

**Objetivo:** encender en producción del agente (a) la sombra del juez 9B y
(b) el journey dirigido EVA-CJ-1 en modo seguro, y ejecutar el piloto real
de WhatsApp con teléfonos controlados, observándolo desde la consola.

**Regla de oro:** cada paso tiene verificación y rollback. Nada se enciende
sin su paso anterior en verde.

────────────────────────────────────────────────────────

## FASE A — Preparación (sin efectos en usuarios)

A1. **[ ] SQL en InsForge** (idempotentes, en este orden):
    - insforge/sql/wa_core_shadow_log.sql            (9B)
    - insforge/sql/wa_contacts_state_journey_eva_cj1.sql (CJ-1)
    - insforge/sql/eva_lead_events_eva_cj1.sql       (CJ-1, opcional hoy)
    Verificar: las tablas/columnas existen; cero errores.

A2. **[ ] Bundle fresco desplegado:**
    node scripts/bundle-ycloud-wa-deploy.mjs → subir dist a InsForge.
    Verificar: un mensaje de prueba propio responde igual que antes
    (flags aún apagados = comportamiento byte-idéntico, probado por suite).

A3. **[ ] RECON-1 en verde:** node tests/run-recon-1-catalog-parity.mjs

## FASE B — Encender la sombra 9B (cero impacto en usuarios)

B1. **[ ] FF_CORE_SHADOW=true** en secrets de la función + redeploy.
B2. **[ ] Verificar:** enviarte un "hola" desde tu teléfono → consultar
    wa_core_shadow_log: debe aparecer 1 fila con agreement true/false.
    El usuario NO nota nada: la sombra solo observa.
B3. **Rollback:** FF_CORE_SHADOW=false + redeploy.

## FASE C — Activar la consola (repo console, checklist CONSOLE-35)

C1-C7. Seguir docs/console-35-operator-checklist-eva-bridge.md del console.
    Al terminar: /verticals/eva/bridge muestra TU "hola" de B2 en vivo.
    → A partir de aquí, todo el piloto se observa desde el producto.

## FASE D — Encender el journey dirigido (afecta la conversación)

D1. **[ ] Decidir alcance:** el journey no tiene allowlist propia — al
    encender EVA_GUIDED_JOURNEY_ENABLED, TODO usuario nuevo recibe el menú
    raíz en su primer mensaje. Si prefieres piloto acotado: hacerlo en
    horario de bajo tráfico y con rollback listo (D4 = 1 flag).
D2. **[ ] EVA_GUIDED_JOURNEY_ENABLED=true + EVA_LEAD_ATTRIBUTION_ENABLED=true**
    (GHL_WRITE_JOURNEY_FIELDS se queda FALSE: los campos eva_* se persisten
    en wa_contacts_state local; GHL espera al field setup) + redeploy.
D3. **[ ] Smoke propio inmediato:** "hola" desde tu teléfono → menú raíz
    con 5 opciones numeradas.
D4. **Rollback:** ambos flags a false + redeploy → legacy byte-idéntico.

## FASE E — Guion del piloto real (tu teléfono + 1-2 controlados)

E1. **Menú directo:** "Hola" → root · "1" → carrera · escribir "Nutrición"
    → info correcta · "0" → root · "5" → asesor (verificar task en GHL
    dry_run/policy vigente).
E2. **El guion asesino (Telegram, ahora en WA):** "Nutrición" → plan de
    estudios → "¿aceptan revalidación?" → "Sí" (a lo que ofrezca) →
    "el test dice nutrición y gastronomía" → "¿tienes gastronomía sabatino?"
    Esperado: sin amnesia, sin sobrescritura, disponibilidad validada.
    (Nota: este flujo lo responde el agente WA con su academic-engine; los
    fixes MVP-TG-1 viven en el rig de Telegram — comparar comportamientos
    es parte del hallazgo del piloto.)
E3. **Tres fuentes (manual, sin tocar landings aún):** enviar TÚ MISMO los
    prefills §13 desde teléfonos distintos:
    - "Hola Eva, vengo de la página de carreras y quiero información."
      → menú contextual carreras + eva_fuente_lead=landing_carreras
    - "Hola Eva, estoy revisando la calculadora de becas y quiero ayuda."
      → menú calculadora + contexto calculadora_becas
    - "Hola Eva, vengo del test vocacional y necesito orientación."
      → menú test + eva_fuente_lead=test_vocacional
E4. **Inmutabilidad:** desde el teléfono de E3-carreras, mandar "hola"
    normal → eva_fuente_lead sigue landing_carreras; eva_ultimo_touch
    actualizado.
E5. **Lenguaje libre:** "¿Cuánto cuesta Derecho en línea?" en medio del
    menú → responde academic-engine, sin "opción inválida".

## FASE F — Observables y criterio de éxito

Por cada turno del piloto verificar:
- wa_outbound_messages: respuesta esperada, una sola vez.
- wa_contacts_state: menu_state/menu_version + campos eva_* correctos.
- wa_core_shadow_log: el juez opinó (paridad visible en la consola).
- wa_errors: CERO filas nuevas durante todo el piloto.
- GHL: solo dry_run; ningún custom field eva_* escrito (flag false).

ÉXITO = E1-E5 correctos + wa_errors=0 + consola reflejando todo en vivo.
Entregar el transcript completo para análisis (siguiente fase: comparativa
y ajustes, luego prefills reales en las landings + field setup GHL).

## Registro
Fecha de ejecución: ____ · Dueño: ____ · Resultado: ____
