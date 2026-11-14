import Link from "next/link";
import { listNotes } from "../_lib/notes";

export const metadata = { title: "Your notes" };
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

export default async function NotesPage() {
  const notes = await listNotes();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A LITTLE SPACE, JUST FOR YOU</p>
          <h1>Your notes</h1>
          <p>Ideas, plans, and everything in between.</p>
        </div>
        <Link href="/notes/new" className="button">
          + New note
        </Link>
      </div>
      <div className="list-caption">
        <span>All notes</span>
        <span>
          {notes.length} {notes.length === 1 ? "note" : "notes"} · Recently updated
        </span>
      </div>
      {notes.length ? (
        <div className="note-grid">
          {notes.map((note) => (
            <Link className="card note-card" href={`/notes/${note.id}`} key={note.id}>
              <span className="badge">Your notebook</span>
              <h2>{note.title || "Untitled note"}</h2>
              <p>Open to read or edit your note.</p>
              <div className="note-date">
                <time dateTime={note.updatedAt}>
                  Updated {dateFormat.format(new Date(note.updatedAt))}
                </time>
                <span aria-hidden="true">↗</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            ✎
          </span>
          <h2>A fresh page awaits</h2>
          <p>Your ideas belong here. Start with your first note.</p>
          <Link href="/notes/new" className="button">
            Create a note
          </Link>
        </div>
      )}
    </>
  );
}
