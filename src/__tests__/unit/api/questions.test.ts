import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock dependencies ───────────────────────────────────────

vi.mock("@/lib/db", () => ({
    db: {
        question: {
            count: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        testCase: {
            deleteMany: vi.fn(),
        },
        $transaction: vi.fn(),
    },
}));

vi.mock("@/lib/auth", () => ({
    auth: vi.fn(),
}));

// ── Import after mocks ──────────────────────────────────────
import { GET as listQuestions, POST as createQuestion } from "@/app/api/questions/route";
import { GET as getQuestion, PUT as updateQuestion, DELETE as deleteQuestion } from "@/app/api/questions/[id]/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// ── Helpers ─────────────────────────────────────────────────
const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockCount = db.question.count as ReturnType<typeof vi.fn>;
const mockFindMany = db.question.findMany as ReturnType<typeof vi.fn>;
const mockFindUnique = db.question.findUnique as ReturnType<typeof vi.fn>;
const mockCreate = db.question.create as ReturnType<typeof vi.fn>;
const mockDelete = db.question.delete as ReturnType<typeof vi.fn>;
const mockTransaction = db.$transaction as ReturnType<typeof vi.fn>;

function makeGetRequest(url: string): NextRequest {
    return new NextRequest(`http://localhost:3000${url}`, { method: "GET" });
}

function makeJsonRequest(url: string, method: string, body: Record<string, unknown>): NextRequest {
    return new NextRequest(`http://localhost:3000${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

function makeContext(id: string) {
    return { params: Promise.resolve({ id }) };
}

const validQuestion = {
    title: "Two Sum",
    description: "Given an array of integers...",
    difficulty: "EASY",
    language: "C",
    boilerplateCode: "#include <stdio.h>\nint main() { return 0; }",
    testCases: [
        { input: "1 2 3", output: "3", isPublic: true, order: 0 },
        { input: "4 5 6", output: "9", isPublic: false, order: 1 },
    ],
};

const sampleDbQuestion = {
    id: "q1",
    title: "Two Sum",
    description: "Given an array of integers...",
    difficulty: "EASY",
    language: "C",
    boilerplateCode: "#include <stdio.h>\nint main() { return 0; }",
    createdById: "admin-1",
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01"),
    testCases: [
        { id: "tc1", input: "1 2 3", output: "3", isPublic: true, order: 0 },
        { id: "tc2", input: "4 5 6", output: "9", isPublic: false, order: 1 },
    ],
};

describe("Question CRUD APIs", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({
            user: { id: "admin-1", email: "admin@soliton.com", name: "Admin" },
        });
    });

    // ═══════════════════════════════════════════════════════
    // GET /api/questions (list)
    // ═══════════════════════════════════════════════════════
    describe("GET /api/questions", () => {
        it("returns 401 when not authenticated", async () => {
            mockAuth.mockResolvedValue(null);
            const res = await listQuestions(makeGetRequest("/api/questions"));
            expect(res.status).toBe(401);
        });

        it("returns paginated list of questions", async () => {
            mockCount.mockResolvedValue(25);
            mockFindMany.mockResolvedValue([
                { id: "q1", title: "Q1", difficulty: "EASY", language: "C", createdAt: new Date(), updatedAt: new Date(), _count: { testCases: 3 } },
                { id: "q2", title: "Q2", difficulty: "HARD", language: "CPP", createdAt: new Date(), updatedAt: new Date(), _count: { testCases: 5 } },
            ]);

            const res = await listQuestions(makeGetRequest("/api/questions?page=1&limit=10"));
            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.questions).toHaveLength(2);
            expect(body.pagination.total).toBe(25);
            expect(body.pagination.totalPages).toBe(3);
        });

        it("applies search filter", async () => {
            mockCount.mockResolvedValue(0);
            mockFindMany.mockResolvedValue([]);

            await listQuestions(makeGetRequest("/api/questions?search=binary"));

            expect(mockFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            expect.objectContaining({ title: expect.objectContaining({ contains: "binary" }) }),
                        ]),
                    }),
                })
            );
        });

        it("applies difficulty filter", async () => {
            mockCount.mockResolvedValue(0);
            mockFindMany.mockResolvedValue([]);

            await listQuestions(makeGetRequest("/api/questions?difficulty=HARD"));

            expect(mockFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ difficulty: "HARD" }),
                })
            );
        });

        it("applies language filter", async () => {
            mockCount.mockResolvedValue(0);
            mockFindMany.mockResolvedValue([]);

            await listQuestions(makeGetRequest("/api/questions?language=CPP"));

            expect(mockFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ language: "CPP" }),
                })
            );
        });
    });

    // ═══════════════════════════════════════════════════════
    // POST /api/questions (create)
    // ═══════════════════════════════════════════════════════
    describe("POST /api/questions", () => {
        it("returns 401 when not authenticated", async () => {
            mockAuth.mockResolvedValue(null);
            const res = await createQuestion(makeJsonRequest("/api/questions", "POST", validQuestion));
            expect(res.status).toBe(401);
        });

        it("returns 400 for missing title", async () => {
            const res = await createQuestion(
                makeJsonRequest("/api/questions", "POST", {
                    ...validQuestion,
                    title: "",
                })
            );
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.details.some((d: { field: string }) => d.field === "title")).toBe(true);
        });

        it("returns 400 for missing test cases", async () => {
            const res = await createQuestion(
                makeJsonRequest("/api/questions", "POST", {
                    ...validQuestion,
                    testCases: [],
                })
            );
            expect(res.status).toBe(400);
        });

        it("returns 400 for invalid difficulty", async () => {
            const res = await createQuestion(
                makeJsonRequest("/api/questions", "POST", {
                    ...validQuestion,
                    difficulty: "IMPOSSIBLE",
                })
            );
            expect(res.status).toBe(400);
        });

        it("creates question with test cases and returns 201", async () => {
            mockCreate.mockResolvedValue(sampleDbQuestion);

            const res = await createQuestion(makeJsonRequest("/api/questions", "POST", validQuestion));
            expect(res.status).toBe(201);

            const body = await res.json();
            expect(body.id).toBe("q1");
            expect(body.title).toBe("Two Sum");
            expect(body.testCases).toHaveLength(2);
        });

        it("sets createdById from session", async () => {
            mockCreate.mockResolvedValue(sampleDbQuestion);

            await createQuestion(makeJsonRequest("/api/questions", "POST", validQuestion));

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        createdById: "admin-1",
                    }),
                })
            );
        });
    });

    // ═══════════════════════════════════════════════════════
    // GET /api/questions/[id] (detail)
    // ═══════════════════════════════════════════════════════
    describe("GET /api/questions/[id]", () => {
        it("returns 401 when not authenticated", async () => {
            mockAuth.mockResolvedValue(null);
            const res = await getQuestion(
                makeGetRequest("/api/questions/q1"),
                makeContext("q1")
            );
            expect(res.status).toBe(401);
        });

        it("returns 404 for non-existent question", async () => {
            mockFindUnique.mockResolvedValue(null);
            const res = await getQuestion(
                makeGetRequest("/api/questions/nonexistent"),
                makeContext("nonexistent")
            );
            expect(res.status).toBe(404);
        });

        it("returns question with test cases", async () => {
            mockFindUnique.mockResolvedValue(sampleDbQuestion);
            const res = await getQuestion(
                makeGetRequest("/api/questions/q1"),
                makeContext("q1")
            );
            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.id).toBe("q1");
            expect(body.testCases).toHaveLength(2);
        });
    });

    // ═══════════════════════════════════════════════════════
    // PUT /api/questions/[id] (update)
    // ═══════════════════════════════════════════════════════
    describe("PUT /api/questions/[id]", () => {
        it("returns 401 when not authenticated", async () => {
            mockAuth.mockResolvedValue(null);
            const res = await updateQuestion(
                makeJsonRequest("/api/questions/q1", "PUT", { title: "Updated" }),
                makeContext("q1")
            );
            expect(res.status).toBe(401);
        });

        it("returns 404 for non-existent question", async () => {
            mockFindUnique.mockResolvedValue(null);
            const res = await updateQuestion(
                makeJsonRequest("/api/questions/nonexistent", "PUT", { title: "Updated" }),
                makeContext("nonexistent")
            );
            expect(res.status).toBe(404);
        });

        it("returns 400 for invalid data", async () => {
            mockFindUnique.mockResolvedValue(sampleDbQuestion);
            const res = await updateQuestion(
                makeJsonRequest("/api/questions/q1", "PUT", { difficulty: "IMPOSSIBLE" }),
                makeContext("q1")
            );
            expect(res.status).toBe(400);
        });

        it("uses transaction when test cases are provided", async () => {
            mockFindUnique.mockResolvedValue(sampleDbQuestion);
            mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
                return fn({
                    testCase: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
                    question: { update: vi.fn().mockResolvedValue(sampleDbQuestion) },
                });
            });

            const res = await updateQuestion(
                makeJsonRequest("/api/questions/q1", "PUT", {
                    title: "Updated",
                    testCases: [{ input: "new", output: "data", isPublic: true, order: 0 }],
                }),
                makeContext("q1")
            );

            expect(res.status).toBe(200);
            expect(mockTransaction).toHaveBeenCalled();
        });
    });

    // ═══════════════════════════════════════════════════════
    // DELETE /api/questions/[id]
    // ═══════════════════════════════════════════════════════
    describe("DELETE /api/questions/[id]", () => {
        it("returns 401 when not authenticated", async () => {
            mockAuth.mockResolvedValue(null);
            const res = await deleteQuestion(
                makeGetRequest("/api/questions/q1"),
                makeContext("q1")
            );
            expect(res.status).toBe(401);
        });

        it("returns 404 for non-existent question", async () => {
            mockFindUnique.mockResolvedValue(null);
            const res = await deleteQuestion(
                makeGetRequest("/api/questions/nonexistent"),
                makeContext("nonexistent")
            );
            expect(res.status).toBe(404);
        });

        it("deletes question and returns success", async () => {
            mockFindUnique.mockResolvedValue(sampleDbQuestion);
            mockDelete.mockResolvedValue(sampleDbQuestion);

            const res = await deleteQuestion(
                makeGetRequest("/api/questions/q1"),
                makeContext("q1")
            );

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(mockDelete).toHaveBeenCalledWith({ where: { id: "q1" } });
        });
    });
});
