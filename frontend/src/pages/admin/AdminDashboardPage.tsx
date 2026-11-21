import { adminApi } from "../../api/admin";
import { useApi } from "../../hooks/useApi";
import { StatTile } from "../../components/admin/StatTile";
import { EmptyRow, Table, Td } from "../../components/admin/Table";
import { LoadError } from "../../components/ui/LoadError";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { formatDateTime } from "../../utils/format";

// Human-readable labels for activity-log actions.
const ACTION_LABELS: Record<string, string> = {
  "auth.register": "Signed up",
  "auth.login": "Logged in",
  "auth.logout": "Logged out",
  "post.create": "Created a post",
  "post.update": "Edited a post",
  "post.delete": "Deleted a post",
  "comment.create": "Commented",
  "comment.update": "Edited a comment",
  "comment.delete": "Deleted a comment",
  "admin.user.role": "Changed a user's role",
  "admin.user.status": "Changed a user's status",
  "admin.user.delete": "Deleted a user",
  "admin.post.restore": "Restored a post",
  "admin.post.purge": "Permanently deleted a post",
  "admin.comment.delete": "Deleted a comment (admin)",
};

export function AdminDashboardPage() {
  const { data: stats, error, loading, reload } = useApi("admin:stats", () => adminApi.stats());

  if (error) return <LoadError error={error} onRetry={reload} />;
  if (!stats) return <Spinner fullPage />;

  return (
    <div className="space-y-8">
      <section aria-label="Totals" className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total users" value={stats.totalUsers} />
        <StatTile
          label="Total posts"
          value={stats.totalPosts}
          note={`${stats.deletedPosts.toLocaleString()} soft-deleted, not included`}
        />
        <StatTile label="Total comments" value={stats.totalComments} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <Button variant="secondary" onClick={reload} loading={loading}>
            Refresh
          </Button>
        </div>
        <Table caption="Recent activity" columns={["When", "User", "Action"]}>
          {stats.recentActivity.length === 0 ? (
            <EmptyRow colSpan={3} text="No activity yet." />
          ) : (
            stats.recentActivity.map((a) => (
              <tr key={a._id}>
                <Td className="whitespace-nowrap text-slate-500">{formatDateTime(a.createdAt)}</Td>
                <Td>
                  {a.user ? (
                    <>
                      <span className="font-medium text-slate-900">{a.user.name}</span>
                      <span className="ml-2 text-slate-500">{a.user.email}</span>
                    </>
                  ) : (
                    <span className="italic text-slate-400">Deleted user</span>
                  )}
                </Td>
                <Td>{ACTION_LABELS[a.action] ?? a.action}</Td>
              </tr>
            ))
          )}
        </Table>
      </section>
    </div>
  );
}
