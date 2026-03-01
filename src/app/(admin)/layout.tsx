import { redirect } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminSidebar } from "@/components/admin/sidebar";
import { auth } from "@/lib/auth";

/**
 * Admin layout — wraps all /admin/* routes (inside the (admin) group).
 *
 * Provides:
 * - Server-side auth check — redirects to /admin/login if not signed in
 * - Fixed sidebar navigation on the left
 * - Scrollable main content area on the right
 * - TooltipProvider for sidebar tooltips
 */
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/admin/login");
    }

    return (
        <TooltipProvider>
            <div className="flex h-screen overflow-hidden">
                <AdminSidebar />
                <main className="flex-1 overflow-y-auto bg-background">
                    <div className="container mx-auto max-w-7xl px-6 py-8">
                        {children}
                    </div>
                </main>
            </div>
        </TooltipProvider>
    );
}
