import { NoteEditor } from "../../_components/note-editor";
import { requireSession } from "../../_lib/session";
export const metadata = { title: "New note" };
export default async function NewNotePage() {
  await requireSession();
  return <NoteEditor />;
}
