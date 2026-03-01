import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/admin/list
 *
 * Returns all admin users (id, name, email, createdAt).
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

        const admins = await db.admin.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                createdBy: true,
            },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json({ admins });
    } catch (error) {
        console.error("List admins error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
