# Source of Truth — Build Report

> **Generado:** 2026-06-22T18:09:13.818Z
> **Versión:** csv-sources-2026-06-18
> **Estado:** PASS — listo para 7B.2

## Archivos leídos

- `docs\knowledge\sources\Base_Actualizada_Universidad_Latino_v2.csv`
- `docs\knowledge\sources\becas_excelencia.csv`
- `docs\knowledge\sources\politicas_institucionales.csv`
- `docs\knowledge\sources\modalidades_horarios.csv`
- `docs\knowledge\sources\documentos_inscripcion.csv`
- `docs\knowledge\sources\proceso_admision.csv`
- `docs\knowledge\sources\formas_pago.csv`
- `docs\knowledge\sources\costos_adicionales.csv`
- `docs\knowledge\sources\contacto_institucional.csv`

## Filas por archivo

| Archivo | Filas |
|---|---:|
| Base_Actualizada_Universidad_Latino_v2.csv | 12 |
| becas_excelencia.csv | 5 |
| politicas_institucionales.csv | 21 |
| modalidades_horarios.csv | 3 |
| documentos_inscripcion.csv | 4 |
| proceso_admision.csv | 5 |
| formas_pago.csv | 4 |
| costos_adicionales.csv | 2 |
| contacto_institucional.csv | 8 |

## Validaciones

| Estado | Validación | Detalle |
|---|---|---|
| PASS | careers.length === 12 | 12 filas |
| PASS | programas únicos === 9 | 9 |
| PASS | combinaciones carrera/modalidad === 12 | 12 |
| PASS | sin carreras fantasma | contaduría, contaduria, arquitectura, criminología, criminologia, diseño, diseno, educación, educacion |
| PASS | becas 5 tramos | 50% inscripción en tramos con beneficio |
| PASS | MSI === false | politica + formas_pago |
| PASS | contacto.area | Departamento de Admisiones |
| PASS | contacto.email | informes@universidadlatino.edu.mx |
| PASS | contacto.whatsapp_oficial | +52 999 453 8421 |
| PASS | contacto.horario_lunes_viernes | 07:00-21:00 |
| PASS | contacto.horario_sabado | 08:00-14:00 |
| PASS | practicas_profesionales_garantizadas | true |
| PASS | claim excluido WA: claim_marketing_nasa | excluded_from_wa |
| PASS | claim excluido WA: claim_marketing_7_paises | excluded_from_wa |
| PASS | claim excluido WA: claim_marketing_trilingue | excluded_from_wa |
| PASS | claim excluido WA: claim_marketing_70_practica_derecho | excluded_from_wa |
| PASS | claim excluido WA: intercambio_internacional | excluded_from_wa |
| PASS | resumen_ia_usar_en_wa | false |
| PASS | costos numéricos limpios | 12/12 |
| PASS | sin reglas beca duplicadas en careers | columna ausente en v2 |

## Warnings

- Archivo legacy presente pero no usado como fuente: becas.csv
- Archivo legacy presente pero no usado como fuente: costos.csv
- Archivo legacy presente pero no usado como fuente: carreras.csv
- Archivo legacy presente pero no usado como fuente: Base_Actualizada_Universidad_Latino.csv

## pending_validation

