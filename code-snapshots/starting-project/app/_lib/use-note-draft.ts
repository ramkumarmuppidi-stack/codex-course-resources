"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createNoteAction, updateNoteAction } from "../notes/actions";
import { emptyDocument, type Note, type NoteDraft, type SaveResult } from "./note-types";

export function useNoteDraft(note?: Note) {
  const [draft, setDraft] = useState<NoteDraft>(() => ({
    title: note?.title ?? "",
    contentJson: note?.contentJson ?? emptyDocument,
  }));
  const [savedKey, setSavedKey] = useState(() =>
    note ? JSON.stringify({ title: note.title, contentJson: note.contentJson }) : "",
  );
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(note?.updatedAt);
  const latest = useRef(draft);
  const persistedKey = useRef(savedKey);
  const identity = useRef({ id: note?.id, updatedAt: note?.updatedAt });
  const flight = useRef<Promise<SaveResult | null> | null>(null);
  const active = useRef(true);
  const dirty = JSON.stringify(draft) !== savedKey;

  function change(next: NoteDraft) {
    latest.current = next;
    setDraft(next);
    // A failed save requires an explicit retry, avoiding repeated failed requests.
  }

  const save = useCallback(async (): Promise<SaveResult | null> => {
    if (flight.current) return flight.current;
    const snapshot = latest.current;
    const key = JSON.stringify(snapshot);
    if (key === persistedKey.current) return null;
    setStatus("saving");
    setError("");
    identity.current.id ??= crypto.randomUUID();
    // ProseMirror attributes use null-prototype objects; Server Actions need plain JSON.
    const input = { ...JSON.parse(key), ...identity.current };
    const request = (async (): Promise<SaveResult> => {
      let result: SaveResult;
      try {
        result = identity.current.updatedAt
          ? await updateNoteAction(input)
          : await createNoteAction(input);
      } catch {
        result = {
          error: {
            code: "INTERNAL_ERROR",
            message: "Could not reach the server. Your changes are still here. Try saving again.",
          },
        };
      }
      if ("note" in result) {
        identity.current = { id: result.note.id, updatedAt: result.note.updatedAt };
        persistedKey.current = key;
        if (active.current) {
          setSavedKey(key);
          setSavedAt(result.note.updatedAt);
          setStatus("idle");
        }
      } else if (active.current) {
        setError(result.error.message);
        setStatus("error");
      }
      return result;
    })();
    flight.current = request;
    try {
      return await request;
    } finally {
      flight.current = null;
    }
  }, []);

  // A timer is an external system: clean it up when typing resumes or the route leaves.
  useEffect(() => {
    if (!note || !dirty || status !== "idle") return;
    const timer = window.setTimeout(() => {
      void save();
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [note, dirty, draft, status, save]);

  useEffect(() => {
    active.current = true;
    function hasChanges() {
      return JSON.stringify(latest.current) !== persistedKey.current;
    }
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!hasChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function beforeNavigate(event: MouseEvent) {
      if (!(event.target instanceof Element) || !hasChanges()) return;
      const target = event.target.closest("a[href], [data-leaves-editor]");
      if (!target || target.getAttribute("href")?.startsWith("#")) return;
      if (
        target instanceof HTMLAnchorElement &&
        (target.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey)
      )
        return;
      if (!window.confirm("You have unsaved changes. Leave this note without saving?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeNavigate, true);
    return () => {
      active.current = false;
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeNavigate, true);
    };
  }, []);

  return { draft, change, dirty, status, error, savedAt, save };
}
