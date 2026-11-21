import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { parseApiError } from "../utils/apiError";
import { useFormError } from "../hooks/useFormError";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { FormField } from "../components/ui/FormField";
import { SocialLoginButtons } from "../components/auth/SocialLoginButtons";

export function LoginPage() {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  // Set by the API when a social login fails (e.g. /login?error=Account%20is%20deactivated)
  const oauthError = searchParams.get("error");

  const [form, setForm] = useState({ email: "", password: "" });
  const { error, setError, clearField } = useFormError();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(form);
      // GuestRoute redirects to the originally requested page once authenticated.
    } catch (err) {
      setError(parseApiError(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Log in</h1>

      {oauthError && !error && <Alert>{oauthError}</Alert>}
      {error && <Alert>{error.message}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => {
            setForm({ ...form, email: e.target.value });
            clearField("email");
          }}
          error={error?.fieldErrors.email}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(e) => {
            setForm({ ...form, password: e.target.value });
            clearField("password");
          }}
          error={error?.fieldErrors.password}
        />
        <Button type="submit" loading={submitting} className="w-full">
          Log in
        </Button>
      </form>

      <SocialLoginButtons />

      <p className="text-center text-sm text-slate-600">
        No account?{" "}
        <Link to="/register" className="font-medium text-indigo-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
