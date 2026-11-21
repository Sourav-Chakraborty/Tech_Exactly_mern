import { htmlToText } from "./html";

const dateFormat =new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));

// The API keeps updatedAt separate from createdAt; treat tiny differences as "not edited".
export const wasEdited = (item: { createdAt: string; updatedAt: string }) =>
  new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > 1000;

// Plain-text preview of post content (HTML or legacy plain text).
export const excerpt = (content: string, max = 220) => {
  const flat = htmlToText(content).replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max).trimEnd()}…`;
};
