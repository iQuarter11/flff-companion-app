import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-lg font-semibold">Page not found</p>
      <p className="max-w-sm text-sm text-muted">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
      <Link href="/" className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
        Back to Home
      </Link>
    </div>
  );
}
