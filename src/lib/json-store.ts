import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Row = Record<string, unknown>;

type ScalarField = {
  kind: "scalar";
  name: string;
  type: string;
  optional: boolean;
  list: boolean;
  isId: boolean;
  unique: boolean;
  updatedAt: boolean;
  defaultNow: boolean;
  defaultCuid: boolean;
  defaultValue: unknown;
  hasDefault: boolean;
};

type RelationField = {
  kind: "relation";
  name: string;
  type: string;
  optional: boolean;
  list: boolean;
  relationName?: string;
  fields: string[];
  references: string[];
};

type Model = {
  name: string;
  fields: Map<string, ScalarField | RelationField>;
  scalars: ScalarField[];
  relations: RelationField[];
  ids: string[];
  uniques: string[][];
  rows: Row[];
};

type Where = Record<string, unknown>;

function storePath() {
  if (typeof window !== "undefined") return "data/store.json";
  if (process.env.DATA_FILE) return process.env.DATA_FILE;
  const bundled = path.join(process.cwd(), "data", "store.json");
  if (!process.env.AWS_EXECUTION_ENV) return bundled;
  const runtime = "/tmp/gic-store.json";
  if (!existsSync(runtime) && existsSync(bundled)) copyFileSync(bundled, runtime);
  return existsSync(runtime) ? runtime : bundled;
}

function camel(name: string) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function cuid() {
  return `c${Date.now().toString(36)}${randomBytes(8).toString("hex")}`;
}

function readCall(source: string, marker: string) {
  const start = source.indexOf(marker);
  if (start < 0) return undefined;
  let depth = 0;
  const from = start + marker.length;
  for (let index = from; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") depth += 1;
    else if (char === ")") {
      if (depth === 0) return source.slice(from, index);
      depth -= 1;
    }
  }
  return undefined;
}

function parseDefault(raw: string | undefined) {
  if (!raw) return { hasDefault: false, defaultNow: false, defaultCuid: false, defaultValue: undefined };
  const value = raw.trim();
  if (value === "now()") return { hasDefault: true, defaultNow: true, defaultCuid: false, defaultValue: undefined };
  if (value === "cuid()") return { hasDefault: true, defaultNow: false, defaultCuid: true, defaultValue: undefined };
  if (value === "true") return { hasDefault: true, defaultNow: false, defaultCuid: false, defaultValue: true };
  if (value === "false") return { hasDefault: true, defaultNow: false, defaultCuid: false, defaultValue: false };
  if (/^-?\d+(\.\d+)?$/.test(value)) return { hasDefault: true, defaultNow: false, defaultCuid: false, defaultValue: Number(value) };
  if (value.startsWith('"') && value.endsWith('"')) return { hasDefault: true, defaultNow: false, defaultCuid: false, defaultValue: value.slice(1, -1) };
  return { hasDefault: true, defaultNow: false, defaultCuid: false, defaultValue: value };
}

