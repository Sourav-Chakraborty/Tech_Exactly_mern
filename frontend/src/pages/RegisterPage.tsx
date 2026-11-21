import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { parseApiError } from "../utils/apiError";
import { useFormError } from "../hooks/useFormError";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { FormField } from "../components/ui/FormField";
import { SocialLoginButtons } from "../components/auth/SocialLoginButtons";

export function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { error, setError, clearField } = useFormError();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(form);
    } catch (err) {
      setError(parseApiError(err));
      setSubmitting(false);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [key]: e.target.value });
      clearField(key);
    },
    error: error?.fieldErrors[key],
  });

  return (
    <div className="mx-auto max-w-sm space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Create an account</h1>

      {error && <Alert>{error.message}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField label="Name" autoComplete="name" required {...field("name")} />
        <FormField label="Email" type="email" autoComplete="email" required {...field("email")} />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          {...field("password")}
        />
        <p className="-mt-2 text-xs text-slate-500">At least 8 characters.</p>
        <Button type="submit" loading={submitting} className="w-full">
          Sign up
        </Button>
      </form>

      <SocialLoginButtons />

      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
