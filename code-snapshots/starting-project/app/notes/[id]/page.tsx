import { notFound } from "next/navigation";
import { NoteEditor } from "../../_components/note-editor";
import { getNote } from "../../_lib/notes";
export const metadata = { title: "Note" };
export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await getNote(id);
  if (!note) notFound();
  return <NoteEditor key={note.id} note={note} />;
}
