# Contributing to Ombra

Thanks for taking a look. This project gets the most value from two kinds of
contributions: fixes/improvements to the shared shade + game engine, and city ports
(see [README.md § Adapting Ombra to your city](README.md#adapting-ombra-to-your-city)).
If you're porting this to your own city, consider opening a PR even for partial work —
"here's how I adapted the data pipeline for Madrid" is useful to the next person even
if the rest of your fork diverges.

## Getting set up

```bash
npm install
npm run dev
```

That's it for UI/shade-engine work — no accounts needed. See the README's
"Bringing the backend online" section if you're touching auth, check-ins, or push.

## Before opening a PR

```bash
npm run check:i18n   # every user-facing string must exist in en/es/ca with matching {{placeholders}}
tsc -b                # typecheck
npm run build          # full build
```

All three also run in CI on every PR.

## Localization

Every string a user can read must go through `t()` and exist in all three locale files
(`src/i18n/locales/{en,es,ca}.json`), same key path, same `{{placeholders}}`/`<tags>`.
See `CLAUDE.md` for the full convention (interpolation, plurals, `<Trans>` for rich text,
`i18n-ignore`/`i18n-exempt` for intentional exceptions like proper nouns). No em-dashes
in user-facing copy — periods, commas, or colons instead.

## Style

- No comments that just restate what the code does — only ones that explain a
  non-obvious *why* (a workaround, an invariant, a constraint from an external system).
- Match the existing patterns in the file you're editing before introducing a new one.
- Don't add abstractions, config flags, or error handling for cases that can't happen —
  keep changes scoped to what the PR is actually about.

## Reporting issues

Bug reports and city-port questions are both welcome via GitHub Issues. For anything
that touches user data or auth, please don't open a public issue with real account
details — email the address in [`public/privacy.html`](public/privacy.html) instead.
