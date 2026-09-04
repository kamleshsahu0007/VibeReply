# 13 — Testing

**Test runner**: Vitest · Config: `vitest.config.ts` · Environment: `node`

```ts
// vitest.config.ts
test: { environment: "node", include: ["src/**/*.test.ts"] }
resolve: { alias: { "@": "src/" } }   // same @/ import alias jo app code me hai
```

## Commands

```bash
npm test          # sab tests ek baar chalao (vitest run)
npm run test:watch # watch mode
```

## Existing test files

| File | Kya test hota hai |
| --- | --- |
| `src/lib/validation/schemas.test.ts` | Zod schemas — `generateRepliesSchema`, `toneProfileInputSchema` ke validation rules (required fields, max lengths, task-specific `.refine()` conditions) |
| `src/services/replies/reply.service.test.ts` | Reply-generation service — prompt building, model-response parsing, error cases (missing tone in output, malformed JSON, etc.) |

Current suite: **23 tests, 2 files** — dono pass hone chahiye har commit se pehle.

## Coverage gaps (honest note)

Extension side (`extension/*.js`) ke liye **koi automated test nahi hai** — ye manual/browser
testing se hi verify hota hai (dekho [02-getting-started.md](02-getting-started.md) ka "Loading
the extension" section). Similarly, `tone.service.ts`, `subscription.service.ts`, aur route
handlers (`app/api/**/route.ts`) ke liye bhi abhi dedicated unit tests nahi hain — sirf validation
aur reply-generation logic covered hai.

## CI ka status

Repo me abhi koi CI workflow file nahi mila (jaise `.github/workflows/`) — testing manually
(`npm test`, `npm run typecheck`, `npm run lint`) run karna hoga commit/PR se pehle. Ye ek gap hai,
dekho [15-known-issues-roadmap.md](15-known-issues-roadmap.md).

## Type-checking aur linting bhi test-suite ka hissa samjho

```bash
npm run typecheck   # tsc --noEmit — strict TypeScript checks
npm run lint         # next lint — ESLint rules
```

Ye dono commands bhi commit se pehle chalani chahiye — TypeScript strict mode on hai, isliye
typecheck fail hona matlab genuine type error hai.