function parseSchema(source: string) {
  const models = new Map<string, Model>();
  const blocks = source.split(/\nmodel /).slice(1);
  for (const block of blocks) {
    const name = block.slice(0, block.indexOf(" "));
    const body = block.slice(block.indexOf("{") + 1, block.indexOf("\n}"));
    const model: Model = { name, fields: new Map(), scalars: [], relations: [], ids: [], uniques: [], rows: [] };
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//")) continue;
      if (line.startsWith("@@id")) {
        model.ids = [...line.matchAll(/(\w+)/g)].map((item) => item[1]).filter((item) => item !== "id");
        continue;
      }
      if (line.startsWith("@@unique")) {
        model.uniques.push([...line.matchAll(/(\w+)/g)].map((item) => item[1]).filter((item) => item !== "unique"));
        continue;
      }
      if (line.startsWith("@@")) continue;
      const match = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/);
      if (!match) continue;
      const [, fieldName, typeName, list, optional, rest] = match;
      if (models.has(typeName) || source.includes(`\nmodel ${typeName} `) || source.startsWith(`model ${typeName} `)) {
        const named = rest.match(/@relation\(\s*"([^"]+)"/);
        const fields = [...(rest.match(/fields:\s*\[([^\]]+)\]/)?.[1] ?? "").matchAll(/(\w+)/g)].map((item) => item[1]);
        const references = [...(rest.match(/references:\s*\[([^\]]+)\]/)?.[1] ?? "").matchAll(/(\w+)/g)].map((item) => item[1]);
        const relation: RelationField = {
          kind: "relation",
          name: fieldName,
          type: typeName,
          optional: Boolean(optional),
          list: Boolean(list),
          relationName: named?.[1],
          fields,
          references,
        };
        model.fields.set(fieldName, relation);
        model.relations.push(relation);
        continue;
      }
      const defaults = parseDefault(readCall(rest, "@default("));
      const scalar: ScalarField = {
        kind: "scalar",
        name: fieldName,
        type: typeName,
        optional: Boolean(optional),
        list: Boolean(list),
        isId: rest.includes("@id"),
        unique: rest.includes("@unique"),
        updatedAt: rest.includes("@updatedAt"),
        ...defaults,
      };
      model.fields.set(fieldName, scalar);
      model.scalars.push(scalar);
      if (scalar.isId) model.ids = [fieldName];
    }
    models.set(name, model);
  }
  for (const model of models.values()) {
    for (const relation of model.relations) {
      if (!models.has(relation.type)) {
        model.fields.delete(relation.name);
        model.relations = model.relations.filter((item) => item !== relation);
        const scalar: ScalarField = {
          kind: "scalar",
          name: relation.name,
          type: relation.type,
          optional: relation.optional,
          list: relation.list,
          isId: false,
          unique: false,
          updatedAt: false,
          hasDefault: false,
          defaultNow: false,
          defaultCuid: false,
          defaultValue: undefined,
        };
        model.fields.set(relation.name, scalar);
        model.scalars.push(scalar);
      }
    }
  }
  return models;
}

function time(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).getTime();
  return null;
}

function same(left: unknown, right: unknown) {
  const leftTime = time(left);
  const rightTime = time(right);
  if (leftTime !== null && rightTime !== null) return leftTime === rightTime;
  return left === right;
}

