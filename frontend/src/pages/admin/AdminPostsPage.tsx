import { Link, useSearchParams } from "react-router";
import { adminApi } from "../../api/admin";
import { useApi } from "../../hooks/useApi";
import { useAdminAction } from "../../hooks/useAdminAction";
import { EmptyRow, RowAction, Table, Td } from "../../components/admin/Table";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { LoadError } from "../../components/ui/LoadError";
import { Pagination } from "../../components/ui/Pagination";
import { Spinner } from "../../components/ui/Spinner";
import { formatDate } from "../../utils/format";
import type { AdminPost, PostStatusFilter } from "../../types";

const PAGE_SIZE = 10;
const FILTERS: { value: PostStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Published" },
  { value: "deleted", label: "Deleted" },
];

export function AdminPostsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = (FILTERS.find((f) => f.value === params.get("status"))?.value ?? "all") as PostStatusFilter;

  const { data, error, loading, reload } = useApi(`admin:posts?${status}&${page}`, () =>
    adminApi.listPosts({ page, limit: PAGE_SIZE, status }),
  );
  const { run, busyId, error: actionError, notice } = useAdminAction(reload);

  const softDelete = (p: AdminPost) =>
    run(p._id, () => adminApi.softDeletePost(p._id), {
      confirm: {
        title: "Delete this post?",
        message: `"${p.title}" will be hidden from the site. You can restore it later.`,
        confirmLabel: "Delete post",
        danger: true,
      },
      success: `"${p.title}" deleted (restorable).`,
    });

  const restore = (p: AdminPost) =>
    run(p._id, () => adminApi.restorePost(p._id), { success: `"${p.title}" restored.` });

  const purge = (p: AdminPost) =>
    run(p._id, () => adminApi.purgePost(p._id), {
      confirm: {
        title: "Delete permanently?",
        message: `"${p.title}" and all its comments will be erased. This can't be undone.`,
        confirmLabel: "Delete permanently",
        danger: true,
      },
      success: `"${p.title}" permanently deleted.`,
    });

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filter by status" className="inline-flex rounded-md border border-slate-300 bg-white p-0.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={status === f.value}
            onClick={() => setParams(f.value === "all" ? {} : { status: f.value }, { replace: true })}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              status === f.value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {actionError && <Alert>{actionError}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      {error ? (
        <LoadError error={error} onRetry={reload} />
      ) : !data ? (
        <Spinner fullPage />
      ) : (
        <div className={`space-y-4 ${loading ? "opacity-60" : ""}`}>
          <Table caption="Posts" columns={["Title", "Author", "Created", "Status", "Actions"]}>
            {data.items.length === 0 ? (
              <EmptyRow colSpan={5} text="No posts here." />
            ) : (
              data.items.map((p) => {
                const busy = busyId === p._id;
                return (
                  <tr key={p._id}>
                    <Td className="max-w-xs">
                      {p.isDeleted ? (
                        <span className="text-slate-500">{p.title}</span>
                      ) : (
                        <Link to={`/posts/${p.slug}`} className="font-medium text-slate-900 hover:text-indigo-600">
                          {p.title}
                        </Link>
                      )}
                    </Td>
                    <Td>
                      {p.author ? (
                        <>
                          <div>{p.author.name}</div>
                          <div className="text-xs text-slate-500">{p.author.email}</div>
                        </>
                      ) : (
                        <span className="italic text-slate-400">Deleted user</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-slate-500">{formatDate(p.createdAt)}</Td>
                    <Td>
                      {p.isDeleted ? (
                        <div>
                          <Badge tone="red">Deleted</Badge>
                          {p.deletedAt && <div className="mt-1 text-xs text-slate-500">{formatDate(p.deletedAt)}</div>}
                        </div>
                      ) : (
                        <Badge tone="green">Published</Badge>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-4">
                        {p.isDeleted ? (
                          <RowAction onClick={() => restore(p)} disabled={busy}>
                            Restore
                          </RowAction>
                        ) : (
                          <>
                            <Link to={`/posts/${p._id}/edit`} className="text-sm font-medium text-slate-600 hover:text-indigo-600">
                              Edit
                            </Link>
                            <RowAction onClick={() => softDelete(p)} disabled={busy} danger>
                              Delete
                            </RowAction>
                          </>
                        )}
                        <RowAction onClick={() => purge(p)} disabled={busy} danger>
                          Delete permanently
                        </RowAction>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </Table>
          <Pagination
            meta={data.meta}
            onPageChange={(pg) => {
              const next = new URLSearchParams(params);
              if (pg > 1) next.set("page", String(pg));
              else next.delete("page");
              setParams(next);
            }}
          />
        </div>
      )}
    </div>
  );
}
