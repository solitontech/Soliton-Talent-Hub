import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";
import { auth } from "@/lib/auth";

/**
 * POST /api/auth/register
 *
 * Creates a new admin user. Only callable by an authenticated admin.
 *
 * Body: { name: string, email: string, password: string }
 * Returns: { id, name, email, createdAt }
 */
export async function POST(request: NextRequest) {
    try {
        // ── Auth check ──────────────────────────────────────
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized — you must be signed in as an admin" },
                { status: 401 }
            );
        }

        // ── Parse & validate body ───────────────────────────
        const body = await request.json();
        const result = registerSchema.safeParse(body);

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

        const { name, email, password } = result.data;

        // ── Check for duplicate email ───────────────────────
        const existingAdmin = await db.admin.findUnique({
            where: { email },
        });

        if (existingAdmin) {
            return NextResponse.json(
                { error: "An admin with this email already exists" },
                { status: 409 }
            );
        }

        // ── Hash password & create admin ────────────────────
        const passwordHash = await bcrypt.hash(password, 12);

        const admin = await db.admin.create({
            data: {
                name,
                email,
                passwordHash,
                createdBy: session.user.id,
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });

        return NextResponse.json(admin, { status: 201 });
    } catch (error) {
        console.error("Admin registration error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
