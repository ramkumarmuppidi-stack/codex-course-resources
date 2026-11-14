import { describe, expect, test } from "bun:test";
import { validateNoteDraft } from "../app/_lib/note-validation";

describe("Server Action transport", () => {
  test("formatted content returns plain objects including heading attributes", () => {
    const input = {
      title: "Heading",
      contentJson: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Hello" }] },
        ],
      },
    };
    const validated = validateNoteDraft(input);
    expect(validated.contentJson.content?.[0].attrs?.level).toBe(2);
    expect(Object.getPrototypeOf(validated.contentJson.content?.[0].attrs)).toBe(Object.prototype);
    expect(validateNoteDraft(JSON.parse(JSON.stringify(validated)))).toEqual(validated);
  });
});
