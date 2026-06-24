/**
 * In-memory InsForge DB mock for WA E2E tests (WA_E2E_MOCK_DB=true).
 * Implements the subset of @insforge/sdk used by ycloud-wa-inbound.js.
 */

const tables = {
  wa_inbound_messages: [],
  wa_outbound_messages: [],
  wa_contacts_state: [],
  wa_ghl_sync_log: [],
  wa_llm_shadow_log: [],
  wa_errors: [],
};

let idSeq = 1;

function nextId() {
  return `mock-${idSeq++}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.op = "select";
    this.payload = null;
    this.filters = [];
    this.selectFields = "*";
    this.limitN = null;
    this.single = false;
  }

  insert(data) {
    this.op = "insert";
    this.payload = data;
    return this;
  }

  update(data) {
    this.op = "update";
    this.payload = data;
    return this;
  }

  select(fields) {
    this.selectFields = fields;
    return this;
  }

  eq(column, value) {
    this.filters.push({ column, value });
    return this;
  }

  limit(n) {
    this.limitN = n;
    return this;
  }

  maybeSingle() {
    this.single = true;
    return this.execute();
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    try {
      const rows = tables[this.table];
      if (!rows) {
        return { data: null, error: { message: `Unknown table ${this.table}` } };
      }

      if (this.op === "insert") {
        const row = {
          id: nextId(),
          created_at: new Date().toISOString(),
          ...clone(this.payload),
        };
        rows.push(row);
        let data = [row];
        if (this.selectFields && this.selectFields !== "*") {
          const fields = String(this.selectFields)
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean);
          data = [fields.reduce((acc, f) => ({ ...acc, [f]: row[f] }), {})];
        }
        if (this.limitN) data = data.slice(0, this.limitN);
        return { data, error: null };
      }

      if (this.op === "update") {
        const matches = rows.filter((row) =>
          this.filters.every((f) => row[f.column] === f.value),
        );
        for (const row of matches) {
          Object.assign(row, clone(this.payload));
        }
        return { data: matches, error: null };
      }

      let matched = rows.filter((row) =>
        this.filters.every((f) => row[f.column] === f.value),
      );
      if (this.limitN) matched = matched.slice(0, this.limitN);
      if (this.single) {
        return { data: matched[0] || null, error: null };
      }
      return { data: matched, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message || String(err) } };
    }
  }
}

function createDatabase() {
  return {
    from(table) {
      return new QueryBuilder(table);
    },
  };
}

export function resetMockInsforgeStore() {
  for (const key of Object.keys(tables)) {
    tables[key] = [];
  }
  idSeq = 1;
}

export function getMockInsforgeStore() {
  return {
    wa_inbound_messages: [...tables.wa_inbound_messages],
    wa_outbound_messages: [...tables.wa_outbound_messages],
    wa_contacts_state: [...tables.wa_contacts_state],
    wa_ghl_sync_log: [...tables.wa_ghl_sync_log],
    wa_llm_shadow_log: [...tables.wa_llm_shadow_log],
    wa_errors: [...tables.wa_errors],
  };
}

export function getMockInsforgeClient() {
  return { database: createDatabase() };
}

export function countMockErrorsSince(minutesAgo = 10) {
  const cutoff = Date.now() - minutesAgo * 60 * 1000;
  return tables.wa_errors.filter((row) => {
    const ts = Date.parse(row.created_at || "");
    return Number.isFinite(ts) && ts >= cutoff;
  }).length;
}
