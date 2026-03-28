# Shared Library Module Resolution Guide

## The Two Patterns

This monorepo has two kinds of shared libraries under `libs/`.

### Pattern A — TypeScript-source libs (shared-types, shared-utils)
- `package.json` `"main"` → `./src/index.ts`
- `tsconfig.base.json` path → `libs/.../src/index.ts`
- No pre-compiled `.js` files in `src/`
- ts-node transpiles on-the-fly; works because `"module": "commonjs"` in tsconfig

### Pattern B — Pre-compiled libs (shared-config)
- `package.json` `"main"` → `./src/index.js`, `"types"` → `./src/index.d.ts`
- `tsconfig.base.json` path → `libs/.../src/index.ts` (for TypeScript type resolution)
- Pre-compiled `.js` + `.d.ts` files live alongside `.ts` source in `src/`
- ts-node loads from `index.ts` which re-exports; CJS `require()` resolves sub-files to `.js`

---

## Why This Error Keeps Appearing

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../shared-config/src/feature.keys'
```

**Root cause:** ts-node loads `shared-config/src/index.ts` as an ES module (Node 20.19+ has `require(esm)` enabled by default). The ESM resolver requires **explicit file extensions** — `./feature.keys` with no extension fails. CJS resolver auto-appends `.js` and succeeds.

**When it triggers:**
1. `pnpm seed` / `pnpm seed:admin` — ts-node runs from the repo root, can't find `tsconfig.json` (there was none), falls back to defaults, may use ESM mode.
2. Any new script using `ts-node` without `--project`.

---

## Rules to Prevent Recurrence

### Rule 1 — Always pass `--project` to ts-node scripts
```json
"seed": "ts-node --project apps/api/tsconfig.json apps/api/src/database/seeds/run.ts"
```
Never use bare `ts-node <file>` for files that import shared libs.

### Rule 2 — Root `tsconfig.json` must exist and extend `tsconfig.base.json`
```json
// tsconfig.json (root)
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": { "module": "commonjs" },
  "ts-node": { "esm": false, "transpileOnly": true }
}
```
This is the fallback ts-node config when `--project` is omitted.

### Rule 3 — Compiled shared libs must have matching `.js` + `.d.ts` for every `.ts`
When you add a new `.ts` file to `shared-config/src/`:
1. Add it to `src/index.ts` re-exports
2. Write the compiled `src/<name>.js` (CommonJS format)
3. Write the declaration `src/<name>.d.ts`
4. Update `src/index.js` and `src/index.d.ts`

The `.js` file is what Node resolves at runtime. Without it, the re-export silently fails.

### Rule 4 — shared-types/shared-utils stay TypeScript-source only
Do NOT add pre-compiled `.js` files to `shared-types` or `shared-utils`. They work via ts-node transpilation and adding `.js` files creates ambiguity in resolution order.

---

## File Map for shared-config

Every exported constant needs these four files:

| File | Purpose |
|---|---|
| `src/feature.keys.ts` | TypeScript source — edit this |
| `src/feature.keys.js` | Compiled CommonJS — keep in sync |
| `src/feature.keys.d.ts` | Type declarations — keep in sync |
| `src/feature.keys.js.map` | Source map — optional |

`src/index.ts` re-exports all; `src/index.js` and `src/index.d.ts` are the compiled equivalents.

---

## Adding a New Export to shared-config

```bash
# 1. Create the TypeScript source
# libs/shared-config/src/my-constant.ts
export const MY_CONSTANT = { ... } as const;
export type MyType = keyof typeof MY_CONSTANT;

# 2. Create the compiled JS
# libs/shared-config/src/my-constant.js
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MY_CONSTANT = void 0;
exports.MY_CONSTANT = { ... };

# 3. Create the declaration file
# libs/shared-config/src/my-constant.d.ts
export declare const MY_CONSTANT: { readonly ... };
export type MyType = keyof typeof MY_CONSTANT;

# 4. Add to index.ts
export * from './my-constant';

# 5. Add to index.js
tslib_1.__exportStar(require("./my-constant"), exports);

# 6. Add to index.d.ts
export * from './my-constant';
```
