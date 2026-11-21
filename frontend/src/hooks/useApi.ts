import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { parseApiError, type ParsedApiError } from "../utils/apiError";

interface Result<T> {
  key: string;
  data?: T;
  error?: ParsedApiError;
}

/**
 * Loads data for a given `key` and reloads whenever the key changes.
 *
 *   const { data, loading, error, reload } = useApi(`posts?page=${page}`, () => postsApi.list({ page }));
 *
 * - `loading` is derived (result key !== current key), so no state is set synchronously in the effect.
 * - On `reload()` the previous data stays visible until the new data arrives (no flicker).
 * - Responses for an outdated key are ignored, so fast navigation can't show stale results.
 */
export function useApi<T>(key: string, load: () => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const requestKey = `${key}#${version}`;

  // Always calls the latest `load` without making it an effect dependency.
  const runLoad = useEffectEvent(() => load());

  useEffect(() => {
    let current = true;
    runLoad().then(
      (data) => current && setResult({ key: requestKey, data }),
      (err) => current && setResult({ key: requestKey, error: parseApiError(err) }),
    );
    return () => {
      current = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const sameResource = result?.key.startsWith(`${key}#`) ?? false;
  const loading = result?.key !== requestKey;

  return {
    data: sameResource ? result?.data : undefined,
    error: !loading ? result?.error : undefined,
    loading,
    reload,
  };
}
