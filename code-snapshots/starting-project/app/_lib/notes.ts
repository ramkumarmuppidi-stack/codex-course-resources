import "server-only";
import { database } from "./db";
import { noteStore } from "./note-store";
import { requireSession } from "./session";

export async function listNotes() {
  const session = await requireSession();
  return noteStore(database).list(session.user.id);
}

export async function getNote(id: string) {
  const session = await requireSession();
  return noteStore(database).get(session.user.id, id);
}