function compare(left: unknown, right: unknown) {
  const leftTime = time(left);
  const rightTime = time(right);
  if (leftTime !== null && rightTime !== null) return leftTime - rightTime;
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

class Store {
  models: Map<string, Model>;

  constructor() {
    const schemaPath = typeof window !== "undefined" ? "prisma/schema.prisma" : path.join(process.cwd(), "prisma", "schema.prisma");
    this.models = parseSchema(readFileSync(schemaPath, "utf8"));
    const file = storePath();
    if (existsSync(file)) {
      const saved = JSON.parse(readFileSync(file, "utf8")) as Record<string, Row[]>;
      for (const [name, rows] of Object.entries(saved)) {
        const model = this.models.get(name);
        if (model && Array.isArray(rows)) model.rows = rows;
      }
    }
  }

  reset() {
    for (const model of this.models.values()) model.rows = [];
    this.save();
  }

  save() {
    const file = storePath();
    mkdirSync(path.dirname(file), { recursive: true });
    const data: Record<string, Row[]> = {};
    for (const model of this.models.values()) data[model.name] = model.rows;
    writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  }

  model(name: string) {
    const model = this.models.get(name);
    if (!model) throw new Error(`Unknown collection ${name}`);
    return model;
  }
}

function backRelation(store: Store, relation: RelationField, parentName: string) {
  const target = store.model(relation.type);
  const candidates = target.relations.filter((item) => item.type === parentName && item.fields.length > 0);
  if (relation.relationName) {
    const named = candidates.find((item) => item.relationName === relation.relationName);
    if (named) return named;
  }
  if (candidates.length === 1) return candidates[0];
  const unnamed = candidates.filter((item) => !item.relationName);
  if (unnamed.length === 1) return unnamed[0];
  throw new Error(`Cannot resolve relation ${parentName}.${relation.name}`);
}

function relatedRows(store: Store, model: Model, row: Row, relation: RelationField) {
  const target = store.model(relation.type);
  if (relation.fields.length) {
    return target.rows.filter((other) => relation.references.every((reference, index) => same(other[reference], row[relation.fields[index]])));
  }
  const back = backRelation(store, relation, model.name);
  return target.rows.filter((other) => back.fields.every((field, index) => same(other[field], row[back.references[index]])));
}

function matchScalar(actual: unknown, expected: unknown): boolean {
  if (expected === null) return actual == null;
  if (expected instanceof Date || typeof expected !== "object" || Array.isArray(expected)) return same(actual, expected);
  const filter = expected as Record<string, unknown>;
  if ("equals" in filter) return same(actual, filter.equals);
  if ("in" in filter) return Array.isArray(filter.in) && filter.in.some((item) => same(actual, item));
  if ("notIn" in filter) return Array.isArray(filter.notIn) && !filter.notIn.some((item) => same(actual, item));
  if ("not" in filter) return !matchScalar(actual, filter.not);
  if ("contains" in filter) {
    const insensitive = filter.mode === "insensitive";
    const left = insensitive ? String(actual ?? "").toLowerCase() : String(actual ?? "");
    const right = insensitive ? String(filter.contains).toLowerCase() : String(filter.contains);
    return left.includes(right);
  }
  if ("startsWith" in filter) return String(actual ?? "").startsWith(String(filter.startsWith));
  if ("gt" in filter || "gte" in filter || "lt" in filter || "lte" in filter) {
    const delta = compare(actual, filter.gt ?? filter.gte ?? filter.lt ?? filter.lte);
    if ("gt" in filter) return compare(actual, filter.gt) > 0;
    if ("gte" in filter) return compare(actual, filter.gte) >= 0;
    if ("lt" in filter) return compare(actual, filter.lt) < 0;
    if ("lte" in filter) return compare(actual, filter.lte) <= 0;
    return delta === 0;
  }
  return same(actual, expected);
}

function match(store: Store, model: Model, row: Row, where?: Where): boolean {
  if (!where) return true;
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    if (key === "AND") {
      const list = Array.isArray(value) ? value : [value];
      if (!list.every((item) => match(store, model, row, item as Where))) return false;
      continue;
    }
    if (key === "OR") {
      const list = Array.isArray(value) ? value : [];
      if (!list.some((item) => match(store, model, row, item as Where))) return false;
      continue;
    }
    if (key === "NOT") {
      if (match(store, model, row, value as Where)) return false;
      continue;
    }
    const field = model.fields.get(key);
    if (!field) {
      if (value && typeof value === "object") {
        const expanded: Where = {};
        for (const [childKey, childValue] of Object.entries(value as Where)) expanded[childKey] = childValue;
        if (!match(store, model, row, expanded)) return false;
        continue;
      }
      return false;
    }
    if (field.kind === "relation") {
      const related = relatedRows(store, model, row, field);
      const filter = value as Where;
      if (filter && typeof filter === "object" && "some" in filter) {
        if (!related.some((item) => match(store, store.model(field.type), item, filter.some as Where))) return false;
      } else if (filter && typeof filter === "object" && "every" in filter) {
        if (!related.every((item) => match(store, store.model(field.type), item, filter.every as Where))) return false;
      } else if (filter && typeof filter === "object" && "none" in filter) {
        if (related.some((item) => match(store, store.model(field.type), item, filter.none as Where))) return false;
      } else if (!field.list) {
        const inner = filter && typeof filter === "object" && "is" in filter ? (filter.is as Where) : filter;
        const rowMatch = related[0];
        if (!rowMatch || !match(store, store.model(field.type), rowMatch, inner)) return false;
      } else return false;
    } else if (!matchScalar(row[key], value)) return false;
  }
  return true;
}

function sortRows(rows: Row[], orderBy: unknown) {
  const orders = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  if (!orders.length) return rows;
  return [...rows].sort((left, right) => {
    for (const order of orders) {
      const [field, direction] = Object.entries(order as Where)[0] ?? [];
      if (!field) continue;
      const delta = compare(left[field], right[field]);
      if (delta !== 0) return direction === "desc" ? -delta : delta;
    }
    return 0;
  });
}

function presentValue(field: ScalarField, value: unknown) {
  if (field.type === "DateTime" && typeof value === "string") return new Date(value);
  if (field.type === "Json" && value && typeof value === "object") return structuredClone(value);
  return value;
}

function presentRow(store: Store, model: Model, row: Row, args?: { include?: Where; select?: Where }) {
  if (args?.select) return shape(store, model, row, args.select, true);
  const output: Row = {};
  for (const field of model.scalars) output[field.name] = presentValue(field, row[field.name]);
  if (args?.include) {
    for (const [key, spec] of Object.entries(args.include)) {
      if (!spec) continue;
      if (key === "_count" && spec && typeof spec === "object") {
        const select = (spec as Where).select as Record<string, boolean> | undefined;
        const counts: Record<string, number> = {};
        for (const [name, enabled] of Object.entries(select ?? {})) {
          if (!enabled) continue;
          const relation = model.fields.get(name);
          if (relation?.kind === "relation") counts[name] = relatedRows(store, model, row, relation).length;
        }
        output._count = counts;
        continue;
      }
      output[key] = presentRelation(store, model, row, key, spec);
    }
  }
  return output;
}

