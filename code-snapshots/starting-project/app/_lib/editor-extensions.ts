import StarterKit from "@tiptap/starter-kit";

export function isSafeLink(value: unknown): value is string {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !!url.hostname;
  } catch {
    return false;
  }
}

// The client editor and server validator must share the same document schema.
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      defaultProtocol: "https",
      isAllowedUri: isSafeLink,
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
    },
  }),
];
