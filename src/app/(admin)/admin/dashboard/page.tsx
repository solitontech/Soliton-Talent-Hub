"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    FileCode2,
    ClipboardList,
    Users,
    Shield,
    ArrowRight,
    Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DashboardStats {
    totalQuestions: number;
    totalTests: number;
    totalCandidates: number;
    totalAdmins: number;
    questionsByDifficulty: Record<string, number>;
    recentQuestions: {
        id: string;
        title: string;
        difficulty: string;
        language: string;
        createdAt: string;
    }[];
}

const statCards = [
    {
        title: "Questions",
        key: "totalQuestions" as const,
        icon: FileCode2,
        href: "/admin/questions",
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
        title: "Tests",
        key: "totalTests" as const,
        icon: ClipboardList,
        href: "/admin/tests",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
        title: "Candidates",
        key: "totalCandidates" as const,
        icon: Users,
        href: "/admin/candidates",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-950/50",
    },
    {
        title: "Admins",
        key: "totalAdmins" as const,
        icon: Shield,
        href: "/admin/settings",
        color: "text-violet-600 dark:text-violet-400",
        bg: "bg-violet-50 dark:bg-violet-950/50",
    },
];

const difficultyColors: Record<string, string> = {
    EASY: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    HARD: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch("/api/admin/stats");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to fetch stats:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* ── Header ────────────────────────────────── */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <p className="mt-1 text-muted-foreground">
                    Welcome to Soliton Talent Hub admin panel.
                </p>
            </div>

            {/* ── Stats Cards ───────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card) => (
                    <Link key={card.key} href={card.href}>
                        <Card className="transition-shadow hover:shadow-md cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {card.title}
                                </CardTitle>
                                <div className={`rounded-lg p-2 ${card.bg}`}>
                                    <card.icon className={`h-4 w-4 ${card.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {stats?.[card.key] ?? 0}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* ── Difficulty Breakdown ───────────────────── */}
            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Questions by Difficulty</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {["EASY", "MEDIUM", "HARD"].map((level) => {
                                const count = stats?.questionsByDifficulty?.[level] ?? 0;
                                const total = stats?.totalQuestions || 1;
                                const percentage = Math.round((count / total) * 100) || 0;

                                return (
                                    <div key={level} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="secondary"
                                                    className={difficultyColors[level]}
                                                >
                                                    {level}
                                                </Badge>
                                            </div>
                                            <span className="text-sm font-medium">
                                                {count} ({percentage}%)
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-muted">
                                            <div
                                                className="h-2 rounded-full bg-primary transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* ── Recent Questions ──────────────────────── */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Recent Questions</CardTitle>
                        <Link href="/admin/questions">
                            <Button variant="ghost" size="sm" className="gap-1">
                                View all
                                <ArrowRight className="h-3 w-3" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {!stats?.recentQuestions?.length ? (
                            <p className="text-sm text-muted-foreground">
                                No questions yet.{" "}
                                <Link
                                    href="/admin/questions/new"
                                    className="text-primary underline underline-offset-4"
                                >
                                    Create one
                                </Link>
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {stats.recentQuestions.map((q) => (
                                    <Link
                                        key={q.id}
                                        href={`/admin/questions/${q.id}`}
                                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {q.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(q.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="ml-3 flex items-center gap-2">
                                            <Badge
                                                variant="secondary"
                                                className={difficultyColors[q.difficulty]}
                                            >
                                                {q.difficulty}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {q.language}
                                            </Badge>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
