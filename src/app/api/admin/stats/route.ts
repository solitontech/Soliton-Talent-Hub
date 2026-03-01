import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/admin/stats
 *
 * Returns aggregate statistics for the admin dashboard.
 * Requires authentication.
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const [
            totalQuestions,
            totalTests,
            totalCandidates,
            totalAdmins,
            questionsByDifficulty,
            recentQuestions,
        ] = await Promise.all([
            db.question.count(),
            db.test.count(),
            db.candidate.count(),
            db.admin.count(),
            db.question.groupBy({
                by: ["difficulty"],
                _count: { id: true },
            }),
            db.question.findMany({
                select: {
                    id: true,
                    title: true,
                    difficulty: true,
                    language: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
        ]);

        // Map grouped difficulty counts
        const difficultyMap: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
        for (const group of questionsByDifficulty) {
            difficultyMap[group.difficulty] = group._count.id;
        }

        return NextResponse.json({
            totalQuestions,
            totalTests,
            totalCandidates,
            totalAdmins,
            questionsByDifficulty: difficultyMap,
            recentQuestions,
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
