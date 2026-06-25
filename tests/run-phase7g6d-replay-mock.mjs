#!/usr/bin/env node
/**
 * Mock replay: humano → Gracias → Bye (post-deploy 7G.6D).
 */
const ENDPOINT =
  "https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound";
const FROM = process.env.REPLAY_PHONE || "+529991525583";
const TO = "+529994538421";
const DELAY = 2000;

const STEPS = [
  {
    text: "Quiero hablar con asesor",
    expect: {
      intent: "humano",
      wa_stage: "asesor_requerido",
      wa_needs_human: true,
      ghl_would_create_task: true,
      no_menu: true,
    },
  },
  {
    text: "Gracias",
    expect: {
      intent: "agradecimiento",
      wa_stage: "asesor_requerido",
      wa_needs_human: true,
      ghl_would_create_task: false,
      no_menu: true,
      must_include: ["seguimiento"],
    },
  },
  {
    text: "Bye",
    expect: {
      intent: "despedida",
      wa_stage: "asesor_requerido",
      wa_needs_human: true,
      ghl_would_create_task: false,
      no_menu: true,
      must_include: ["Hasta pronto"],
    },
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(text, n) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "whatsapp.inbound_message.received",
      from: FROM,
      to: TO,
      message_id: `7g6d-replay-${n}-${Date.now()}`,
      message_type: "text",
      message_text: text,
      timestamp: new Date().toISOString(),
    }),
  });
  return { http: res.status, body: await res.json().catch(() => ({})) };
}

function check(step, body) {
  const issues = [];
  const e = step.expect;
  if (body.mode !== "mock") issues.push(`mode=${body.mode}`);
  if (body.ghl_live) issues.push("ghl_live=true");
  if (body.outbound_real) issues.push("outbound_real=true");
  if (e.intent && body.intent !== e.intent) issues.push(`intent=${body.intent}`);
  if (e.wa_stage && body.wa_stage !== e.wa_stage) issues.push(`wa_stage=${body.wa_stage}`);
  if (e.wa_needs_human !== undefined && body.wa_needs_human !== e.wa_needs_human) {
    issues.push(`wa_needs_human=${body.wa_needs_human}`);
  }
  if (e.ghl_would_create_task !== undefined && body.ghl_would_create_task !== e.ghl_would_create_task) {
    issues.push(`ghl_would_create_task=${body.ghl_would_create_task}`);
  }
  if (e.no_menu && body.response_text?.includes("Carreras disponibles\n2.")) {
    issues.push("menu_detected");
  }
  if (e.no_menu && body.response_text?.includes("1. Carreras disponibles")) {
    issues.push("menu_detected");
  }
  for (const s of e.must_include || []) {
    if (!String(body.response_text || "").includes(s)) issues.push(`missing:${s}`);
  }
  if (body.academic_enriched === true && (body.intent === "agradecimiento" || body.intent === "despedida")) {
    issues.push("academic_enriched=true");
  }
  if (body.eva_llm_rephrased === true && (body.intent === "agradecimiento" || body.intent === "despedida")) {
    issues.push("eva_llm_rephrased=true");
  }
  return issues;
}

async function main() {
  console.log(`7G.6D replay mock → ${FROM}\n`);
  let pass = 0;
  let fail = 0;

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    process.stdout.write(`${i + 1}. "${step.text}" ... `);
    const { http, body } = await post(step.text, i + 1);
    const issues = check(step, body);
    if (http === 200 && issues.length === 0) {
      pass++;
      console.log(`PASS (${body.intent}, stage=${body.wa_stage})`);
    } else {
      fail++;
      console.log(`FAIL http=${http} ${issues.join(", ")}`);
      if (issues.length) console.log(JSON.stringify({
        intent: body.intent,
        wa_stage: body.wa_stage,
        wa_needs_human: body.wa_needs_human,
        academic_skipped: body.academic_skipped,
        eva_llm_block_reason: body.eva_llm_block_reason,
        snippet: String(body.response_text || "").slice(0, 120),
      }, null, 2));
    }
    await sleep(DELAY);
  }

  console.log(`\nReplay: ${pass}/${STEPS.length} PASS`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
