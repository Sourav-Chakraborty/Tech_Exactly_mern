import type { ParsedApiError } from "../../utils/apiError";
import { NotFoundPage } from "../../pages/NotFoundPage";
import { Alert } from "./Alert";
import { Button } from "./Button";

// What to show when loading a page's data failed.
export function LoadError({ error, onRetry }: { error: ParsedApiError; onRetry?: () => void }) {
  if (error.status === 404) return <NotFoundPage />;
  return (
    <div className="space-y-3">
      <Alert>{error.message}</Alert>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
