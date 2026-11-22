# Demo video script (about 8 minutes)

**Before recording**
- `cd backend && npm run seed -- --fresh`, then start the backend and frontend (`npm run dev` in each).
- Open two browser windows side by side: **Window A** (normal) and **Window B** (private/incognito, so cookies are separate).
- Have the editor/terminal ready to show code briefly.

| # | Time | Show | Say / point out |
|---|---|---|---|
| 1 | 0:00 | README top section, folder tree in the editor | MERN blog in TypeScript. Backend layers: routes → middleware → controllers → services → models. React frontend with Context API. |
| 2 | 0:45 | **Window A:** Sign up with a too-short password, then valid details | Zod validation errors from the API shown per field; they clear as you type. Account created, logged in. |
| 3 | 1:30 | DevTools → Application → Cookies, then Network → reload | Refresh token in an **httpOnly** cookie; the access token only in memory. One `/auth/refresh` on reload restores the session. |
| 4 | 2:00 | Log out, then log in with a wrong password 3x, then correctly | Same message for unknown email and wrong password; rate limiting on auth (mention the 429 after 10 failures). |
| 5 | 2:30 | (If configured) "Continue with Google" | OAuth 2.0 via Passport; account linked by email; CSRF `state` check. |
| 6 | 3:00 | **Window A (Alice, `alice@example.com`)**: New post with heading, bold, list and link → Publish | Rich-text editor; URL-friendly slug in the address bar; HTML sanitized on the server and in the browser. |
| 7 | 3:45 | Home page → pagination, "My posts", Edit the title | Slug follows the title; owner sees Edit/Delete. |
| 8 | 4:15 | **Window B (Bob)** opens Alice's post | No Edit/Delete for Bob. Bob comments → **Window A shows a real-time toast** ("Bob commented on …"). Click "View comment". |
| 9 | 5:00 | Bob edits/deletes his own comment (styled confirmation modal); try `/posts/<id>/edit` of Alice's post | 403 page. Mention the API enforces it too (RBAC middleware). |
| 10 | 5:30 | **Window B:** log in as **admin** (`admin@example.com`), go to Admin | Dashboard: totals + recent activity log. While watching, Alice publishes a post in Window A → **admin toast**. |
| 11 | 6:15 | Admin → Users: search, make Bob admin (confirm), deactivate Alice | Window A (Alice) is logged out on her next action; role changes apply immediately. Reactivate. |
| 12 | 7:00 | Admin → Posts: delete a post (soft) → Deleted filter → Restore → Delete permanently | Soft delete with `isDeleted`/`deletedAt`; admins restore or purge. Admin → Comments: delete a comment. |
| 13 | 7:30 | Terminal: `cd backend && npm test` | 182 unit + integration tests against in-memory MongoDB; coverage ~97% lines. |
| 14 | 8:00 | Wrap up | Recap: JWT + refresh rotation, RBAC at API level, validation, soft deletes, indexes + pagination, centralized errors, tests, real-time notifications. |
