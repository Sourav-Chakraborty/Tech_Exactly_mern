import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { errorHandler, notFound } from "../../../src/middleware/errorHandler";
import { ApiError } from "../../../src/utils/ApiError";
import { mockNext, mockReq, mockRes } from "../mocks";

const handle = (err: unknown) => {
  const res = mockRes();
  errorHandler(err, mockReq(), res, mockNext());
  return { status: res.statusCode, body: res.body as Record<string, unknown> };
};

describe("errorHandler", () => {
  beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it("formats an ApiError with its status and details", () => {
    const details = [{ field: "x", message: "bad" }];
    expect(handle(ApiError.badRequest("Nope", details))).toEqual({
      status: 400,
      body: { success: false, message: "Nope", details },
    });
  });

  it("maps a ZodError to 400 with per-field details (root-level issues have no field)", () => {
    const schema = z
      .object({ a: z.string() })
      .refine(() => false, { message: "root rule" });
    const result = schema.safeParse({ a: 1 });
    const { status, body } = handle(result.error);
    expect(status).toBe(400);
    expect(body.message).toBe("Validation failed");
    expect(body.details).toEqual([{ field: "a", message: expect.any(String) }]);

    const root = schema.safeParse({ a: "ok" });
    expect(handle(root.error).body.details).toEqual([{ field: undefined, message: "root rule" }]);
  });

  it("maps a Mongoose ValidationError to 400", () => {
    const Model = mongoose.model("ErrTest", new mongoose.Schema({ title: { type: String, required: true } }));
    const err = new Model({}).validateSync();
    const { status, body } = handle(err);
    expect(status).toBe(400);
    expect(body.details).toEqual([{ field: "title", message: expect.any(String) }]);
  });

  it("maps a Mongoose CastError to 400", () => {
    const err = new mongoose.Error.CastError("ObjectId", "abc", "_id");
    expect(handle(err)).toMatchObject({ status: 400, body: { message: "Invalid value for _id" } });
  });

  it("maps a duplicate key error to 409", () => {
    const err = Object.assign(new Error("dup"), { code: 11000, keyValue: { email: "a@b.c" } });
    expect(handle(err)).toMatchObject({ status: 409, body: { message: "email already exists" } });
  });

  it("maps JWT errors to 401", () => {
    expect(handle(new jwt.TokenExpiredError("jwt expired", new Date()))).toMatchObject({
      status: 401,
      body: { message: "Token has expired" },
    });
    expect(handle(new jwt.JsonWebTokenError("bad"))).toMatchObject({
      status: 401,
      body: { message: "Invalid token" },
    });
  });

  it("keeps the status of Express client errors such as malformed JSON", () => {
    const err = Object.assign(new SyntaxError("Unexpected token"), { status: 400 });
    expect(handle(err)).toMatchObject({ status: 400, body: { message: "Unexpected token" } });
  });

  it("hides the details of unknown errors behind a generic 500 and logs them", () => {
    expect(handle(new Error("db password is hunter2"))).toEqual({
      status: 500,
      body: { success: false, message: "Internal Server Error" },
    });
    expect(console.error).toHaveBeenCalled();
  });
});

describe("notFound", () => {
  it("forwards a 404 ApiError naming the route", () => {
    const next = mockNext();
    notFound(mockReq({ method: "GET", originalUrl: "/api/v1/nope" }), mockRes(), next);
    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 404,
      message: "Route GET /api/v1/nope not found",
    });
  });
});
