"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "../_lib/session";
import { database } from "../_lib/db";
import { noteStore } from "../_lib/note-store";
import { isNoteId, NoteValidationError, validateNoteDraft } from "../_lib/note-validation";
import type { SaveResult } from "../_lib/note-types";

async function saveNote(input: unknown, create: boolean): Promise<SaveResult> {
  try {
    const session = await getCurrentSession();
    if (!session)
      return {
        error: {
          code: "UNAUTHORIZED",
          message: "Your session expired. Copy your changes and log in again.",
        },
      };
    if (!input || typeof input !== "object" || !("id" in input) || !isNoteId(input.id)) {
      throw new NoteValidationError("This note is not valid. Reload and try again.");
    }
    const draft = validateNoteDraft(input);
    const store = noteStore(database);
    let result: SaveResult;
    if (create) {
      result = store.create(session.user.id, input.id, draft);
    } else {
      if (!("updatedAt" in input) || typeof input.updatedAt !== "string")
        throw new NoteValidationError("Reload this note before saving.");
      result = store.update(session.user.id, input.id, draft, input.updatedAt);
    }
    if ("note" in result) {
      revalidatePath("/notes");
      revalidatePath(`/notes/${result.note.id}`);
    }
    return result;
  } catch (error) {
    if (error instanceof NoteValidationError)
      return { error: { code: "VALIDATION_ERROR", message: error.message } };
    console.error("Note save failed", error);
    return {
      error: { code: "INTERNAL_ERROR", message: "We could not save your note. Please try again." },
    };
  }
}

export async function createNoteAction(input: unknown): Promise<SaveResult> {
  return saveNote(input, true);
}

export async function updateNoteAction(input: unknown): Promise<SaveResult> {
  return saveNote(input, false);
}
