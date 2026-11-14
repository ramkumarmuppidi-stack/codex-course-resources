# TinyNotes

A private notebook built with Next.js App Router, Better Auth, Bun SQLite, and TipTap.

## Run locally

1. Run `bun install --frozen-lockfile`.
2. Copy `.env.example` to `.env.local`, set a random `AUTH_SECRET` of at least 32 characters, and set `APP_URL` to your local origin (default `http://localhost:3000`).
3. Run `bun run db:migrate`.
4. Run `bun run dev` and register an account.

Use Bun for both development and production (`bun run build`, then `bun run start`), since the database uses `bun:sqlite`. Run migrations before starting a new deployment. Keep the database on persistent storage.

## Notes workflow

- `/` sends signed-in users to `/notes`, otherwise to `/login`.
- `/login` and `/register` use the existing email/password authentication.
- `/notes` shows only the signed-in user's notes, most recently updated first, with a real empty state.
- `/notes/new` opens an empty editor. **Save** creates a note and stays in the editor; **Submit** saves and returns to the notebook.
- `/notes/[id]` opens a persisted note for reading and editing. Missing notes and another user's notes both show the custom 404.
- Existing notes autosave after one second of inactivity. **Save** saves immediately. The status shows Saved, Unsaved changes, Saving, or a retryable error.
- **Clear** confirms before clearing the body; toolbar Undo restores it. On existing notes, clearing also participates in autosave.
- The toolbar supports headings, bold, italic, underline, strikethrough, bullet/numbered lists, quotes, code blocks, HTTP(S) links, undo, and redo.
- Failed saves retain the draft on the current page. Conflicting edits from another tab are rejected: copy the draft before reloading. Closing/reloading the page or following in-app links with pending changes prompts before leaving.

Titles are optional (displayed as Untitled note) and limited to 160 characters. Documents are validated against the editor schema and limited to 256 KiB of UTF-8 JSON. Every server read and mutation checks the session; SQL is parameterized and scoped to the owner. Save requests are serialized, retried creates are idempotent, and version checks prevent silent stale writes.

Note data is read by Server Components and changed through Server Actions. TipTap initializes client-side with `immediatelyRender: false`; documents cross the action boundary as plain JSON. The authenticated editor uses TipTap's schema rendering and does not inject stored HTML.

Public sharing and deletion are not part of this implementation. `/s/sample-shared-note` remains the original static demonstration and cannot expose private database notes.

## Verification

- `bun test scripts` — migration, authentication, note ownership, persistence, conflict, payload validation, and serialization regression tests.
- `bun run lint`
- `bun run build` — includes TypeScript checking.

Editor references: [TipTap overview](https://tiptap.dev/docs/editor/getting-started/overview), [Next.js integration](https://tiptap.dev/docs/editor/getting-started/install/nextjs), and [link validation](https://tiptap.dev/docs/editor/extensions/marks/link). Additional integration guidance was checked through Context7.

## SQLite migrations

Run `bun run db:migrate` to create/update `./data/tinynotes.db` using Bun's built-in
[`bun:sqlite`](https://bun.com/docs/runtime/sqlite) client. Set `DB_PATH` in `.env`
or the environment to choose another file. Relative paths resolve from the project
root; parent directories are created automatically. Database files are ignored by Git.

- `migrations/0001_init.up.sql`: the auth tables and indexes specified in `SPEC.MD`.
- `migrations/0002_notes.up.sql`: notes, hashed share tokens, indexes, and one active share per note.
- `scripts/migrate.ts`: runs paired `.up.sql` files in filename order and records the shared filename stem and
  UTC ISO timestamps in `schema_migrations`. Already-applied files are skipped.

Each migration and its ledger entry commit together. On failure, that migration
rolls back and the command exits non-zero; earlier successful migrations remain.
Foreign keys are enabled on the migration connection. Future application connections
must also enable `PRAGMA foreign_keys = ON` to enforce references and cascades.

Run `bun run db:rollback` to undo the latest applied migration using its paired `.down.sql` file. Repeat to undo earlier migrations. Down migrations drop tables and their data; back up valuable data first. The `schema_migrations` ledger remains so migrations can be reapplied.

Add future changes as paired files such as `0003_example.up.sql` and `0003_example.down.sql`, using a version newer than all applied migrations. Do not edit
applied files or include `BEGIN`/`COMMIT`/`ROLLBACK` statements: the runner owns transactions.
The migration command creates schema; the application uses the same DB_PATH for authentication and notes.

Run `bun run test:migrations` for temporary-database tests covering schema, repeat runs,
ordering, failed up/down rollback, reapplication, and command failure.
