# SQLite Editor

A small in-browser SQLite database viewer/editor built with vite, react, Tailwind, and sql.js.

## Features
- Load and edit SQLite databases in the browser locally
- Runs SQLite via WebAssembly using `sql.js`

## Tech stack
- React + TypeScript
- Vite
- Tailwind CSS
- sql.js (WASM)

## Getting started

### Prerequisites
- bun (or your preferred package manager)

### Install
```bash
bun install
```

### Run locally (dev)
```bash
bun run dev
```

### Build
```bash
bun run build
```

### Preview production build
```bash
bun run preview
```

## Notes
- The app uses `import.meta.env.BASE_URL` to locate the `sql.js` WASM files (see `src/lib/db.ts`).
- Vite is configured with `base: "/sqlite-editor"` in `vite.config.ts` so that it works with github pages. If you deploy under a different subpath, update the value accordingly.
