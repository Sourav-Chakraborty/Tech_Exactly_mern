import { Types } from "mongoose";
import { logActivity } from "../../../src/middleware/activityLogger";
import { ActivityLog } from "../../../src/models/activityLog.model";
import { mockNext, mockReq, mockRes } from "../mocks";

// The log is written asynchronously after "finish"; wait for it to land.
const flush = () => new Promise((r) => setTimeout(r, 50));

const userId = new Types.ObjectId().toString();
const authUser = { id: userId, name: "n", email: "e@x.dev", role: "user" as const };

const run = async (opts: { status: number; user?: typeof authUser; locals?: Record<string, unknown>; params?: Record<string, string> }) => {
  const req = mockReq({ user: opts.user, params: opts.params ?? {}, ip: "1.2.3.4", get: () => "jest-agent" });
  const res = mockRes();
  Object.assign(res.locals, opts.locals);
  const next = mockNext();
  logActivity("post.delete")(req, res, next);
  expect(next).toHaveBeenCalled();
  res.statusCode = opts.status;
  res.emit("finish");
  await flush();
};

describe("logActivity", () => {
  it("records a successful action with user, resource, ip and user agent", async () => {
    const postId = new Types.ObjectId().toString();
    await run({ status: 200, user: authUser, params: { id: postId } });

    const logs = await ActivityLog.find().lean();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ action: "post.delete", ip: "1.2.3.4", userAgent: "jest-agent" });
    expect(String(logs[0].user)).toBe(userId);
    expect(String(logs[0].resourceId)).toBe(postId);
  });

  it("prefers res.locals (userId/resourceId) for routes without authenticate", async () => {
    const resourceId = new Types.ObjectId().toString();
    await run({ status: 201, locals: { userId, resourceId } });
    const [log] = await ActivityLog.find().lean();
    expect(String(log.user)).toBe(userId);
    expect(String(log.resourceId)).toBe(resourceId);
  });

  it("records redirects (successful social login)", async () => {
    await run({ status: 302, locals: { userId } });
    expect(await ActivityLog.countDocuments()).toBe(1);
  });

  it("does not record failed requests", async () => {
    await run({ status: 403, user: authUser });
    await run({ status: 500, user: authUser });
    expect(await ActivityLog.countDocuments()).toBe(0);
  });

  it("does not record when no user is known", async () => {
    await run({ status: 200 });
    expect(await ActivityLog.countDocuments()).toBe(0);
  });
});