- career:derecho-presencial:servicio_social
- career:derecho-presencial:practicas_profesionales
- career:derecho-presencial:documentos_extra
- career:derecho-en-linea:servicio_social
- career:derecho-en-linea:practicas_profesionales
- career:derecho-en-linea:documentos_extra
- career:psicologia-presencial:practicas_profesionales
- career:psicologia-presencial:documentos_extra
- career:enfermeria-presencial:practicas_profesionales
- career:enfermeria-presencial:documentos_extra
- career:nutricion-presencial:practicas_profesionales
- career:nutricion-presencial:documentos_extra
- career:sistemas-presencial:servicio_social
- career:sistemas-presencial:practicas_profesionales
- career:sistemas-presencial:documentos_extra
- career:administracion-sabatina:servicio_social
- career:administracion-sabatina:practicas_profesionales
- career:administracion-sabatina:documentos_extra
- career:administracion-en-linea:servicio_social
- career:administracion-en-linea:practicas_profesionales
- career:administracion-en-linea:documentos_extra
- career:mercadotecnia-presencial:servicio_social
- career:mercadotecnia-presencial:practicas_profesionales
- career:mercadotecnia-presencial:documentos_extra
- career:mercadotecnia-en-linea:servicio_social
- career:mercadotecnia-en-linea:practicas_profesionales
- career:mercadotecnia-en-linea:documentos_extra
- career:negocios-internacionales-presencial:servicio_social
- career:negocios-internacionales-presencial:practicas_profesionales
- career:negocios-internacionales-presencial:documentos_extra
- career:gastronomia-presencial:servicio_social
- career:gastronomia-presencial:practicas_profesionales
- career:gastronomia-presencial:documentos_extra
- policy:servicio_social_detalle_por_carrera
- policy:practicas_detalle_por_carrera
- policy:documentos_extra_salud
- policy:claim_marketing_nasa
- policy:claim_marketing_7_paises
- policy:claim_marketing_trilingue
- policy:claim_marketing_70_practica_derecho
- policy:revalidacion_equivalencias
- policy:titulacion_rvoe_sep
- policy:intercambio_internacional
- modality:presencial
- payment:pago_anual_descuento
- payment:pago_semestral_descuento
- additional_cost:campos_clinicos

## Excluidos de WA

- career:derecho-presencial:resumen_ia
- career:derecho-presencial:cta_asesoria
- career:derecho-en-linea:resumen_ia
- career:derecho-en-linea:cta_asesoria
- career:psicologia-presencial:resumen_ia
- career:psicologia-presencial:cta_asesoria
- career:enfermeria-presencial:resumen_ia
- career:enfermeria-presencial:cta_asesoria
- career:nutricion-presencial:resumen_ia
- career:nutricion-presencial:cta_asesoria
- career:sistemas-presencial:resumen_ia
- career:sistemas-presencial:cta_asesoria
- career:administracion-sabatina:resumen_ia
- career:administracion-sabatina:cta_asesoria
- career:administracion-en-linea:resumen_ia
- career:administracion-en-linea:cta_asesoria
- career:mercadotecnia-presencial:resumen_ia
- career:mercadotecnia-presencial:cta_asesoria
- career:mercadotecnia-en-linea:resumen_ia
- career:mercadotecnia-en-linea:cta_asesoria
- career:negocios-internacionales-presencial:resumen_ia
- career:negocios-internacionales-presencial:cta_asesoria
- career:gastronomia-presencial:resumen_ia
- career:gastronomia-presencial:cta_asesoria
- policy:claim_marketing_nasa
- policy:claim_marketing_7_paises
- policy:claim_marketing_trilingue
- policy:claim_marketing_70_practica_derecho
- policy:intercambio_internacional

## Resumen del objeto generado

- `careers`: 12 entradas
- `scholarships`: 5 tramos
- `policies` (WA activas): 11 claves
- `modalities`: 3
- `documents`: 4
- `admissionProcess`: 5 pasos
- `paymentMethods`: 4
- `additionalCosts`: 2
- `contact`: 8 campos
- `catalogMeta.programas_unicos_calculado`: 9

## Salida

- `insforge/functions/lib/academic-engine/source-of-truth.js`

## Recomendación Fase 7B.2 (academic-engine)

1. Proceder con port de `normalizer`, `entityExtractor`, `intentEngine`, `responseBuilder` leyendo `SOURCE_OF_TRUTH`.
2. Usar `policies.respuesta_requisitos_especificos_ss_practicas` para detalle no validado por carrera.
3. No leer `careers[].web_only` ni claims en `_meta.excluded_from_wa` en respuestas automáticas.
4. Regenerar este artefacto tras cada cambio en CSV: `node scripts/build-source-of-truth.js`.
5. Probar en mock (`ACADEMIC_ENGINE_ENABLED`) antes de cualquier deploy.
