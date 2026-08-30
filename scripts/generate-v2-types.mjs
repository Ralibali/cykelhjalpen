#!/usr/bin/env node
// Generates the V2 additions to src/integrations/supabase/types.ts FROM the
// migration SQL (no live Supabase access exists). Single source of truth =
// supabase/migrations/*v2*.sql. Output follows the supabase codegen format so
// the typed client (Database) works for every v2_* table/view/RPC/enum and
// the V2 columns added to workshops / workshop_responses /
// bike_repair_requests.
//
// Usage:
//   node scripts/generate-v2-types.mjs           # rewrite types.ts in place
//   node scripts/generate-v2-types.mjs --check   # exit 1 if types.ts is stale
//
// The script only rewrites text between // __V2GEN_*_START__ / _END__ markers
// in types.ts; everything else is untouched.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations')
const TYPES_FILE = join(ROOT, 'src', 'integrations', 'supabase', 'types.ts')

// ---------------------------------------------------------------------------
// SQL parsing (deliberately small: the V2 migrations follow a fixed style)
// ---------------------------------------------------------------------------

function splitTopLevel(body) {
  const parts = []
  let depth = 0
  let cur = ''
  for (const ch of body) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim()) parts.push(cur)
  return parts
}

const KNOWN_TYPES = [
  'timestamp with time zone',
  'timestamp without time zone',
  'double precision',
  'timestamptz',
  'smallint',
  'integer',
  'boolean',
  'numeric',
  'bigint',
  'jsonb',
  'json',
  'uuid',
  'text',
  'date',
  'time',
]

function parseColumn(def) {
  const m = def.trim().match(/^(\w+)\s+([\s\S]+)$/)
  if (!m) return null
  const [, name, rest] = m
  const lower = rest.toLowerCase().trim()

  let sqlType = null
  const enumMatch = lower.match(/^public\.(v2_\w+)/)
  if (enumMatch) {
    sqlType = `public.${enumMatch[1]}`
  } else {
    for (const t of KNOWN_TYPES) {
      if (lower.startsWith(t)) {
        sqlType = t
        break
      }
    }
  }
  if (!sqlType) throw new Error(`unrecognized column type in: ${def.trim()}`)
  if (lower.startsWith(`${sqlType}[]`) || lower.startsWith(`${sqlType} []`)) sqlType += '[]'

  return {
    name,
    sqlType,
    // PRIMARY KEY implies NOT NULL even without the explicit keyword.
    nullable: !/\bnot null\b/.test(lower) && !/\bprimary key\b/.test(lower),
    hasDefault: /\bdefault\b/.test(lower) || /generated always as identity/.test(lower),
    ref: rest.match(/references\s+public\.(\w+)\s*\((\w+)\)/i),
  }
}

function parseMigrations(sql) {
  const enums = {}
  const tables = {}
  const addedColumns = {}
  const functions = {}

  for (const m of sql.matchAll(
    /create\s+type\s+public\.(\w+)\s+as\s+enum\s*\(([^)]*)\)/gis,
  )) {
    enums[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((v) => v[1])
  }

  for (const m of sql.matchAll(
    /create\s+table\s+public\.(\w+)\s*\(([\s\S]*?)\n\);/gi,
  )) {
    const cols = []
    for (const part of splitTopLevel(m[2])) {
      const t = part.trim()
      if (/^(check|unique|primary key|foreign key|constraint|exclude)\b/i.test(t)) continue
      const col = parseColumn(t)
      if (col) cols.push(col)
    }
    tables[m[1]] = cols
  }

  for (const m of sql.matchAll(
    /alter\s+table\s+public\.(\w+)\s+((?:add\s+column[\s\S]*?));/gi,
  )) {
    const cols = []
    for (const part of splitTopLevel(m[2])) {
      const t = part.trim().replace(/^add\s+column\s+/i, '')
      const col = parseColumn(t)
      if (col) cols.push(col)
    }
    addedColumns[m[1]] = [...(addedColumns[m[1]] ?? []), ...cols]
  }

  for (const m of sql.matchAll(
    /create\s+or\s+replace\s+function\s+public\.(\w+)\s*\(([\s\S]*?)\)\s*returns\s+([\w.]+)/gi,
  )) {
    const args = []
    for (const part of splitTopLevel(m[2])) {
      const t = part.trim()
      if (!t) continue
      const am = t.match(/^(\w+)\s+([\s\S]+)$/)
      if (!am) continue
      const col = parseColumn(t)
      if (col) args.push({ name: am[1], sqlType: col.sqlType, optional: /\bdefault\b/i.test(am[2]) })
    }
    functions[m[1]] = { args, returns: m[3].toLowerCase() }
  }

  return { enums, tables, addedColumns, functions }
}

