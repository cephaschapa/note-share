"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Eye, EyeOff, Loader2 } from "lucide-react";
import { api, parseApiError, type ApiFieldErrors } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function validate(): ApiFieldErrors {
    const errors: ApiFieldErrors = {};
    if (!form.email.trim()) {
      errors.email = ["Email is required"];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = ["Enter a valid email address"];
    }
    if (form.password.length < 8)
      errors.password = ["Password must be at least 8 characters"];
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setServerError("");
    setLoading(true);

    try {
      const { data } = await api.post<{ token: string }>("/auth/login", form);
      localStorage.setItem("note_share_token", data.token);
      router.push("/");
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.type === "field") {
        setFieldErrors(parsed.errors);
      } else {
        setServerError(parsed.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2.5 mb-10 group"
        >
          <BookOpen
            className="w-8 h-8 group-hover:opacity-70 transition-opacity"
            strokeWidth={1.75}
          />
          <span className="text-[22px] font-bold tracking-tight">
            NoteShare
          </span>
        </Link>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-center text-zinc-900 dark:text-zinc-50">
            Welcome back
          </h1>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 text-center mt-1 mb-7">
            Log in to your NoteShare account
          </p>

          {/* Server error banner */}
          {serverError && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <Field label="Email address" error={fieldErrors.email?.[0]}>
              <input
                type="email"
                placeholder="alex@example.com"
                autoComplete="email"
                {...field("email")}
                className={inputClass(!!fieldErrors.email)}
              />
            </Field>

            {/* Password */}
            <Field label="Password" error={fieldErrors.password?.[0]}>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  autoComplete="current-password"
                  {...field("password")}
                  className={inputClass(!!fieldErrors.password) + " pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 mt-1 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold text-[15px] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>
        </div>

        {/* Register link */}
        <p className="text-center text-[13px] text-zinc-500 dark:text-zinc-400 mt-5">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-zinc-900 dark:text-zinc-50 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function inputClass(hasError: boolean) {
  return [
    "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-zinc-950",
    "text-[15px] text-zinc-900 dark:text-zinc-50",
    "placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
    "outline-none transition-colors",
    "focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10",
    hasError
      ? "border-red-400 dark:border-red-600"
      : "border-zinc-300 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500",
  ].join(" ");
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-[12px] text-red-500 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