function shape(store: Store, model: Model, row: Row, spec: Where, selecting: boolean) {
  const output: Row = {};
  for (const [key, value] of Object.entries(spec)) {
    if (!value) continue;
    const field = model.fields.get(key);
    if (!field) continue;
    if (field.kind === "scalar") output[key] = presentValue(field, row[key]);
    else output[key] = presentRelation(store, model, row, key, value === true ? (selecting ? { select: undefined } : true) : value);
  }
  return output;
}

function presentRelation(store: Store, model: Model, row: Row, key: string, spec: unknown) {
  const relation = model.fields.get(key);
  if (!relation || relation.kind !== "relation") return null;
  const target = store.model(relation.type);
  let rows = relatedRows(store, model, row, relation);
  const nested = spec && typeof spec === "object" ? (spec as Where) : {};
  if (nested.where) rows = rows.filter((item) => match(store, target, item, nested.where as Where));
  rows = sortRows(rows, nested.orderBy);
  if (typeof nested.skip === "number") rows = rows.slice(nested.skip);
  if (typeof nested.take === "number") rows = rows.slice(0, nested.take);
  const args = { include: nested.include as Where | undefined, select: nested.select as Where | undefined };
  const presented = rows.map((item) => presentRow(store, target, item, args));
  return relation.list ? presented : presented[0] ?? null;
}

