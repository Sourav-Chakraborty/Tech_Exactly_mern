import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium ${isActive ? "text-indigo-600" : "text-slate-600 hover:text-slate-900"}`;

export function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link to="/" className="text-lg font-bold text-indigo-600">
            MERN Blog
          </Link>
          <NavLink to="/" end className={navClass}>
            Posts
          </NavLink>
          {user && (
            <NavLink to="/posts/new" className={navClass}>
              New post
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={navClass}>
              Admin
            </NavLink>
          )}

          <div className="ml-auto flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-slate-600">
                  {user.name}
                  {isAdmin && (
                    <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                      admin
                    </span>
                  )}
                </span>
                <button onClick={handleLogout} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClass}>
                  Log in
                </NavLink>
                <Link
                  to="/register"
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
