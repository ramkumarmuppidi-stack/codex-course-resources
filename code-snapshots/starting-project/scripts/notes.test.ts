import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { noteStore } from "../app/_lib/note-store";
import { validateNoteDraft } from "../app/_lib/note-validation";
import { emptyDocument } from "../app/_lib/note-types";

let db: Database;
beforeEach(() => {
  db = new Database(":memory:");
  db.run("PRAGMA foreign_keys = ON");
  db.exec(readFileSync("migrations/0001_init.up.sql", "utf8"));
  db.exec(readFileSync("migrations/0002_notes.up.sql", "utf8"));
  for (const id of ["alice", "bob"])
    db.query("INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)").run(
      id,
      id,
      `${id}@example.com`,
      "2026-01-01",
      "2026-01-01",
    );
});
afterEach(() => db.close());
const draft = { title: "A thought", contentJson: emptyDocument };

describe("private notes persistence", () => {
  test("isolates lists, reads, and updates by owner", () => {
    const store = noteStore(db);
    const id = crypto.randomUUID();
    const created = store.create("alice", id, draft);
    expect("note" in created).toBe(true);
    expect(store.list("alice")).toHaveLength(1);
    expect(store.list("bob")).toEqual([]);
    expect(store.get("bob", id)).toBeNull();
    const result = store.update("bob", id, { ...draft, title: "Stolen" }, "anything");
    expect(result).toHaveProperty("error.code", "NOT_FOUND");
    expect(store.get("alice", id)?.title).toBe(draft.title);
  });
  test("persists rich text, orders updated notes first, and rejects stale writes", () => {
    const store = noteStore(db);
    const first = crypto.randomUUID();
    store.create("alice", first, draft);
    store.create("alice", crypto.randomUUID(), draft);
    // Give fixtures a known earlier timestamp; wall-clock saves can share a millisecond.
    db.query("UPDATE note SET updated_at = ?").run("2026-01-01T00:00:00.000Z");
    const original = store.get("alice", first)!;
    const contentJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Remember this", marks: [{ type: "bold" }] }],
        },
      ],
    };
    const result = store.update(
      "alice",
      first,
      { title: "Updated", contentJson },
      original.updatedAt,
    );
    expect(result).toHaveProperty("note.title", "Updated");
    expect(store.list("alice")[0].id).toBe(first);
    expect(store.get("alice", first)?.contentJson).toEqual(contentJson);
    expect(store.update("alice", first, draft, original.updatedAt)).toHaveProperty(
      "error.code",
      "CONFLICT",
    );
    expect(store.get("alice", first)?.title).toBe("Updated");
  });
  test("retries are idempotent and unchanged saves preserve timestamps", () => {
    const store = noteStore(db);
    const id = crypto.randomUUID();
    const created = store.create("alice", id, draft);
    expect(store.create("alice", id, draft)).toEqual(created);
    expect(store.list("alice")).toHaveLength(1);
    expect(store.update("alice", id, draft, "old-version")).toEqual(created);
  });
  test("unknown notes cannot be updated", () => {
    expect(noteStore(db).update("alice", crypto.randomUUID(), draft, "now")).toHaveProperty(
      "error.code",
      "NOT_FOUND",
    );
  });
});

describe("untrusted TipTap input", () => {
  test("accepts empty and formatted documents", () => {
    expect(validateNoteDraft(draft)).toEqual(draft);
    expect(validateNoteDraft({ ...draft, title: "  Title  " }).title).toBe("Title");
  });
  test("rejects malformed documents and unsupported nodes", () => {
    for (const contentJson of [
      null,
      [],
      {},
      { type: "text", text: "root" },
      { type: "doc", content: [{ type: "image", attrs: { src: "bad" } }] },
      { type: "doc", content: [{ type: "text", text: "outside paragraph" }] },
    ]) {
      expect(() => validateNoteDraft({ ...draft, contentJson })).toThrow();
    }
  });
  test("enforces title and UTF-8 content limits", () => {
    expect(() => validateNoteDraft({ ...draft, title: "x".repeat(161) })).toThrow();
    expect(() =>
      validateNoteDraft({
        ...draft,
        contentJson: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "🌱".repeat(70000) }] }],
        },
      }),
    ).toThrow("256 KB");
  });
  test("rejects unsafe links and normalizes allowed links", () => {
    function document(href: string) {
      return {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "link",
                marks: [
                  { type: "link", attrs: { href, target: "opener", rel: "opener", class: "bad" } },
                ],
              },
            ],
          },
        ],
      };
    }
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,test",
      "//example.com",
      "mailto:a@example.com",
      "https://",
    ])
      expect(() => validateNoteDraft({ ...draft, contentJson: document(url) })).toThrow();
    const result = validateNoteDraft({ ...draft, contentJson: document("https://example.com") });
    expect(result.contentJson.content?.[0].content?.[0].marks?.[0].attrs).toEqual({
      href: "https://example.com",
      target: "_blank",
      rel: "noopener noreferrer",
      class: null,
    });
  });
  test("rejects excessive nesting", () => {
    let block: object = { type: "paragraph" };
    for (let i = 0; i < 50; i++) block = { type: "blockquote", content: [block] };
    expect(() =>
      validateNoteDraft({ ...draft, contentJson: { type: "doc", content: [block] } }),
    ).toThrow();
  });
});