function writeValue(field: ScalarField, value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function applyDefaults(model: Model, row: Row, creating: boolean) {
  const now = new Date().toISOString();
  for (const field of model.scalars) {
    if (row[field.name] !== undefined) continue;
    if (field.defaultCuid || (field.isId && field.type === "String" && !field.hasDefault)) row[field.name] = cuid();
    else if (field.defaultNow || (creating && field.updatedAt)) row[field.name] = now;
    else if (field.hasDefault) row[field.name] = field.defaultValue;
    else if (field.list) row[field.name] = [];
    else if (field.updatedAt) row[field.name] = now;
  }
}

function stampChild(store: Store, parent: Model, parentRow: Row, relation: RelationField, child: Where) {
  if (relation.fields.length) return;
  const back = backRelation(store, relation, parent.name);
  for (let index = 0; index < back.fields.length; index += 1) {
    if (child[back.fields[index]] == null) child[back.fields[index]] = parentRow[back.references[index]];
  }
}

function expandWhere(model: Model, where?: Where) {
  if (!where) return {};
  const expanded: Where = {};
  for (const [key, value] of Object.entries(where)) {
    if (!model.fields.has(key) && value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(expanded, value);
    } else expanded[key] = value;
  }
  return expanded;
}

function delegate(store: Store, model: Model) {
  const insert = (data: Where) => {
    const row: Row = {};
    const nested: Array<[RelationField, Where]> = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const field = model.fields.get(key);
      if (!field) throw new Error(`${model.name}.${key} is not a field`);
      if (field.kind === "relation") nested.push([field, value as Where]);
      else row[key] = writeValue(field, value);
    }
    applyDefaults(model, row, true);
    model.rows.push(row);
    for (const [relation, value] of nested) {
      const creates = value.create ? (Array.isArray(value.create) ? value.create : [value.create]) : [];
      const many = value.createMany && typeof value.createMany === "object" && "data" in value.createMany ? value.createMany.data : [];
      for (const item of [...creates, ...(Array.isArray(many) ? many : [])]) {
        const child = { ...(item as Where) };
        stampChild(store, model, row, relation, child);
        delegate(store, store.model(relation.type)).create({ data: child });
      }
    }
    return row;
  };

  return {
    findMany: async (args: { where?: Where; include?: Where; select?: Where; orderBy?: unknown; take?: number; skip?: number } = {}) => {
      let rows = model.rows.filter((row) => match(store, model, row, expandWhere(model, args.where)));
      rows = sortRows(rows, args.orderBy);
      if (args.skip) rows = rows.slice(args.skip);
      if (args.take !== undefined) rows = rows.slice(0, args.take);
      return rows.map((row) => presentRow(store, model, row, args));
    },
    findFirst: async (args: { where?: Where; include?: Where; select?: Where; orderBy?: unknown } = {}) => {
      const rows = await delegate(store, model).findMany({ ...args, take: 1 });
      return rows[0] ?? null;
    },
    findUnique: async (args: { where: Where; include?: Where; select?: Where }) => {
      const rows = model.rows.filter((row) => match(store, model, row, expandWhere(model, args.where)));
      if (rows.length > 1) throw new Error(`${model.name} lookup matched ${rows.length} records`);
      return rows[0] ? presentRow(store, model, rows[0], args) : null;
    },
    count: async (args: { where?: Where } = {}) => model.rows.filter((row) => match(store, model, row, expandWhere(model, args.where))).length,
    create: async (args: { data: Where; include?: Where; select?: Where }) => {
      const row = insert(args.data);
      store.save();
      return presentRow(store, model, row, args);
    },
    createMany: async (args: { data: Where[] }) => {
      for (const item of args.data) insert(item);
      store.save();
      return { count: args.data.length };
    },
    update: async (args: { where: Where; data: Where; include?: Where; select?: Where }) => {
      const row = model.rows.find((item) => match(store, model, item, expandWhere(model, args.where)));
      if (!row) throw new Error(`${model.name} record was not found`);
      for (const [key, value] of Object.entries(args.data)) {
        const field = model.fields.get(key);
        if (!field || field.kind !== "scalar") continue;
        if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && field.type !== "Json") {
          const operator = value as { increment?: number; decrement?: number; set?: unknown };
          if (operator.increment !== undefined) row[key] = Number(row[key] ?? 0) + operator.increment;
          else if (operator.decrement !== undefined) row[key] = Number(row[key] ?? 0) - operator.decrement;
          else if ("set" in operator) row[key] = writeValue(field, operator.set);
          else row[key] = writeValue(field, value);
        } else row[key] = writeValue(field, value);
      }
      const updated = model.scalars.find((field) => field.updatedAt);
      if (updated && args.data[updated.name] === undefined) row[updated.name] = new Date().toISOString();
      store.save();
      return presentRow(store, model, row, args);
    },
    updateMany: async (args: { where?: Where; data: Where }) => {
      const rows = model.rows.filter((row) => match(store, model, row, expandWhere(model, args.where)));
      for (const row of rows) await delegate(store, model).update({ where: idWhere(model, row), data: args.data });
      return { count: rows.length };
    },
    deleteMany: async (args: { where?: Where } = {}) => {
      const before = model.rows.length;
      model.rows = model.rows.filter((row) => !match(store, model, row, expandWhere(model, args.where)));
      store.save();
      return { count: before - model.rows.length };
    },
    upsert: async (args: { where: Where; create: Where; update: Where }) => {
      const existing = model.rows.find((row) => match(store, model, row, expandWhere(model, args.where)));
      if (!existing) return delegate(store, model).create({ data: args.create });
      return delegate(store, model).update({ where: args.where, data: args.update });
    },
    groupBy: async (args: { by: string[]; where?: Where; _count?: { _all?: boolean } | boolean }) => {
      const rows = model.rows.filter((row) => match(store, model, row, expandWhere(model, args.where)));
      const groups = new Map<string, { values: Row; count: number }>();
      for (const row of rows) {
        const values: Row = {};
        for (const field of args.by) values[field] = row[field];
        const key = JSON.stringify(values);
        const group = groups.get(key) ?? { values, count: 0 };
        group.count += 1;
        groups.set(key, group);
      }
      return [...groups.values()].map((group) => ({ ...group.values, _count: { _all: group.count } }));
    },
  };
}

function idWhere(model: Model, row: Row) {
  const where: Where = {};
  const keys = model.ids.length ? model.ids : model.scalars.filter((field) => field.isId).map((field) => field.name);
  for (const key of keys) where[key] = row[key];
  return where;
}

export function createJsonPrisma() {
  const store = new Store();
  const client: Record<string, unknown> = {
    $transaction: async (operations: Promise<unknown>[]) => {
      const results = [];
      for (const operation of operations) results.push(await operation);
      return results;
    },
    $reset: async () => store.reset(),
    $disconnect: async () => undefined,
    $queryRaw: async () => [],
    $executeRawUnsafe: async (sql: string) => {
      if (sql.includes("TRUNCATE")) store.reset();
      return 0;
    },
  };
  for (const model of store.models.values()) client[camel(model.name)] = delegate(store, model);
  return client;
}
