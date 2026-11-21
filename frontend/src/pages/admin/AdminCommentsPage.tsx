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
import { excerpt, formatDateTime } from "../../utils/format";
import type { AdminComment } from "../../types";

const PAGE_SIZE = 15;

export function AdminCommentsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);

  const { data, error, loading, reload } = useApi(`admin:comments?${page}`, () =>
    adminApi.listComments({ page, limit: PAGE_SIZE }),
  );
  const { run, busyId, error: actionError, notice } = useAdminAction(reload);

  const remove = (c: AdminComment) =>
    run(c._id, () => adminApi.deleteComment(c._id), {
      confirm: {
        title: "Delete this comment?",
        message: `"${excerpt(c.content, 80)}" will be removed permanently.`,
        confirmLabel: "Delete comment",
        danger: true,
      },
      success: "Comment deleted.",
    });

  if (error) return <LoadError error={error} onRetry={reload} />;
  if (!data) return <Spinner fullPage />;

  return (
    <div className={`space-y-4 ${loading ? "opacity-60" : ""}`}>
      {actionError && <Alert>{actionError}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <Table caption="Comments" columns={["Comment", "Author", "On post", "Posted", "Actions"]}>
        {data.items.length === 0 ? (
          <EmptyRow colSpan={5} text="No comments yet." />
        ) : (
          data.items.map((c) => (
            <tr key={c._id}>
              <Td className="max-w-sm">{excerpt(c.content, 120)}</Td>
              <Td>{c.author?.name ?? <span className="italic text-slate-400">Deleted user</span>}</Td>
              <Td className="max-w-xs">
                {!c.post ? (
                  <span className="italic text-slate-400">Deleted post</span>
                ) : c.post.isDeleted ? (
                  <span className="text-slate-500">
                    {c.post.title} <Badge tone="red">Post deleted</Badge>
                  </span>
                ) : (
                  <Link to={`/posts/${c.post.slug}`} className="text-slate-900 hover:text-indigo-600">
                    {c.post.title}
                  </Link>
                )}
              </Td>
              <Td className="whitespace-nowrap text-slate-500">{formatDateTime(c.createdAt)}</Td>
              <Td>
                <RowAction onClick={() => remove(c)} disabled={busyId === c._id} danger>
                  Delete
                </RowAction>
              </Td>
            </tr>
          ))
        )}
      </Table>
      <Pagination meta={data.meta} onPageChange={(p) => setParams(p > 1 ? { page: String(p) } : {})} />
    </div>
  );
}
