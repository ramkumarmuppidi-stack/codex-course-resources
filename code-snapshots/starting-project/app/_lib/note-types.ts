import type { JSONContent } from "@tiptap/core";

export type NoteDraft = { title: string; contentJson: JSONContent };
export type Note = NoteDraft & { id: string; updatedAt: string };
export type NoteSummary = { id: string; title: string; updatedAt: string };
export type SaveResult =
  | { note: Note }
  | {
      error: {
        code: "UNAUTHORIZED" | "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";
        message: string;
      };
    };

export const emptyDocument: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
export const MAX_TITLE_LENGTH = 160;
export const MAX_CONTENT_BYTES = 256 * 1024;
