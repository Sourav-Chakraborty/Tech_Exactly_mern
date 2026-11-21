import { Types } from "mongoose";
import { authenticate } from "../../../src/middleware/authenticate";
import { createUser, tokenFor } from "../../helpers";
import { mockNext, mockReq, mockRes } from "../mocks";

const withToken = (token: string) => mockReq({ headers: { authorization: `Bearer ${token}` } });

describe("authenticate", () => {
  it("attaches the user from the database to req.user", async () => {
    const user = await createUser({ role: "admin" });
    const req = withToken(tokenFor(user));
    const next = mockNext();

    await authenticate(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: user.id, name: user.name, email: user.email, role: "admin" });
  });

  it("uses the current role from the database, not the one in the token", async () => {
    const user = await createUser();
    const token = tokenFor(user); // role "user" in the token
    user.role = "admin";
    await user.save();

    const req = withToken(token);
    await authenticate(req, mockRes(), mockNext());
    expect(req.user?.role).toBe("admin");
  });

  it("rejects a missing or non-Bearer header with 401", async () => {
    await expect(authenticate(mockReq(), mockRes(), mockNext())).rejects.toMatchObject({ statusCode: 401 });
    await expect(
      authenticate(mockReq({ headers: { authorization: "Basic abc" } }), mockRes(), mockNext()),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects an invalid token (JWT error, mapped to 401 by the error handler)", async () => {
    await expect(authenticate(withToken("not.a.jwt"), mockRes(), mockNext())).rejects.toMatchObject({
      name: "JsonWebTokenError",
    });
  });

  it("rejects a token for a user that no longer exists", async () => {
    const ghost = { id: new Types.ObjectId().toString(), role: "user" as const };
    await expect(authenticate(withToken(tokenFor(ghost)), mockRes(), mockNext())).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("rejects a deactivated user with 403", async () => {
    const user = await createUser({ isActive: false });
    await expect(authenticate(withToken(tokenFor(user)), mockRes(), mockNext())).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
