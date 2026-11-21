import { z, ZodError } from "zod";
import { validate } from "../../../src/middleware/validate";
import { mockNext, mockReq, mockRes } from "../mocks";

const schema = z.object({ name: z.string().trim().min(2), page: z.coerce.number().default(1) });

describe("validate", () => {
  it("replaces req.body with the parsed value (trimmed, defaults applied, unknown keys dropped)", () => {
    const req = mockReq({ body: { name: "  Alice  ", extra: "x" } });
    const next = mockNext();
    validate(schema)(req, mockRes(), next);
    expect(req.body).toEqual({ name: "Alice", page: 1 });
    expect(next).toHaveBeenCalled();
  });

  it("validates and coerces req.query even though it is a getter in Express 5", () => {
    const req = mockReq();
    Object.defineProperty(req, "query", { get: () => ({ name: "Bob", page: "3" }), configurable: true });
    validate(schema, "query")(req, mockRes(), mockNext());
    expect(req.query).toEqual({ name: "Bob", page: 3 });
  });

  it("can run twice on the same request (params then body)", () => {
    const req = mockReq({ params: { name: "ab" }, body: { name: "cd" } });
    validate(schema, "params")(req, mockRes(), mockNext());
    validate(schema, "body")(req, mockRes(), mockNext());
    expect(req.params).toEqual({ name: "ab", page: 1 });
    expect(req.body).toEqual({ name: "cd", page: 1 });
  });

  it("throws a ZodError for invalid input and does not call next", () => {
    const next = mockNext();
    expect(() => validate(schema)(mockReq({ body: { name: "x" } }), mockRes(), next)).toThrow(ZodError);
    expect(next).not.toHaveBeenCalled();
  });
});