// ---------------------------------------------------------------------------
// Type mapping
// ---------------------------------------------------------------------------

function tsType(sqlType, enums) {
  const base = sqlType.replace(/\[\]$/, '')
  const isArray = sqlType.endsWith('[]')
  let ts
  if (base.startsWith('public.')) {
    const enumName = base.slice('public.'.length)
    if (!enums[enumName]) throw new Error(`unknown enum type ${base}`)
    ts = `Database["public"]["Enums"]["${enumName}"]`
  } else {
    switch (base) {
      case 'text':
      case 'uuid':
      case 'time':
        ts = 'string'
        break
      case 'timestamptz':
      case 'timestamp with time zone':
      case 'timestamp without time zone':
      case 'date':
        ts = 'string'
        break
      case 'integer':
      case 'smallint':
      case 'bigint':
      case 'numeric':
      case 'double precision':
        ts = 'number'
        break
      case 'boolean':
        ts = 'boolean'
        break
      case 'jsonb':
      case 'json':
        ts = 'Json'
        break
      default:
        throw new Error(`no TS mapping for ${sqlType}`)
    }
  }
  return isArray ? `${ts === 'Json' ? 'Json' : ts}[]` : ts
}

// Views: column types cannot be derived from a SELECT list reliably, so they
// are pinned here against the view DDL + contract §2.4 (all view columns are
// nullable per supabase codegen convention).
const VIEW_SPECS = {
  v2_public_workshop_directory: {
    workshop_id: 'string | null',
    slug: 'string | null',
    company_name: 'string | null',
    city: 'string | null',
    city_slug: 'string | null',
    cluster_slug: 'string | null',
    services: 'string[] | null',
    areas_served: 'string[] | null',
    logo_url: 'string | null',
    website: 'string | null',
    bio_short: 'string | null',
    created_year: 'number | null',
    published_review_count: 'number | null',
    avg_rating: 'number | null',
    last_review_at: 'string | null',
  },
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

const pad = (n) => ' '.repeat(n)

function colLine(col, enums, indent, mode) {
  const t = tsType(col.sqlType, enums) + (col.nullable ? ' | null' : '')
  const optional =
    mode === 'Update' || (mode === 'Insert' && (col.nullable || col.hasDefault)) ? '?' : ''
  return `${pad(indent)}${col.name}${optional}: ${t}`
}

function genTable(name, cols, enums) {
  const sorted = [...cols].sort((a, b) => a.name.localeCompare(b.name))
  const lines = []
  lines.push(`${pad(6)}${name}: {`)
  for (const mode of ['Row', 'Insert', 'Update']) {
    lines.push(`${pad(8)}${mode}: {`)
    for (const c of sorted) lines.push(colLine(c, enums, 10, mode))
    lines.push(`${pad(8)}}`)
  }
  const refs = sorted.filter((c) => c.ref)
  if (refs.length === 0) {
    lines.push(`${pad(8)}Relationships: []`)
  } else {
    lines.push(`${pad(8)}Relationships: [`)
    for (const c of refs) {
      lines.push(`${pad(10)}{`)
      lines.push(`${pad(12)}foreignKeyName: "${name}_${c.name}_fkey"`)
      lines.push(`${pad(12)}columns: ["${c.name}"]`)
      lines.push(`${pad(12)}isOneToOne: false`)
      lines.push(`${pad(12)}referencedRelation: "${c.ref[1]}"`)
      lines.push(`${pad(12)}referencedColumns: ["${c.ref[2]}"]`)
      lines.push(`${pad(10)}},`)
    }
    lines.push(`${pad(8)}]`)
  }
  lines.push(`${pad(6)}}`)
  return lines.join('\n')
}

function genView(name, spec) {
  const keys = Object.keys(spec).sort()
  const lines = [`${pad(6)}${name}: {`]
  lines.push(`${pad(8)}Row: {`)
  for (const k of keys) lines.push(`${pad(10)}${k}: ${spec[k]}`)
  lines.push(`${pad(8)}}`)
  for (const mode of ['Insert', 'Update']) {
    lines.push(`${pad(8)}${mode}: {`)
    for (const k of keys) lines.push(`${pad(10)}${k}?: ${spec[k]}`)
    lines.push(`${pad(8)}}`)
  }
  lines.push(`${pad(8)}Relationships: []`)
  lines.push(`${pad(6)}}`)
  return lines.join('\n')
}

function genFunction(name, fn, enums) {
  const lines = [`${pad(6)}${name}: {`]
  const sorted = [...fn.args].sort((a, b) => a.name.localeCompare(b.name))
  if (sorted.length === 0) {
    lines.push(`${pad(8)}Args: Record<PropertyKey, never>`)
  } else if (sorted.every((a) => !a.optional) && sorted.length <= 3) {
    const inner = sorted.map((a) => `${a.name}: ${tsType(a.sqlType, enums)}`).join('; ')
    lines.push(`${pad(8)}Args: { ${inner} }`)
  } else {
    lines.push(`${pad(8)}Args: {`)
    for (const a of sorted) {
      lines.push(`${pad(10)}${a.name}${a.optional ? '?' : ''}: ${tsType(a.sqlType, enums)}`)
    }
    lines.push(`${pad(8)}}`)
  }
  let ret
  if (fn.returns === 'jsonb' || fn.returns === 'json') ret = 'Json'
  else if (fn.returns === 'trigger') ret = 'unknown'
  else if (fn.returns === 'void') ret = 'undefined'
  else ret = tsType(fn.returns, enums)
  lines.push(`${pad(8)}Returns: ${ret}`)
  lines.push(`${pad(6)}}`)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Marker-based injection
// ---------------------------------------------------------------------------

function replaceRegion(source, marker, content) {
  const start = `__V2GEN_${marker}_START__`
  const end = `__V2GEN_${marker}_END__`
  const re = new RegExp(
    `(// ${start}[^\\n]*)\\n[\\s\\S]*?([ ]*// ${end})`,
  )
  if (!re.test(source)) throw new Error(`marker ${marker} not found in types.ts`)
  const body = content ? `${content}\n` : ''
  return source.replace(re, `$1\n${body}$2`)
}

function main() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => /v2/i.test(f) && f.endsWith('.sql'))
    .sort()
  const sql = files
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n')
    // Strip line comments: rollback notes mention DDL (e.g. "CREATE OR REPLACE
    // FUNCTION ...") that must not be parsed as live schema.
    .replace(/--[^\n]*/g, '')
  const { enums, tables, addedColumns, functions } = parseMigrations(sql)

  const v2Tables = Object.keys(tables)
    .filter((t) => t.startsWith('v2_'))
    .sort()
  const v2Functions = Object.keys(functions)
    .filter((f) => f.startsWith('v2_'))
    .sort()
  const v2Enums = Object.keys(enums)
    .filter((e) => e.startsWith('v2_'))
    .sort()

  const tablesBlock = v2Tables.map((t) => genTable(t, tables[t], enums)).join('\n')
  const viewsBlock = Object.keys(VIEW_SPECS)
    .sort()
    .map((v) => genView(v, VIEW_SPECS[v]))
    .join('\n')
  const functionsBlock = v2Functions.map((f) => genFunction(f, functions[f], enums)).join('\n')
  const enumsBlock = v2Enums
    .map(
      (e) =>
        `${pad(6)}${e}: ${enums[e].map((v) => JSON.stringify(v)).join(' | ')}`,
    )
    .join('\n')
  const constantsBlock = v2Enums
    .map(
      (e) =>
        `${pad(6)}${e}: [${enums[e].map((v) => JSON.stringify(v)).join(', ')}],`,
    )
    .join('\n')

  let source = readFileSync(TYPES_FILE, 'utf8')
  const next = (() => {
    let s = source
    s = replaceRegion(s, 'TABLES', tablesBlock)
    s = replaceRegion(s, 'VIEWS', viewsBlock)
    s = replaceRegion(s, 'FUNCTIONS', functionsBlock)
    s = replaceRegion(s, 'ENUMS', enumsBlock)
    s = replaceRegion(s, 'CONSTANTS', constantsBlock)
    for (const [table, cols] of Object.entries(addedColumns)) {
      const sorted = [...cols].sort((a, b) => a.name.localeCompare(b.name))
      for (const mode of ['Row', 'Insert', 'Update']) {
        const block = sorted.map((c) => colLine(c, enums, 10, mode)).join('\n')
        s = replaceRegion(s, `COLS_${table}_${mode}`, block)
      }
    }
    return s
  })()

  if (process.argv.includes('--check')) {
    if (next !== source) {
      console.error(
        'types.ts is stale — run `node scripts/generate-v2-types.mjs` to regenerate.',
      )
      process.exit(1)
    }
    console.log('types.ts is up to date with the V2 migrations.')
    return
  }

  if (next !== source) {
    writeFileSync(TYPES_FILE, next)
    console.log(`types.ts updated: ${v2Tables.length} tables, ${v2Enums.length} enums, ${Object.keys(VIEW_SPECS).length} views, ${v2Functions.length} functions.`)
  } else {
    console.log('types.ts already up to date.')
  }
}

main()
