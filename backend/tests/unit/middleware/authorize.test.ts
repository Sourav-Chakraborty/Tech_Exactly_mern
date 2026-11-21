import { authorize } from "../../../src/middleware/authorize";
import { ApiError } from "../../../src/utils/ApiError";
import { mockNext, mockReq, mockRes } from "../mocks";

const user = (role: "user" | "admin") => ({ id: "1", name: "n", email: "e@x.dev", role });

describe("authorize", () => {
  it("calls next when the user's role is allowed", () => {
    const next = mockNext();
    authorize("admin")(mockReq({ user: user("admin") }), mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("accepts any of several roles", () => {
    const next = mockNext();
    authorize("user", "admin")(mockReq({ user: user("user") }), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it("throws 403 when the role is not allowed", () => {
    expect(() => authorize("admin")(mockReq({ user: user("user") }), mockRes(), mockNext())).toThrow(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("throws 401 when there is no authenticated user", () => {
    expect(() => authorize("admin")(mockReq(), mockRes(), mockNext())).toThrow(ApiError);
    expect(() => authorize("admin")(mockReq(), mockRes(), mockNext())).toThrow(
      expect.objectContaining({ statusCode: 401 }),
    );
  });
});
