# Agent Guide

Outside Map Studio is a React + TypeScript MapLibre style editor based on Maputnik.

## Setup & Validation

```bash
npm install
npm run lint
npm run build
npm run test       # Playwright E2E
npm run test-unit  # Vitest
```

First Playwright setup:

```bash
npx playwright install --with-deps chromium
```

Use `npm run lint -- --fix` for automatic lint fixes. Pull requests should add a short entry to `CHANGELOG.md`.

## Testing Strategy

Prefer **E2E tests** for React/UI behavior. Use unit tests for pure logic that E2E cannot cheaply cover, such as parsers, sorting, watchers, or stores.

Read coverage separately:

```bash
npx playwright test
npx nyc report --reporter=text-summary
npx vitest run --coverage
```

Do not merge local Istanbul and v8 coverage maps; Codecov handles the combined server-side result.

## E2E Structure

- `e2e/playwright-helper.ts` — generic browser actions; normally the only file importing `@playwright/test` besides fixtures.
- `e2e/maputnik-driver.ts` — map/style domain actions; no direct Playwright/page knowledge.
- `e2e/modal-driver.ts` — modal-scoped actions exposed through `when.modal.*`.

Keep UI interactions in drivers rather than inline in specs.

## Assertions

- `shouldDeepNestedInclude` performs recursive partial object matching; arrays/primitives match exactly.
- Prefer assertions against the full style rather than extracting slices in the test.
- `Query.then()` returns another lazy `Query`, not a Promise. Use `.get()` to await a value directly.

## Test Design

Keep **one behavior per test**. If a test narrates multiple stages, split it and share setup through nested `describe`/`beforeEach`.

After writing a test, deliberately change the expected result once to confirm the test can fail.

## Test IDs & Inputs

Test IDs use `data-wd-key` and `get.elementByTestId`.

Avoid putting the same ID on both a field wrapper and its child input. `InputNumber` uses `<key>-text` and `<key>-range` when ranges are enabled.

Input behavior:
- `InputString` commits on **blur or Enter**; drivers using `fill()` must blur afterward.
- `InputNumber` commits immediately.
- Downshift autocomplete inputs should use `fill()` and then select from the filtered menu.
- CodeMirror auto-closes brackets/quotes; account for this when testing invalid JSON.

## Fixtures

New style fixtures in `e2e/fixtures/` must also be registered in `maputnik-driver.ts` in both the mock-response list and `styleFileByKey`.
