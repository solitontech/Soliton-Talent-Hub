import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
    createQuestionSchema,
    listQuestionsQuerySchema,
} from "@/lib/validations/question";

/**
 * GET /api/questions
 *
 * List questions with optional search, filters, and pagination.
 * Requires authentication.
 *
 * Query params: ?search=&difficulty=&language=&page=1&limit=20
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const queryResult = listQuestionsQuerySchema.safeParse({
            search: searchParams.get("search") || undefined,
            difficulty: searchParams.get("difficulty") || undefined,
            language: searchParams.get("language") || undefined,
            page: searchParams.get("page") || undefined,
            limit: searchParams.get("limit") || undefined,
        });

        if (!queryResult.success) {
            return NextResponse.json(
                { error: "Invalid query parameters", details: queryResult.error.issues },
                { status: 400 }
            );
        }

        const { search, difficulty, language, page, limit } = queryResult.data;
        const skip = (page - 1) * limit;

        // Build Prisma where clause
        const where: Record<string, unknown> = {};
        if (difficulty) where.difficulty = difficulty;
        if (language) where.language = language;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }

        // Execute count + query in parallel
        const [total, questions] = await Promise.all([
            db.question.count({ where }),
            db.question.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    difficulty: true,
                    language: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: { testCases: true },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
        ]);

        return NextResponse.json({
            questions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("List questions error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/questions
 *
 * Create a new question with test cases.
 * Requires authentication.
 *
 * Body: { title, description, difficulty, language, boilerplateCode, testCases[] }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const result = createQuestionSchema.safeParse(body);

        if (!result.success) {
            const errors = result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            return NextResponse.json(
                { error: "Validation failed", details: errors },
                { status: 400 }
            );
        }

        const { title, description, difficulty, language, boilerplateCode, testCases } =
            result.data;

        const question = await db.question.create({
            data: {
                title,
                description,
                difficulty,
                language,
                boilerplateCode: boilerplateCode ?? null,
                createdById: session.user.id,
                testCases: {
                    create: testCases.map((tc, index) => ({
                        input: tc.input,
                        output: tc.output,
                        isPublic: tc.isPublic,
                        order: tc.order ?? index,
                    })),
                },
            },
            include: {
                testCases: {
                    orderBy: { order: "asc" },
                },
            },
        });

        return NextResponse.json(question, { status: 201 });
    } catch (error) {
        console.error("Create question error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
