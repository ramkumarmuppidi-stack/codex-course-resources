import type { Database } from "bun:sqlite";
import type { Note, NoteDraft, NoteSummary, SaveResult } from "./note-types";

type NoteRow = { id: string; title: string; content_json: string; updated_at: string };
function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    contentJson: JSON.parse(row.content_json),
    updatedAt: row.updated_at,
  };
}

// All SQL is parameterized and every read/write is scoped to the session owner.
export function noteStore(db: Database) {
  function get(userId: string, id: string): Note | null {
    const row = db
      .query<NoteRow, [string, string]>(
        "SELECT id, title, content_json, updated_at FROM note WHERE user_id = ? AND id = ?",
      )
      .get(userId, id);
    return row ? toNote(row) : null;
  }
  return {
    get,
    list(userId: string): NoteSummary[] {
      return db
        .query<NoteSummary, [string]>(
          "SELECT id, title, updated_at AS updatedAt FROM note WHERE user_id = ? ORDER BY updated_at DESC, id DESC",
        )
        .all(userId);
    },
    create(userId: string, id: string, draft: NoteDraft): SaveResult {
      return db
        .transaction((): SaveResult => {
          // Retrying a request after a lost response must not create a duplicate.
          const existing = get(userId, id);
          if (existing) {
            if (
              existing.title === draft.title &&
              JSON.stringify(existing.contentJson) === JSON.stringify(draft.contentJson)
            )
              return { note: existing };
            return {
              error: {
                code: "CONFLICT",
                message: "This note was already created. Reload it before continuing.",
              },
            };
          }
          const now = new Date().toISOString();
          db.query(
            "INSERT INTO note (id, user_id, title, content_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          ).run(id, userId, draft.title, JSON.stringify(draft.contentJson), now, now);
          return { note: { id, ...draft, updatedAt: now } };
        })
        .immediate();
    },
    update(userId: string, id: string, draft: NoteDraft, expectedUpdatedAt: string): SaveResult {
      return db
        .transaction((): SaveResult => {
          const existing = get(userId, id);
          if (!existing)
            return { error: { code: "NOT_FOUND", message: "This note is no longer available." } };
          const sameContent =
            existing.title === draft.title &&
            JSON.stringify(existing.contentJson) === JSON.stringify(draft.contentJson);
          if (sameContent) return { note: existing };
          if (existing.updatedAt !== expectedUpdatedAt)
            return {
              error: {
                code: "CONFLICT",
                message:
                  "This note changed in another tab. Copy your changes, then reload before saving.",
              },
            };
          const updatedAt = new Date(
            Math.max(Date.now(), Date.parse(existing.updatedAt) + 1),
          ).toISOString();
          db.query(
            "UPDATE note SET title = ?, content_json = ?, updated_at = ? WHERE id = ? AND user_id = ? AND updated_at = ?",
          ).run(
            draft.title,
            JSON.stringify(draft.contentJson),
            updatedAt,
            id,
            userId,
            expectedUpdatedAt,
          );
          return { note: { id, ...draft, updatedAt } };
        })
        .immediate();
    },
  };
}
