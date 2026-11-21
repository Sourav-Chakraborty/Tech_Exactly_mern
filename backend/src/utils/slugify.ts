import crypto from "node:crypto";

const MAX_LENGTH = 80;

// "Hello, Wörld! 2026" -> "hello-world-2026"
export const slugify = (text: string): string => {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, "");
  return slug || "post";
};

// Short random suffix used to make a taken slug unique: "hello-world-3f9a2c"
export const slugSuffix = (): string => crypto.randomBytes(3).toString("hex");
