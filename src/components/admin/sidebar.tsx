"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    LayoutDashboard,
    FileCode2,
    ClipboardList,
    Mail,
    Users,
    Settings,
    LogOut,
    Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
    {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Questions",
        href: "/admin/questions",
        icon: FileCode2,
    },
    {
        title: "Tests",
        href: "/admin/tests",
        icon: ClipboardList,
    },
    {
        title: "Invitations",
        href: "/admin/invitations",
        icon: Mail,
    },
    {
        title: "Candidates",
        href: "/admin/candidates",
        icon: Users,
    },
    {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
    },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
            {/* ── Logo / Brand ──────────────────────────────────── */}
            <div className="flex h-16 items-center gap-2 px-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <Code2 className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-sidebar-foreground">
                        Campus Coder
                    </span>
                    <span className="text-xs text-sidebar-foreground/60">
                        Admin Panel
                    </span>
                </div>
            </div>

            <Separator className="bg-sidebar-border" />

            {/* ── Navigation ────────────────────────────────────── */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href || pathname?.startsWith(item.href + "/");
                    return (
                        <Tooltip key={item.href} delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                    )}
                                >
                                    <item.icon className="h-4 w-4 shrink-0" />
                                    <span>{item.title}</span>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="hidden">
                                {item.title}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </nav>

            <Separator className="bg-sidebar-border" />

            {/* ── Footer / Sign Out ─────────────────────────────── */}
            <div className="p-3">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    onClick={() => signOut({ callbackUrl: "/admin/login" })}
                >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                </Button>
            </div>
        </aside>
    );
}
