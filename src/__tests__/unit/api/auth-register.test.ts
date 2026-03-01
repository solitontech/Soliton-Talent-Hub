import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock dependencies ───────────────────────────────────────
// Must be declared before importing the route handler

vi.mock("@/lib/db", () => ({
    db: {
        admin: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
    },
}));

vi.mock("@/lib/auth", () => ({
    auth: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
    default: {
        hash: vi.fn().mockResolvedValue("hashed-password"),
    },
}));

// ── Import after mocks ──────────────────────────────────────
import { POST } from "@/app/api/auth/register/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// ── Helpers ─────────────────────────────────────────────────
function makeRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockFindUnique = db.admin.findUnique as ReturnType<typeof vi.fn>;
const mockCreate = db.admin.create as ReturnType<typeof vi.fn>;

describe("POST /api/auth/register", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: authenticated admin
        mockAuth.mockResolvedValue({
            user: { id: "admin-1", email: "admin@soliton.com", name: "Admin" },
        });
    });

    // ── Auth ─────────────────────────────────────────────
    it("returns 401 when not authenticated", async () => {
        mockAuth.mockResolvedValue(null);

        const res = await POST(makeRequest({
            name: "New Admin",
            email: "new@soliton.com",
            password: "password123",
        }));

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toMatch(/unauthorized/i);
    });

    // ── Validation ───────────────────────────────────────
    it("returns 400 for empty body", async () => {
        const res = await POST(makeRequest({}));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe("Validation failed");
        expect(body.details).toBeDefined();
        expect(body.details.length).toBeGreaterThan(0);
    });

    it("returns 400 for invalid email", async () => {
        const res = await POST(makeRequest({
            name: "Test",
            email: "not-an-email",
            password: "password123",
        }));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.details.some((d: { field: string }) => d.field === "email")).toBe(true);
    });

    it("returns 400 for short password", async () => {
        const res = await POST(makeRequest({
            name: "Test",
            email: "test@soliton.com",
            password: "short",
        }));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.details.some((d: { field: string }) => d.field === "password")).toBe(true);
    });

    it("returns 400 for missing name", async () => {
        const res = await POST(makeRequest({
            email: "test@soliton.com",
            password: "password123",
        }));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.details.some((d: { field: string }) => d.field === "name")).toBe(true);
    });

    // ── Duplicate check ──────────────────────────────────
    it("returns 409 for duplicate email", async () => {
        mockFindUnique.mockResolvedValue({
            id: "existing-admin",
            email: "existing@soliton.com",
        });

        const res = await POST(makeRequest({
            name: "Duplicate",
            email: "existing@soliton.com",
            password: "password123",
        }));

        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body.error).toMatch(/already exists/i);
    });

    // ── Success ──────────────────────────────────────────
    it("creates admin and returns 201 on success", async () => {
        mockFindUnique.mockResolvedValue(null);
        mockCreate.mockResolvedValue({
            id: "new-admin-1",
            name: "New Admin",
            email: "new@soliton.com",
            createdAt: new Date("2026-03-01"),
        });

        const res = await POST(makeRequest({
            name: "New Admin",
            email: "new@soliton.com",
            password: "password123",
        }));

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.id).toBe("new-admin-1");
        expect(body.name).toBe("New Admin");
        expect(body.email).toBe("new@soliton.com");
        expect(body.createdAt).toBeDefined();
    });

    it("passes hashed password to db.admin.create", async () => {
        mockFindUnique.mockResolvedValue(null);
        mockCreate.mockResolvedValue({
            id: "new-admin-1",
            name: "Admin",
            email: "a@soliton.com",
            createdAt: new Date(),
        });

        await POST(makeRequest({
            name: "Admin",
            email: "a@soliton.com",
            password: "password123",
        }));

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    passwordHash: "hashed-password",
                    createdBy: "admin-1",
                }),
            })
        );
    });

    it("does NOT return passwordHash in response", async () => {
        mockFindUnique.mockResolvedValue(null);
        mockCreate.mockResolvedValue({
            id: "new-admin-1",
            name: "Admin",
            email: "a@soliton.com",
            createdAt: new Date(),
        });

        const res = await POST(makeRequest({
            name: "Admin",
            email: "a@soliton.com",
            password: "password123",
        }));

        const body = await res.json();
        expect(body.passwordHash).toBeUndefined();
        expect(body.password).toBeUndefined();
    });
});
