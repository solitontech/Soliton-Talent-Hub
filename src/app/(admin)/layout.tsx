import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminSidebar } from "@/components/admin/sidebar";

/**
 * Admin layout — wraps all /admin/* routes.
 *
 * Provides:
 * - Fixed sidebar navigation on the left
 * - Scrollable main content area on the right
 * - TooltipProvider for sidebar tooltips
 */
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
