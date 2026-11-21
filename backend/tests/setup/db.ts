import os from "node:os";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Every test file gets its own in-memory MongoDB, so files can run in parallel.
let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  // MongoDB driver 7 loads `os` with a dynamic import(), which Jest's CommonJS VM rejects
  // ("A dynamic import callback was invoked without --experimental-vm-modules"). The driver
  // then sends an empty handshake and the server refuses the connection. Passing the adapter
  // explicitly skips that import.
  await mongoose.connect(mongo.getUri(), { runtimeAdapters: { os } });
  // Build unique indexes (email, slug, ...) before tests rely on them.
  await mongoose.connection.syncIndexes();
});

// Each test starts with empty collections (indexes are kept).
afterEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
