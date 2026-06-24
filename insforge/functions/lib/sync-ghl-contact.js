const GHL_PROTECTED_FIELDS = [
  "carrera_recomendada",
  "match_percent",
  "sector_principal",
  "dictamen_url",
  "test_completed_at",
  "test_version",
  "beca_elegible",
  "lead_score",
  "lead_class",
  "promedio",
  "email",
  "firstName",
  "lastName",
];

const GHL_WA_WRITABLE_FIELDS = [
  "wa_last_intent",
  "wa_last_message_at",
  "wa_stage",
  "wa_needs_human",
  "wa_summary",
];

const INTENT_TAG_MAP = {
  ambiguo: "wa_interes_info",
  no_se_que_estudiar: "wa_interes_test",
  explorar_carreras: "wa_interes_info",
  beca: "wa_interes_beca",
  humano: "wa_requiere_asesor",
  duda_test: "wa_duda_test",
  post_test: "wa_post_test",
  sin_texto: "wa_sin_texto",
};

const TASK_TITLE = "Atender lead WhatsApp — Universidad Latino";

function getIntentTag(intent) {
  return INTENT_TAG_MAP[intent] || "wa_interes_info";
}

function shouldCreateTaskDryRun(context) {
  const { intent, messageType, needsHuman } = context;
  if (["humano", "duda_test"].includes(intent)) return true;
  if (intent === "beca") return true;
  if (intent === "sin_texto") return true;
  if (messageType && messageType !== "text" && !context.messageText) return true;
  if (needsHuman) return true;
  return false;
}

function buildTaskDescription(context) {
  return [
    `Teléfono: ${context.normalizedPhone || "N/A"}`,
    `Última intención: ${context.intent}`,
    `Último mensaje: ${context.messageText || "(sin texto)"}`,
    `Resumen Eva WA: ${context.waSummary || "N/A"}`,
    `¿Requiere asesor?: ${context.needsHuman ? "Sí" : "No"}`,
    `Fecha/hora: ${context.timestamp}`,
    "Fuente: YCloud / Eva WA",
  ].join("\n");
}

function buildGHLDryRunPayload(context, existingGhlContactId) {
  const tag = getIntentTag(context.intent);
  const tags = ["eva-wa", tag];
  const note = [
    `[Eva WA dry-run] ${context.timestamp}`,
    `Intent: ${context.intent}`,
    `Mensaje: ${context.messageText || "(sin texto)"}`,
    `Respuesta Eva: ${context.responseText || ""}`,
  ].join("\n");

  const customFields = {
    wa_last_intent: context.intent,
    wa_last_message_at: context.timestamp,
    wa_stage: context.waStage || "fase_3a_dry_run",
    wa_needs_human: context.needsHuman,
    wa_summary: context.waSummary,
  };

  const wouldCreateContact = !existingGhlContactId;
  const wouldUpdateContact = Boolean(existingGhlContactId);

  const contactPayload = wouldCreateContact
    ? {
        phone: context.normalizedPhone,
        source: "YCloud / Eva WA",
        tags,
        customFields,
      }
    : {
        id: existingGhlContactId,
        phone: context.normalizedPhone,
        tags_to_add: tags,
        customFields,
      };

  const taskPayload = shouldCreateTaskDryRun(context)
    ? {
        title: TASK_TITLE,
        body: buildTaskDescription(context),
        dueDate: context.timestamp,
      }
    : null;

  return {
    action: wouldCreateContact ? "would_create_contact" : "would_update_contact",
    contact: contactPayload,
    note,
    task: taskPayload,
    tags,
    customFields,
    protected_fields: {
      never_overwrite: GHL_PROTECTED_FIELDS,
      wa_fields_only: GHL_WA_WRITABLE_FIELDS,
    },
    would_create_contact: wouldCreateContact,
    would_update_contact: wouldUpdateContact,
    would_create_task: Boolean(taskPayload),
    would_add_tags: tags,
    would_add_note: note,
  };
}

async function syncGHLContactDryRun({ client, context }) {
  const { data: existingContact } = await client.database
    .from("wa_contacts_state")
    .select("ghl_contact_id")
    .eq("normalized_phone", context.normalizedPhone)
    .maybeSingle();

  const dryRun = buildGHLDryRunPayload(context, existingContact?.ghl_contact_id || null);

  const { data: rows, error } = await client.database
    .from("wa_ghl_sync_log")
    .insert({
      inbound_message_id: context.inboundId || null,
      normalized_phone: context.normalizedPhone || null,
      intent: context.intent || null,
      sync_mode: "dry_run",
      action: dryRun.action,
      payload: {
        contact: dryRun.contact,
        note: dryRun.note,
        task: dryRun.task,
        tags: dryRun.tags,
        customFields: dryRun.customFields,
      },
      protected_fields: dryRun.protected_fields,
      would_create_contact: dryRun.would_create_contact,
      would_update_contact: dryRun.would_update_contact,
      would_create_task: dryRun.would_create_task,
      would_add_tags: dryRun.would_add_tags,
      would_add_note: dryRun.would_add_note,
      status: "dry_run",
    })
    .select("id")
    .limit(1);

  if (error) {
    throw new Error(`Insert wa_ghl_sync_log failed: ${error.message || String(error)}`);
  }

  return {
    synced: false,
    dry_run: true,
    ghl_sync_log_id: rows?.[0]?.id || null,
    ...dryRun,
  };
}

module.exports = {
  GHL_PROTECTED_FIELDS,
  GHL_WA_WRITABLE_FIELDS,
  INTENT_TAG_MAP,
  getIntentTag,
  shouldCreateTaskDryRun,
  buildGHLDryRunPayload,
  syncGHLContactDryRun,
};
