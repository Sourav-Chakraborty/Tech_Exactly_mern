import { authApi } from "../../api/auth";

// Plain links: social login is a full-page redirect through the API to the provider.
export function SocialLoginButtons() {
  const linkClass =
    "flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs uppercase text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or continue with
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <a href={authApi.oauthUrl("google")} className={linkClass}>
          Google
        </a>
        <a href={authApi.oauthUrl("facebook")} className={linkClass}>
          Facebook
        </a>
      </div>
    </div>
  );
}
