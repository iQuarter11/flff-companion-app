import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmEmail?: string; next?: string }>;
}) {
  const { confirmEmail, next } = await searchParams;

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-6">
      <h1 className="text-lg font-semibold">Log in</h1>

      {confirmEmail ? (
        <p className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">
          Check your email to confirm your account, then log in.
        </p>
      ) : null}

      <LoginForm next={next} />

      <p className="mt-6 text-center text-sm text-muted">
        Need an account?{" "}
        <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </div>
  );
}
