import sanitizeHtml from "sanitize-html";

/**
 * Post content is rich text (HTML from the editor). Everything that isn't on this allowlist is
 * removed before it reaches the database, so stored posts can't carry scripts, event handlers,
 * iframes, inline styles or javascript: links (stored XSS).
 */
const POST_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h2", "h3", "h4",
    "strong", "b", "em", "i", "u", "s", "strike",
    "blockquote", "code", "pre", "hr",
    "ul", "ol", "li",
    "a",
  ],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  // External links open in a new tab without giving that page access to ours.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
  },
};

export const sanitizePostHtml = (html: string): string => sanitizeHtml(html, POST_HTML_OPTIONS).trim();

// Visible text only, e.g. to reject an editor that contains nothing but "<p></p>".
export const htmlToText = (html: string): string =>
  sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, " ").trim();
