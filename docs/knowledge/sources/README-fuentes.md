# Fuentes institucionales — Universidad Latino (CSV madre)

> **Versión del paquete:** 2026-06-18  
> **Estado:** validación parcial Leandro (contacto, becas, prácticas generales)  
> **Próximo paso:** generar `source-of-truth.js` desde estos CSV (solo con autorización)

---

## Jerarquía de fuentes

1. **CSV en `docs/knowledge/sources/`** — fuente madre institucional.
2. **`Base_Actualizada_Universidad_Latino_v2.csv`** — datos duros por carrera (costos, modalidad, duración, RVOE, campus).
3. **`becas_excelencia.csv`** — reglas de becas y descuentos de inscripción.
4. **`politicas_institucionales.csv`** — políticas globales, claims marketing, respuestas seguras.
5. Archivos satélite (`modalidades_horarios`, `documentos_inscripcion`, `proceso_admision`, `formas_pago`, `costos_adicionales`, `contacto_institucional`).

**No mandan** si contradicen estos CSV:

- FAQs y markdown en `docs/knowledge/` (salvo como borrador hasta migrar)
- Seeds SQL legacy
- Supabase
- `STATIC_FAQS` / código en Orchids o Eva WA
- `fuente-de-verdad.md` en pwa-base-setup (histórico; el paquete CSV lo reemplaza)

---

## Validaciones Leandro (2026-06-18)

### Contacto institucional — definitivo

| Campo | Valor |
|---|---|
| Área | Departamento de Admisiones |
| Horario lun–vie | 07:00 – 21:00 |
| Horario sábado | 08:00 – 14:00 |
| Correo | informes@universidadlatino.edu.mx |
| WhatsApp oficial | +52 999 453 8421 |

Fuente: `contacto_institucional.csv`

### Becas

Sin cambio en esta actualización. Regla vigente: 50% descuento inscripción en todos los tramos con beneficio (`becas_excelencia.csv`).

### Prácticas profesionales

- **Claim institucional aprobado:** prácticas profesionales garantizadas (`practicas_profesionales_garantizadas=true` en `politicas_institucionales.csv`).
- **Detalle por carrera:** sigue `pendiente_validacion` en v2 (`practicas_profesionales`, `servicio_social`, `documentos_extra`).

### Respuesta segura (requisitos / S.S. / prácticas / documentos especiales)

Cuando el usuario pregunte por detalle no validado por carrera, usar el texto en `politicas_institucionales.csv` clave `respuesta_requisitos_especificos_ss_practicas`:

> Algunas carreras pueden requerir prácticas, servicio social o requisitos específicos. Te puedo canalizar con un asesor para revisar el caso de la carrera que te interesa.

### Claims de marketing

| Claim | Estado WA automático |
|---|---|
| Prácticas profesionales garantizadas (general) | **Aprobado** |
| NASA, 7 países, trilingüe, 70% práctica Derecho, etc. | **`pending_validation=true`** — no usar en respuestas WA |
| Columna `Resumen IA` en v2 | **`resumen_ia_usar_en_wa=false`** — excluida de academic-engine WA |

Claims excluidos documentados en `politicas_institucionales.csv`: `claim_marketing_nasa`, `claim_marketing_7_paises`, `claim_marketing_trilingue`, `claim_marketing_70_practica_derecho`, `intercambio_internacional`.

---

## Inventario de archivos

| Archivo | Filas datos | Propósito |
|---|---:|---|
| `Base_Actualizada_Universidad_Latino.csv` | 12 | v1 original (referencia; no borrar) |
| `Base_Actualizada_Universidad_Latino_v2.csv` | 12 | Catálogo carreras + columnas técnicas WA |
| `becas_excelencia.csv` | 5 | Tramos de beca |
| `politicas_institucionales.csv` | 20 | Políticas transversales + claims + respuestas seguras |
| `modalidades_horarios.csv` | 3 | Horarios por modalidad |
| `documentos_inscripcion.csv` | 4 | Documentos requeridos (lista general) |
| `proceso_admision.csv` | 5 | Pasos de admisión |
| `formas_pago.csv` | 4 | Formas de pago y MSI |
| `costos_adicionales.csv` | 2 | Seguro y campos clínicos |
| `contacto_institucional.csv` | 8 | Contacto validado Leandro |

Archivos legacy (`becas.csv`, `costos.csv`, `carreras.csv`) no actualizados; usar paquete v2.

