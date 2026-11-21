import { NavLink, Outlet } from "react-router";

const tabs = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/posts", label: "Posts" },
  { to: "/admin/comments", label: "Comments" },
];

// Shell for every /admin page. Access is restricted by <ProtectedRoute role="admin"> in App
// and, independently, by authenticate + authorize("admin") on every /api/v1/admin endpoint.
export function AdminLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin panel</h1>
        <nav aria-label="Admin sections" className="mt-4 flex gap-1 border-b border-slate-200">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                  isActive
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
