# Phase 7G.6D — Orgánico / público limitado (prep)

**Estado:** 📋 **PREP LISTO** — no activar hasta 7G.6C PASS + autorización Leandro  
**Fecha:** 2026-06-25  
**Prerequisito:** `phase-7g6c-organic-limited-go-live-report.md` §7 con go/no-go **B** o **C**

---

## 1. Objetivo

Abrir Eva WA a **tráfico orgánico real** (WhatsApp público, sin Meta Ads) con límites estrictos:

- GHL live ON como consola primaria de admisiones
- Custom fields `wa_*` ON
- WhatsApp `live_outbound` ON
- **Sin** campaña masiva
- **Con** cupo, horario, monitoreo y rollback inmediato

Meta Ads permanecen **OFF** hasta fase 7G.8.

---

## 2. Estado actual vs objetivo 7G.6D

| Control | Hoy (seguro) | 7G.6D (temporal) |
|---------|--------------|------------------|
| `WA_AGENT_MODE` | `mock` | `live_outbound` |
| `GHL_SYNC_MODE` | `dry_run` | `live` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` | `true` |
| Allowlist | 1 teléfono | Ver §4 (modo híbrido o público acotado) |
| Meta Ads | OFF | OFF |

---

## 3. Prerequisitos (checklist)

- [ ] 7G.6C piloto admisiones **PASS** (3 participantes, GHL útil)
- [ ] Rollback 7G.6C confirmado y smokes verdes
- [ ] Equipo admisiones capacitado (protocolo 4B, guion GHL)
- [ ] Horario de soporte técnico definido (ver §6)
- [ ] Plantilla monitoreo lista (`phase-7g6a-monitoring-template.md`)
- [ ] Decisión Leandro documentada en reporte 7G.6C §7

---

## 4. Modos de allowlist (elegir uno — requiere implementación para opción B)

### Opción A — Allowlist ampliada (recomendada corto plazo, **sin código nuevo**)

Mantener `GHL_LIVE_ALLOWED_PHONES` con lista explícita de E.164:

- Leandro + núcleo admisiones (3–6 personas)
- Referidos / leads orgánicos conocidos agregados manualmente por Leandro
- **Pros:** usa guard existente 7G.4T; cero deploy
- **Contras:** no escala a tráfico público abierto

```
GHL_LIVE_ALLOWED_PHONES=<E.164_ALLOWLIST_7G6D>
```

### Opción B — Público acotado (`GHL_LIVE_REQUIRE_ALLOWLIST=false`) — **NO IMPLEMENTADO AÚN**

Ver diseño completo en `phase-7g8-meta-ads-controlled-plan.md` §3 (mismos límites aplican a orgánico).

**Gap actual:** el handler **siempre** exige allowlist cuando `GHL_SYNC_MODE=live`. No existe `GHL_LIVE_REQUIRE_ALLOWLIST`.

---

## 5. Límites operativos propuestos (7G.6D)

| Límite | Valor sugerido | Variable propuesta |
|--------|----------------|-------------------|
| Máx. leads nuevos / ventana | **10** contactos | `GHL_PUBLIC_LIVE_MAX_LEADS` |
| Ventana | **60** minutos | `GHL_PUBLIC_LIVE_WINDOW_MINUTES` |
| Horario activación | Lun–vie 9:00–18:00, sáb 9:00–13:00 (MX) | `GHL_PUBLIC_LIVE_SCHEDULE` o reutilizar `after_hours_logic` |
| Monitoreo | Cada 15 min durante ventana | Manual + SQL §8 |
| Rollback trigger | 2 fallas WA seguidas o 1 incidente GHL | Ver §7 |

**Fuera de horario:** Eva responde; mensaje after-hours preparado (4B); GHL sync según decisión (recomendado: **sí** registrar, task next-day).

---

## 6. Horario y responsables

| Rol | Horario sugerido | Canal |
|-----|------------------|-------|
| Admisiones GHL | Lun–vie 9–18, sáb 9–13 | GHL tasks + notes |
| Soporte técnico Eva | Misma ventana + 30 min post-cierre | Leandro / responsable técnico |
| Escalamiento incidente | Inmediato | WhatsApp directo Leandro |

---

## 7. Rollback inmediato (1 minuto)

Igual que 7G.6C:

1. `WA_AGENT_MODE=mock`
2. `GHL_WRITE_CUSTOM_FIELDS=false`
3. `GHL_SYNC_MODE=dry_run`
4. `GHL_LIVE_ALLOWED_PHONES=<OWNER_E.164_ALLOWLIST>`

**Triggers automáticos de rollback manual:**

- Duplicados GHL
- Campo protegido tocado
- `wa_errors` crítico
- Beca factual incorrecta
- Volumen > cupo §5 sin autorización
- Cualquier número bloqueado por allowlist con queja de lead real (si opción A)

---

## 8. Monitoreo SQL (ventana orgánica)

```sql
-- Volumen última hora
SELECT COUNT(*) AS inbounds_live
FROM wa_inbound_messages
WHERE status = 'processed_inbound_live'
  AND received_at > NOW() - INTERVAL '1 hour';

-- Allowlist vs bloqueados
SELECT status, COUNT(*)
FROM wa_ghl_sync_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;

-- Errores críticos
SELECT COUNT(*) FROM wa_errors
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND error_type NOT IN ('phone_normalization', 'phone_normalization_failed');
```

---

## 9. Activación 7G.6D (secuencia)

1. Confirmar 7G.6C PASS en reporte
2. Elegir opción allowlist §4 (A inmediata / B tras implementación)
3. Configurar secrets InsForge (mismos que 7G.6C + allowlist ampliada si A)
4. Comunicar a admisiones: ventana horaria + cupo
5. Abrir monitoreo (plantilla 7G.6A)
6. **No** publicar número en Meta Ads
7. Tráfico orgánico: solo canales ya existentes (web, referidos, WhatsApp conocido)
8. Al cerrar ventana → rollback §7

---

## 10. Criterios de éxito 7G.6D

- [ ] ≥5 conversaciones orgánicas reales procesadas sin incidente
- [ ] GHL contactos útiles para admisiones (tasks/notes/CF)
- [ ] 0 campos protegidos alterados
- [ ] 0 errores críticos
- [ ] Rollback nocturno confirmado
- [ ] Decisión go/no-go Meta Ads (7G.8)

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `phase-7g6c-organic-limited-go-live-report.md` | Piloto admisiones |
| `phase-7g6a-go-live-readiness-checklist.md` | §15 go-live limitado |
| `phase-7g8-meta-ads-controlled-plan.md` | Modo público + Meta |
| `phase-7g4u-ghl-fields-landings-vs-eva.md` | Campos protegidos |

---

**No activar 7G.6D hasta cerrar 7G.6C con decisión explícita Leandro.**
