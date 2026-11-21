// Runs before any test module is loaded, so src/config/env.ts sees these values.
// dotenv never overrides variables that are already set, so the real .env is not used.
process.env.NODE_ENV = "test";
process.env.MONGODB_URL = "mongodb://in-memory"; // tests connect to mongodb-memory-server instead
process.env.CLIENT_URL = "http://localhost:5173";
process.env.JWT_ACCESS_SECRET = "test-access-secret-test-access-secret-0123";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-test-refresh-secret-0123";
process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.BCRYPT_SALT_ROUNDS = "4"; // production default is 12; 4 keeps tests fast
// OAuth providers stay disabled unless a test enables them.
process.env.GOOGLE_CLIENT_ID = "";
process.env.GOOGLE_CLIENT_SECRET = "";
process.env.FACEBOOK_APP_ID = "";
process.env.FACEBOOK_APP_SECRET = "";
