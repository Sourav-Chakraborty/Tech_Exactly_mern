import DOMPurify from "dompurify";

// Editor output always starts with a block element; legacy plain text never does
// (even if it happens to contain something tag-like, e.g. "use <b> for bold").
const looksLikeHtml = (s: string) => /^\s*<(p|h[1-6]|ul|ol|blockquote|pre|hr)[\s>/]/i.test(s);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Posts written before the rich-text editor are plain text: turn blank-line separated
// paragraphs into <p> and single line breaks into <br>.
const plainTextToHtml = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");

/**
 * Post content as safe HTML, for rendering and for loading into the editor.
 * The API already sanitizes on write; DOMPurify here is defense in depth.
 */
export const toSafeHtml = (content: string): string => {
  const html = looksLikeHtml(content) ? content : plainTextToHtml(content);
  return DOMPurify.sanitize(html, { ADD_ATTR: ["target"] });
};

// Visible text of post content (for excerpts).
export const htmlToText = (content: string): string => {
  if (!looksLikeHtml(content)) return content;
  // Block elements become spaces so "<p>a</p><p>b</p>" reads "a b", not "ab".
  const doc = new DOMParser().parseFromString(
    DOMPurify.sanitize(content).replace(/<\/(p|h[1-6]|li|blockquote|pre)>|<br\s*\/?>/gi, " $&"),
    "text/html",
  );
  return doc.body.textContent ?? "";
};