---

## Columnas por archivo

### `Base_Actualizada_Universidad_Latino_v2.csv` (31 columnas)

`id`, `programa_base`, `modalidad_codigo`, `Carrera`, `Área académica`, `Duración`, `Modalidad`, `Descripción breve`, `Campo laboral`, `Perfil del estudiante`, `Costo mensual`, `Costo inscripción`, `costo_mensual_num`, `costo_inscripcion_num`, `Campus`, `RVOE`, `Autoridad RVOE`, `Palabras clave`, `horario_clases`, `titulo_egreso`, `servicio_social`, `practicas_profesionales`, `costos_adicionales_json`, `documentos_extra`, `incluye_sin_costo`, `resumen_wa`, `cta_wa`, `activo`, `version_fila`, `Resumen IA`, `CTA asesoría`

- **`resumen_wa` / `cta_wa`:** canal WhatsApp (academic-engine futuro).
- **`Resumen IA` / `CTA asesoría`:** archivo histórico web v1; **no usar en WA** (`resumen_ia_usar_en_wa=false`).
- **`version_fila`:** `2026-06-18` tras validación Leandro.

### `politicas_institucionales.csv`

`clave`, `valor`, `canal_wa`, `intent_eva`, `notas`

### `contacto_institucional.csv`

`tipo`, `valor`, `notas`

---

## Regla de becas (confirmada)

- **50% de descuento en inscripción** en todos los tramos con beneficio.
- Beca sobre colegiatura: 50% / 40% / 30% / 0% según tramo.
- Toda beca sujeta a validación de admisiones.

---

## Cómo actualizar datos en el futuro

1. Editar el CSV correspondiente en `docs/knowledge/sources/`.
2. Incrementar `version_fila` en filas de carreras afectadas (v2).
3. Registrar validación en este README si Leandro aprueba nuevos campos.
4. Regenerar `source-of-truth.js` con script de build (fase posterior).
5. Redesplegar academic-engine solo tras pruebas mock.

**No editar** precios o becas en código si contradice el CSV.

---

## `source-of-truth.js` (futuro)

Se generará automáticamente leyendo este paquete CSV. No crear manualmente hasta autorización.

---

## Datos aún pendientes de validación

| Campo / tema | Ubicación | Notas |
|---|---|---|
| Horario presencial detallado por carrera | v2 `horario_clases` | Solo “Lunes a viernes” global |
| `servicio_social` detalle por carrera | v2 | `pendiente_validacion`; usar respuesta segura |
| `practicas_profesionales` detalle por carrera | v2 | `pendiente_validacion`; claim general garantizadas sí |
| `documentos_extra` (salud) | v2 | `pendiente_validacion` |
| Monto descuento pago anual/semestral | `formas_pago.csv` | `pendiente_validacion` |
| Frecuencia exacta campos clínicos | `costos_adicionales.csv` | `pendiente_validacion` |
| Revalidación / equivalencias | `politicas_institucionales.csv` | `pendiente_validacion` |
| Titulación general | `politicas_institucionales.csv` | `pendiente_validacion` |
| Claims NASA, 7 países, trilingüe, etc. | `politicas` + `Resumen IA` v2 | `pending_validation=true`; no WA |

---

## Contradicciones resueltas / vigentes

| Tema | Resolución |
|---|---|
| Email contacto | **Resuelto:** `informes@universidadlatino.edu.mx` (Leandro) |
| Horario atención | **Resuelto:** 07:00–21:00 lun–vie; 08:00–14:00 sáb |
| WhatsApp admisiones | **Resuelto:** +52 999 453 8421 (oficial / YCloud business) |
| 50% inscripción tramos altos | CSV `becas_excelencia.csv` manda sobre `fuente-de-verdad.md` legacy |
| Prácticas por carrera vs garantía general | General aprobado; detalle por carrera pendiente |

---

## Recomendación antes de generar `source-of-truth.js`

1. Completar validación de revalidación, titulación y descuentos pago anual.
2. Opcional: validar claims marketing uno a uno si se quieren habilitar en WA.
3. Implementar `build-source-of-truth.js` leyendo solo este directorio.
4. Academic-engine en mock con `ACADEMIC_ENGINE_ENABLED` antes de deploy.

---

## Relación con Eva WA actual

Este paquete **no cambia** `ycloud-wa-inbound.js` hasta autorizar academic-engine.
