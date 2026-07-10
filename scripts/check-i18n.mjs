#!/usr/bin/env node
/**
 * i18n guardrail. Run by `npm run check:i18n` and automatically before `npm run build`
 * (as the `prebuild` script), so half-translated or hardcoded copy can't ship.
 *
 * Fatal checks (exit 1):
 *   1. Key parity        - en / es / ca must share the exact same key set.
 *   2. Placeholder parity - {{vars}} and <tags> must match across languages per key.
 *   3. Referenced keys    - every static t('key') / i18nKey="key" must exist in en.json.
 *   4. Hardcoded copy      - inline JSX text and translatable props must go through t().
 *
 * Escape hatches for the copy scan:
 *   - put `i18n-ignore` in a comment to skip that line and the next few (e.g. legal/attribution text);
 *   - put `i18n-exempt` anywhere in a file to skip the whole file (e.g. unused legacy screens).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOCALES_DIR = join(ROOT, 'src/i18n/locales')
const SRC_DIR = join(ROOT, 'src')
const LANGS = ['en', 'es', 'ca']
const BASE = 'en'
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other']

const errors = []
const warnings = []

// --- load + flatten locale dicts -------------------------------------------
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, key, out)
    else out[key] = v
  }
  return out
}

const flat = {}
for (const lang of LANGS) {
  const raw = readFileSync(join(LOCALES_DIR, `${lang}.json`), 'utf8')
  flat[lang] = flatten(JSON.parse(raw))
}

// --- 1. key parity ----------------------------------------------------------
const baseKeys = new Set(Object.keys(flat[BASE]))
for (const lang of LANGS) {
  if (lang === BASE) continue
  const keys = new Set(Object.keys(flat[lang]))
  for (const k of baseKeys) if (!keys.has(k)) errors.push(`[parity] "${k}" missing in ${lang}.json (present in ${BASE}.json)`)
  for (const k of keys) if (!baseKeys.has(k)) errors.push(`[parity] "${k}" in ${lang}.json but missing in ${BASE}.json`)
}

// --- 2. placeholder / tag parity -------------------------------------------
const tokensOf = (s) => new Set(String(s).match(/\{\{\s*[\w]+\s*\}\}/g)?.map((t) => t.replace(/\s/g, '')) ?? [])
const tagsOf = (s) => new Set(String(s).match(/<\/?[a-zA-Z][\w]*>/g)?.map((t) => t.replace(/\s/g, '')) ?? [])
const setEq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x))
for (const k of baseKeys) {
  const baseTokens = tokensOf(flat[BASE][k])
  const baseTags = tagsOf(flat[BASE][k])
  for (const lang of LANGS) {
    if (lang === BASE || !(k in flat[lang])) continue
    if (!setEq(baseTokens, tokensOf(flat[lang][k])))
      errors.push(`[placeholder] "${k}" variables differ between ${BASE} (${[...baseTokens].join(',') || '∅'}) and ${lang} (${[...tokensOf(flat[lang][k])].join(',') || '∅'})`)
    if (!setEq(baseTags, tagsOf(flat[lang][k])))
      errors.push(`[tags] "${k}" tags differ between ${BASE} (${[...baseTags].join(',') || '∅'}) and ${lang} (${[...tagsOf(flat[lang][k])].join(',') || '∅'})`)
  }
}

// --- gather source files ----------------------------------------------------
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (name === 'locales' || name === 'node_modules') continue
      walk(p, out)
    } else if (/\.tsx?$/.test(name)) out.push(p)
  }
  return out
}
const files = walk(SRC_DIR)

// --- 3. referenced keys exist ----------------------------------------------
// A key is satisfied if it exists exactly, or as a plural/array/object base.
function keyExists(k) {
  if (baseKeys.has(k)) return true
  for (const suf of PLURAL_SUFFIXES) if (baseKeys.has(k + suf)) return true
  for (const bk of baseKeys) if (bk.startsWith(k + '.')) return true // array / object base
  return false
}
const KEY_RE = /(?:\bt\(\s*|\bi18nKey\s*=\s*)['"]([\w.]+)['"]/g
for (const file of files) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(KEY_RE)) {
    const key = m[1]
    if (!keyExists(key)) errors.push(`[missing-key] ${relative(ROOT, file)} references t('${key}') but it is not in ${BASE}.json`)
  }
}

// --- 4. hardcoded copy scan (.tsx only, where JSX lives) --------------------
// Prose = >=2 word-ish tokens, at least one with 3+ letters. Skips symbols,
// single words (brand names), counters like "· 7d" or "+72 PTS".
function isProse(s) {
  const words = s.trim().split(/\s+/).filter((w) => /\p{L}{2,}/u.test(w))
  return words.length >= 2 && words.some((w) => /\p{L}{3,}/u.test(w))
}
const TRANSLATABLE_PROPS = ['placeholder', 'aria-label', 'title', 'alt']
for (const file of files) {
  if (!file.endsWith('.tsx')) continue
  const src = readFileSync(file, 'utf8')
  if (src.includes('i18n-exempt')) continue
  const lines = src.split('\n')
  let ignoreUntil = -1
  lines.forEach((line, i) => {
    if (line.includes('i18n-ignore')) {
      ignoreUntil = i + 3
      return
    }
    if (i <= ignoreUntil) return
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
    const where = `${relative(ROOT, file)}:${i + 1}`

    // inline JSX text immediately before a closing tag: >some words</ (reliable UI copy).
    // Requiring the closing "</" avoids TS arrows (=>), generics (Map<T>), and comparisons (>=, <=).
    for (const m of line.matchAll(/>([^<>{}\n]+)<\//g)) {
      if (isProse(m[1])) errors.push(`[hardcoded] ${where} inline text "${m[1].trim()}" - wrap in t()`)
    }
    // translatable literal props: placeholder="…" etc. (use ={t()} instead)
    for (const prop of TRANSLATABLE_PROPS) {
      for (const m of line.matchAll(new RegExp(`${prop}\\s*=\\s*"([^"]+)"`, 'g'))) {
        if (isProse(m[1])) errors.push(`[hardcoded] ${where} ${prop}="${m[1]}" - use ${prop}={t()}`)
      }
    }
    // bare JSX text on its own line. Excludes quoted values (style objects) and TypeScript
    // syntax (type annotations, unions, optionals, import members) so only real prose is flagged.
    if (
      isProse(trimmed) &&
      !/['"`]/.test(trimmed) &&
      !/[<>{}=()[\];:?|]/.test(trimmed) &&
      !/,\s*$/.test(trimmed) &&
      !/\bas\b/.test(trimmed) &&
      !/^(import|export|const|let|var|return|function|type|interface|else|case|default|new|await|yield)\b/.test(trimmed)
    ) {
      errors.push(`[hardcoded] ${where} bare text "${trimmed}" - wrap in t() or add an i18n-ignore comment`)
    }
  })
}

// --- report -----------------------------------------------------------------
if (warnings.length) {
  console.warn(`\n⚠️  i18n warnings (${warnings.length}):`)
  for (const w of warnings) console.warn('   ' + w)
}
if (errors.length) {
  console.error(`\n❌ i18n check failed (${errors.length} error${errors.length === 1 ? '' : 's'}):`)
  for (const e of errors) console.error('   ' + e)
  console.error('\nFix the above, or add an i18n-ignore / i18n-exempt comment for intentional exceptions.\n')
  process.exit(1)
}
console.log(`✅ i18n check passed - ${baseKeys.size} keys × ${LANGS.length} languages in sync, no hardcoded copy.`)
