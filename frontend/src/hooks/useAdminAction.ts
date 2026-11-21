import { useCallback, useState } from "react";
import { useConfirm } from "./useConfirm";
import type { ConfirmOptions } from "../context/confirmContext";
import { parseApiError } from "../utils/apiError";

/**
 * Runs a table-row mutation: optional confirmation modal -> API call -> reload,
 * tracking which row is busy and surfacing the API's error message.
 *
 *   const { run, busyId, error, notice } = useAdminAction(reload);
 *   run(user._id, () => adminApi.deleteUser(user._id), { confirm: {...}, success: "User deleted" });
 */
export function useAdminAction(onDone: () => void) {
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = useCallback(
    async (id: string, action: () => Promise<unknown>, opts: { confirm?: ConfirmOptions; success?: string } = {}) => {
      if (opts.confirm && !(await confirm(opts.confirm))) return;
      setBusyId(id);
      setError(null);
      setNotice(null);
      try {
        await action();
        if (opts.success) setNotice(opts.success);
        onDone();
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setBusyId(null);
      }
    },
    [confirm, onDone],
  );

  return { run, busyId, error, notice };
}
