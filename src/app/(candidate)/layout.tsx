import { Code2 } from "lucide-react";

/**
 * Candidate layout — wraps all /test/* routes.
 *
 * Minimal chrome:
 * - Small header with brand name only (no navigation)
 * - Full-height content area
 * - Clean, distraction-free design for test-taking
 */
export default function CandidateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* ── Minimal header ────────────────────────────────── */}
            <header className="flex h-14 items-center border-b border-border px-6">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                        <Code2 className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                        Soliton Campus Coder
                    </span>
                </div>
            </header>

            {/* ── Content ───────────────────────────────────────── */}
            <main className="flex-1">{children}</main>
        </div>
    );
}
