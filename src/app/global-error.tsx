"use client";

// Root-level fallback — only fires if the root layout itself throws, which
// (app)/error.tsx and (auth) pages don't cover. Must render its own
// <html>/<body> since it replaces the entire tree, including the layout.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px", fontFamily: "system-ui, sans-serif" }}>
          <p style={{ fontSize: "14px", fontWeight: 500 }}>Something went wrong.</p>
          <button
            type="button"
            onClick={reset}
            style={{ borderRadius: "6px", background: "#16a34a", color: "#fff", padding: "8px 16px", fontSize: "14px", border: "none", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
