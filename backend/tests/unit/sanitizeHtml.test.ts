import { htmlToText, sanitizePostHtml } from "../../src/utils/sanitizeHtml";
import { createPostSchema } from "../../src/validators/post.validator";

describe("sanitizePostHtml", () => {
  it("keeps the formatting the editor produces", () => {
    const html =
      "<h2>Title</h2><p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s> <code>c</code></p>" +
      "<ul><li>one</li></ul><ol><li>two</li></ol><blockquote><p>q</p></blockquote><pre><code>x</code></pre><hr />";
    expect(sanitizePostHtml(html)).toBe(html.replace("<hr />", "<hr />"));
  });

  it.each([
    ["<script>alert(1)</script><p>ok</p>", "<p>ok</p>"],
    ['<p onclick="alert(1)">ok</p>', "<p>ok</p>"],
    ['<img src=x onerror="alert(1)">', ""],
    ['<iframe src="https://evil.test"></iframe>', ""],
    ['<p style="color:red">ok</p>', "<p>ok</p>"],
    ['<a href="javascript:alert(1)">x</a>', '<a target="_blank" rel="noopener noreferrer nofollow">x</a>'],
  ])("strips dangerous markup: %s", (input, expected) => {
    expect(sanitizePostHtml(input)).toBe(expected);
  });

  it("forces safe attributes on links", () => {
    expect(sanitizePostHtml('<a href="https://example.com" target="_self">x</a>')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">x</a>',
    );
  });
});

describe("post content validation", () => {
  it("stores sanitized HTML", () => {
    const parsed = createPostSchema.parse({ title: "Valid", content: "<p>Hi</p><script>x</script>" });
    expect(parsed.content).toBe("<p>Hi</p>");
  });

  it("rejects content that is empty once tags are removed", () => {
    expect(createPostSchema.safeParse({ title: "Valid", content: "<p></p><p> </p>" }).success).toBe(false);
    expect(createPostSchema.safeParse({ title: "Valid", content: "<script>only</script>" }).success).toBe(false);
  });

  it("extracts plain text", () => {
    expect(htmlToText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });
});
