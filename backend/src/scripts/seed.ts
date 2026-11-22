/**
 * Seeds an admin account and sample content for local development / demos.
 *
 *   npm run seed            # idempotent: creates what's missing, never touches other data
 *   npm run seed -- --fresh # first removes the sample accounts below and everything they created
 *
 * Admin credentials come from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (defaults below).
 */
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { User, type Role } from "../models/user.model";
import { Post } from "../models/post.model";
import { Comment } from "../models/comment.model";
import { ActivityLog } from "../models/activityLog.model";
import * as postService from "../services/post.service";
import * as commentService from "../services/comment.service";
import { createPostSchema } from "../validators/post.validator";

const ADMIN = {
  name: "Admin",
  email: (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase(),
  password: process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345",
  role: "admin" as Role,
};
const SAMPLE_PASSWORD = "Password123";
const USERS = [
  ADMIN,
  { name: "Alice Johnson", email: "alice@example.com", password: SAMPLE_PASSWORD, role: "user" as Role },
  { name: "Bob Smith", email: "bob@example.com", password: SAMPLE_PASSWORD, role: "user" as Role },
];

const POSTS: { author: string; title: string; content: string; comments: { by: string; text: string }[] }[] = [
  {
    author: "alice@example.com",
    title: "Getting started with the MERN stack",
    content:
      "<h2>Why MERN?</h2><p>MongoDB, Express, React and Node.js let you write the <strong>whole stack in JavaScript</strong>.</p>" +
      "<ul><li>MongoDB stores flexible JSON-like documents</li><li>Express handles the REST API</li><li>React renders the UI</li><li>Node.js runs it all</li></ul>" +
      '<p>Read more on <a href="https://www.mongodb.com/mern-stack">mongodb.com</a>.</p>',
    comments: [
      { by: "bob@example.com", text: "Great overview, thanks Alice!" },
      { by: "admin", text: "Welcome to the blog. Nice first post." },
    ],
  },
  {
    author: "bob@example.com",
    title: "JWT access and refresh tokens explained",
    content:
      "<p>Short-lived <em>access tokens</em> authorize API calls, while a long-lived <em>refresh token</em> in an httpOnly cookie gets new ones.</p>" +
      "<blockquote><p>Rotate refresh tokens on every use, and treat reuse as theft.</p></blockquote>" +
      "<pre><code>Authorization: Bearer &lt;access token&gt;</code></pre>",
    comments: [{ by: "alice@example.com", text: "The rotation part was new to me." }],
  },
  {
    author: "alice@example.com",
    title: "Soft deletes in MongoDB",
    content:
      "<p>Instead of removing a document, set <code>isDeleted</code> and <code>deletedAt</code>. Queries filter it out, and an admin can still restore it.</p>",
    comments: [],
  },
  {
    author: "admin",
    title: "Community guidelines",
    content:
      "<h3>Be kind</h3><p>Keep discussions respectful.</p><h3>Stay on topic</h3><p>Comments should relate to the post.</p>",
    comments: [{ by: "bob@example.com", text: "Noted 👍" }],
  },
];

const resolveEmail = (key: string) => (key === "admin" ? ADMIN.email : key);

async function removeSampleData() {
  const users = await User.find({ email: { $in: USERS.map((u) => u.email) } }).select("_id").lean();
  const ids = users.map((u) => u._id);
  const posts = await Post.find({ author: { $in: ids } }).select("_id").lean();
  await Promise.all([
    Comment.deleteMany({ $or: [{ author: { $in: ids } }, { post: { $in: posts.map((p) => p._id) } }] }),
    Post.deleteMany({ author: { $in: ids } }),
    ActivityLog.deleteMany({ user: { $in: ids } }),
  ]);
  await User.deleteMany({ _id: { $in: ids } });
  console.log(`Removed ${ids.length} sample user(s) and their content.`);
}

async function seed() {
  await connectDB();
  if (process.argv.includes("--fresh")) await removeSampleData();

  // Users: create missing ones; make sure the admin really is an active admin.
  const userIds = new Map<string, string>();
  for (const u of USERS) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create(u); // password hashed by the model's pre-save hook
      console.log(`Created ${u.role.padEnd(5)} ${u.email}`);
    } else if (u.role === "admin" && (user.role !== "admin" || !user.isActive)) {
      user.role = "admin";
      user.isActive = true;
      await user.save();
      console.log(`Promoted existing account ${u.email} to admin`);
    }
    userIds.set(u.email, user.id);
  }

  // Posts + comments: only when the sample authors have no posts yet (keeps re-runs idempotent).
  const existing = await Post.countDocuments({ author: { $in: [...userIds.values()] } });
  if (existing > 0) {
    console.log(`Sample authors already have ${existing} post(s); skipping posts (use --fresh to recreate).`);
  } else {
    for (const p of POSTS) {
      // Same validation + HTML sanitization as the API.
      const input = createPostSchema.parse({ title: p.title, content: p.content });
      const post = await postService.createPost(userIds.get(resolveEmail(p.author))!, input);
      for (const c of p.comments) {
        await commentService.createComment(post.id, userIds.get(resolveEmail(c.by))!, { content: c.text });
      }
    }
    console.log(`Created ${POSTS.length} posts and ${POSTS.reduce((n, p) => n + p.comments.length, 0)} comments.`);
  }

  console.log("\nLog in with:");
  console.log(`  admin  ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`  users  alice@example.com, bob@example.com / ${SAMPLE_PASSWORD}`);
}

seed()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
