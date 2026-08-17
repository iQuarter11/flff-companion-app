export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-semibold tracking-tight">FFFL</span>
          <p className="mt-1 text-sm text-muted">Your league&apos;s home base.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
