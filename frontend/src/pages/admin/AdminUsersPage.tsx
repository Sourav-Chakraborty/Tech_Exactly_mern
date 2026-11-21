import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { adminApi } from "../../api/admin";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../hooks/useAuth";
import { useAdminAction } from "../../hooks/useAdminAction";
import { EmptyRow, RowAction, Table, Td } from "../../components/admin/Table";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { LoadError } from "../../components/ui/LoadError";
import { Pagination } from "../../components/ui/Pagination";
import { Spinner } from "../../components/ui/Spinner";
import { formatDate } from "../../utils/format";
import type { AdminUser, Role } from "../../types";

const PAGE_SIZE = 10;

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("search") ?? "";
  const role = (params.get("role") as Role | null) ?? undefined;

  // Filters live in the URL, so they survive reloads and the back button.
  const updateParams = (changes: Record<string, string | undefined>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        if (!("page" in changes)) next.delete("page"); // new filter -> back to page 1
        return next;
      },
      { replace: true },
    );

  // Search box: update the URL 300ms after the user stops typing.
  const [searchInput, setSearchInput] = useState(search);
  const debounce = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(debounce.current), []);
  const onSearchChange = (value: string) => {
    setSearchInput(value);
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => updateParams({ search: value.trim() || undefined }), 300);
  };

  const { data, error, loading, reload } = useApi(`admin:users?${page}&${search}&${role ?? ""}`, () =>
    adminApi.listUsers({ page, limit: PAGE_SIZE, search: search || undefined, role }),
  );
  const { run, busyId, error: actionError, notice } = useAdminAction(reload);

  const changeRole = (u: AdminUser, newRole: Role) =>
    run(u._id, () => adminApi.setRole(u._id, newRole), {
      confirm: {
        title: newRole === "admin" ? `Make ${u.name} an admin?` : `Remove admin rights from ${u.name}?`,
        message:
          newRole === "admin"
            ? "Admins can manage all users, posts and comments."
            : "They will keep their account but lose access to the admin panel.",
        confirmLabel: newRole === "admin" ? "Make admin" : "Remove admin",
      },
      success: `${u.name} is now ${newRole === "admin" ? "an admin" : "a regular user"}.`,
    });

  const toggleActive = (u: AdminUser) =>
    run(u._id, () => adminApi.setActive(u._id, !u.isActive), {
      confirm: u.isActive
        ? {
            title: `Deactivate ${u.name}?`,
            message: "They are logged out everywhere immediately and can't log in until reactivated.",
            confirmLabel: "Deactivate",
            danger: true,
          }
        : undefined,
      success: `${u.name} ${u.isActive ? "deactivated" : "reactivated"}.`,
    });

  const remove = (u: AdminUser) =>
    run(u._id, () => adminApi.deleteUser(u._id), {
      confirm: {
        title: `Delete ${u.name}?`,
        message: "The account and their comments are removed permanently; their posts are soft-deleted.",
        confirmLabel: "Delete user",
        danger: true,
      },
      success: `${u.name} deleted.`,
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label htmlFor="user-search" className="block text-sm font-medium text-slate-700">
            Search
          </label>
          <input
            id="user-search"
            type="search"
            placeholder="Name or email"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="role-filter" className="block text-sm font-medium text-slate-700">
            Role
          </label>
          <select
            id="role-filter"
            value={role ?? ""}
            onChange={(e) => updateParams({ role: e.target.value || undefined })}
            className="mt-1 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {actionError && <Alert>{actionError}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      {error ? (
        <LoadError error={error} onRetry={reload} />
      ) : !data ? (
        <Spinner fullPage />
      ) : (
        <div className={`space-y-4 ${loading ? "opacity-60" : ""}`}>
          <Table caption="Users" columns={["User", "Role", "Status", "Joined", "Actions"]}>
            {data.items.length === 0 ? (
              <EmptyRow colSpan={5} text="No users match." />
            ) : (
              data.items.map((u) => {
                const isMe = u._id === me?._id;
                const busy = busyId === u._id;
                return (
                  <tr key={u._id}>
                    <Td>
                      <div className="font-medium text-slate-900">
                        {u.name} {isMe && <Badge tone="indigo">You</Badge>}
                      </div>
                      <div className="text-slate-500">{u.email}</div>
                    </Td>
                    <Td>
                      <select
                        aria-label={`Role of ${u.name}`}
                        value={u.role}
                        disabled={isMe || busy}
                        title={isMe ? "You can't change your own role" : undefined}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </Td>
                    <Td>{u.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Deactivated</Badge>}</Td>
                    <Td className="whitespace-nowrap text-slate-500">{formatDate(u.createdAt)}</Td>
                    <Td>
                      <div className="flex gap-4">
                        <RowAction onClick={() => toggleActive(u)} disabled={isMe || busy} danger={u.isActive}>
                          {u.isActive ? "Deactivate" : "Activate"}
                        </RowAction>
                        <RowAction onClick={() => remove(u)} disabled={isMe || busy} danger>
                          Delete
                        </RowAction>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </Table>
          <Pagination meta={data.meta} onPageChange={(p) => updateParams({ page: p > 1 ? String(p) : undefined })} />
        </div>
      )}
    </div>
  );
}
