# Guion operativo — Eva WA + GHL (Admisiones)

**Para:** personal de admisiones  
**Fase:** 7G.6C — Piloto humano admisiones controlado  
**Duración estimada:** 45–60 minutos (sesión live autorizada)  
**WhatsApp Eva (oficial):** `+52 999 453 8421` — guardar y escribir a ese número

---

## Antes de empezar

- [ ] Leandro o responsable técnico confirma que la prueba está **activa** (o en modo seguro dry_run).
- [ ] Tu teléfono está en la **lista autorizada** (solo estos E.164 reciben GHL live cuando se active):
  - Leandro `+52******5583`
  - Admisiones 1 `+52******4831`
  - Admisiones 2 `+52******8094`
- [ ] Tienes acceso a **GHL** abierto para revisar tu contacto.
- [ ] Envía mensajes **uno por uno** y espera la respuesta de Eva antes del siguiente.

---

## Qué enviar

Escribe a **+52 999 453 8421** desde tu WhatsApp personal:

| Paso | Mensaje exacto | Qué deberías recibir |
|:----:|----------------|----------------------|
| 1 | `1` | Lista de carreras oficiales |
| 2 | `Derecho online` | Info de Derecho en línea (precios, modalidad) |
| 3 | `No sé qué estudiar` | Invitación al test vocacional con enlace |
| 4 | `Tengo promedio 9.2, qué beca me toca` | Tabla de becas + tu tramo (Muy alto / 40%) |
| 5 | `Quiero hablar con asesor` | Mensaje de canalización + task en GHL |

**Si hay poco tiempo**, envía mínimo: pasos **1**, **2** y **5**.

**Casos adicionales (opcional, si el responsable técnico lo pide):**

| Mensaje | Qué validar |
|---------|-------------|
| `Cuanto cuesta?` (después de Derecho) | Precios de la carrera en contexto |
| `Y cuanto dura?` | Duración en años (ej. 3 años Derecho) |
| `Qué documentos necesito para inscribirme?` | Lista "Documentos para inscripción" |

---

## Qué revisar en GHL

Abre el contacto asociado a **tu teléfono** y verifica:

| Elemento | ¿Qué buscar? |
|----------|--------------|
| Contacto | Un solo contacto con tu número (sin duplicados) |
| Tags | `eva-wa` + tag según tema (carreras, beca, asesor, etc.) |
| Notes | Nota nueva con resumen de la conversación |
| Tasks | Tarea cuando pediste asesor o consultaste beca |
| Campos wa_* | `wa_last_intent`, `wa_stage`, `wa_summary`, `wa_needs_human`, etc. |

**En modo dry_run (default):** Eva procesa la lógica pero **no escribe en GHL live**. El responsable técnico confirma en logs que `ghl_sync_mode=dry_run` y `ghl_would_create_task=true` cuando aplica.

**En sesión live autorizada:** debes ver tags, notes y tasks reales en GHL.

---

## Cómo identificar un lead de Eva WA

| Señal | Dónde |
|-------|-------|
| Tag `eva-wa` | GHL contacto |
| Campos `wa_last_intent`, `wa_stage` | GHL custom fields |
| Conversación en WhatsApp con número `+52 999 453 8421` | WhatsApp del lead |
| `wa_needs_human=true` | GHL / campo wa_* — lead pidió asesor |

---

## Qué hacer si pide humano

1. Confirma que Eva respondió con mensaje de **canalización a asesor**.
2. En GHL: debe existir **task** (live) o `ghl_would_create_task=true` (dry_run).
3. Toma el lead en GHL y responde por el canal acordado (WA directo, llamada, etc.).
4. **No modifiques** campos protegidos (`promedio`, `beca_elegible`, UTM, vocacional).

---

## Qué NO hacer

- **No editar** campos del contacto en GHL (nombre, email, promedio, beca, UTM, etc.) salvo autorización de Leandro.
- **No enviar** mensajes desde teléfonos no autorizados.
- **No reenviar** el mismo mensaje muchas veces seguidas (espera la respuesta).
- **No compartir** el número de Eva fuera del equipo de prueba.
- **No activar** campañas ni Meta Ads — piloto interno únicamente.
- **No inventar** becas, precios o carreras que Eva no mencionó.

---

## Cómo reportar incidencias

Si algo falla, avisa **de inmediato** a Leandro y al responsable técnico con:

1. **Hora** aproximada  
2. **Mensaje** que enviaste  
3. **Qué esperabas** vs **qué pasó**  
4. **Captura** de pantalla (WA y/o GHL) si es posible  
5. **Tu teléfono** (últimos 4 dígitos)

**Detener la sesión** si: sin respuesta WA, respuesta duplicada, datos incorrectos en beca, contacto duplicado en GHL, o comportamiento extraño.

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `phase-7g6c-controlled-admissions-pilot-checklist.md` | Checklist completo PASS/FAIL/rollback |
| `phase-7g6c-prep-admissions-pilot.md` | Configuración live y rollback |
| `phase-7g6a-monitoring-template.md` | Registro de sesión |
