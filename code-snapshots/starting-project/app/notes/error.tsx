"use client";

export default function NotesError({ reset }: { reset: () => void }) {
  return (
    <section className="empty-state" role="alert">
      <h2>We couldn’t load your notes</h2>
      <p>Please try again in a moment.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
