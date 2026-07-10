# Ombra conventions

## Localization (required for all user-facing copy)

Ombra ships in **Spanish (default), Catalan, and English** via `react-i18next`. Every
string a user can read MUST go through `t()` and exist in all three locale files.

- Locale dicts: `src/i18n/locales/{en,es,ca}.json`. English is the source of truth; keys
  are namespaced by screen (`welcome.*`, `terrace.*`, `errors.checkin.*`, ...).
- In components: `const { t } = useTranslation()` then `t('screen.key')`. For rich text
  (bold, colored spans, `<em>`) use `<Trans i18nKey="..." components={{ ... }} />`.
- Interpolation: `t('key', { name })` with `{{name}}` in the string. Plurals: add
  `key_one` / `key_other` and call `t('key', { count })`.
- The language switcher lives in the Profile screen; `setLang()` (`src/i18n/lang.ts`)
  persists the choice to `localStorage['ombra_lang']` and syncs `<html lang>`.
- Dates: pass the active locale from `getLang()` (never a hardcoded `'en'`).

### When adding a new screen or any new copy

1. Put every visible string in `t()`; never hardcode text in JSX or in `placeholder` /
   `aria-label` / `title` / `alt`.
2. Add the key to **all three** files (`en.json`, `es.json`, `ca.json`) with the same key
   path and the same `{{placeholders}}` / `<tags>`.
3. Run `npm run check:i18n`. It also runs automatically as `prebuild`, so a broken build
   (and Vercel deploy) is the safety net.

Names that are not copy (terrace names, `barri`, addresses, the "OMBRA" wordmark, the data
attribution footer) stay untranslated. Mark intentional exceptions with an `i18n-ignore`
comment on the line, or `i18n-exempt` anywhere in a file to skip the whole file.

## Writing style

- **No em-dashes (`—`) in user-facing copy.** Use periods, commas, or colons instead. This
  applies to all three locale files.

## Guardrail: `scripts/check-i18n.mjs`

Run by `npm run check:i18n` and automatically before `npm run build`. It fails the build on:
key mismatches across languages, `{{placeholder}}` / `<tag>` mismatches, `t('key')` calls
whose key is missing from `en.json`, and hardcoded JSX copy. Keep it green.
