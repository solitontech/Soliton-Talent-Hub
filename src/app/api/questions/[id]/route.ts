import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { updateQuestionSchema } from "@/lib/validations/question";

type RouteContext = {
    params: Promise<{ id: string }>;
};

/**
 * GET /api/questions/[id]
 *
 * Get a single question with all its test cases.
 * Requires authentication.
 */
export async function GET(
    _request: NextRequest,
    context: RouteContext
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await context.params;

        const question = await db.question.findUnique({
            where: { id },
            include: {
                testCases: {
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!question) {
            return NextResponse.json(
                { error: "Question not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(question);
    } catch (error) {
        console.error("Get question error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/questions/[id]
 *
 * Update a question. If testCases is provided, it replaces ALL
 * existing test cases (delete old + create new in a transaction).
 * Requires authentication.
 */
export async function PUT(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await context.params;

        // Check question exists
        const existing = await db.question.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json(
                { error: "Question not found" },
                { status: 404 }
            );
        }

        const body = await request.json();
        const result = updateQuestionSchema.safeParse(body);

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

        const { testCases, ...questionFields } = result.data;

        // Use transaction if test cases are being updated
        if (testCases) {
            const updated = await db.$transaction(async (tx) => {
                // Delete existing test cases
                await tx.testCase.deleteMany({ where: { questionId: id } });

                // Update question + create new test cases
                return tx.question.update({
                    where: { id },
                    data: {
                        ...questionFields,
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
            });

            return NextResponse.json(updated);
        }

        // Simple field update (no test case changes)
        const updated = await db.question.update({
            where: { id },
            data: questionFields,
            include: {
                testCases: {
                    orderBy: { order: "asc" },
                },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Update question error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/questions/[id]
 *
 * Delete a question and all its test cases (cascade).
 * Requires authentication.
 */
export async function DELETE(
    _request: NextRequest,
    context: RouteContext
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await context.params;

        const existing = await db.question.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json(
                { error: "Question not found" },
                { status: 404 }
            );
        }

        await db.question.delete({ where: { id } });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Delete question error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
