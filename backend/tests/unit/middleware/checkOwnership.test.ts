import { Types } from "mongoose";
import { checkOwnership } from "../../../src/middleware/checkOwnership";
import { mockNext, mockReq, mockRes } from "../mocks";

const ownerId = new Types.ObjectId();
const resource = { author: ownerId };
const loader = jest.fn(async () => resource);

const authUser = (id: string, role: "user" | "admin" = "user") => ({
  id,
  role,
  name: "n",
  email: "e@x.dev",
});

describe("checkOwnership", () => {
  beforeEach(() => loader.mockClear());

  it("lets the owner through and stores the resource on res.locals", async () => {
    const res = mockRes();
    const next = mockNext();
    await checkOwnership(loader)(mockReq({ user: authUser(ownerId.toString()) }), res, next);
    expect(next).toHaveBeenCalledWith();
    expect(res.locals.resource).toBe(resource);
  });

  it("lets an admin through for someone else's resource", async () => {
    const next = mockNext();
    const req = mockReq({ user: authUser(new Types.ObjectId().toString(), "admin") });
    await checkOwnership(loader)(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it("rejects another regular user with 403", async () => {
    const req = mockReq({ user: authUser(new Types.ObjectId().toString()) });
    await expect(checkOwnership(loader)(req, mockRes(), mockNext())).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("returns 404 when the resource does not exist", async () => {
    const req = mockReq({ user: authUser(ownerId.toString(), "admin") });
    await expect(checkOwnership(async () => null)(req, mockRes(), mockNext())).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("returns 401 without an authenticated user and never loads the resource", async () => {
    await expect(checkOwnership(loader)(mockReq(), mockRes(), mockNext())).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(loader).not.toHaveBeenCalled();
  });
});
