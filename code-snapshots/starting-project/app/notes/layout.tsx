import { requireSession } from "../_lib/session";

export default async function NotesLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  return <div className="workspace">{children}</div>;
}
