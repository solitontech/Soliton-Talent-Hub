import { z } from "zod";

/**
 * Zod schema for a single test case (used inside question create/update).
 */
export const testCaseSchema = z.object({
    id: z.string().optional(), // present when editing existing test case
    input: z.string().min(0),  // can be empty string for no-input programs
    output: z.string().min(1, "Expected output is required"),
    isPublic: z.boolean().default(false),
    order: z.number().int().min(0).default(0),
});

export type TestCaseInput = z.infer<typeof testCaseSchema>;

/**
 * Schema for creating a question.
 */
export const createQuestionSchema = z.object({
    title: z
        .string()
        .min(1, "Title is required")
        .max(200, "Title must be 200 characters or less"),
    description: z
        .string()
        .min(1, "Description is required"),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    language: z.enum(["C", "CPP"]).default("C"),
    boilerplateCode: z.string().nullable().optional(),
    testCases: z
        .array(testCaseSchema)
        .min(1, "At least one test case is required"),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

/**
 * Schema for updating a question.
 * Same as create but all fields optional (partial update).
 * If testCases is provided, it replaces ALL existing test cases.
 */
export const updateQuestionSchema = z.object({
    title: z
        .string()
        .min(1, "Title is required")
        .max(200, "Title must be 200 characters or less")
        .optional(),
    description: z
        .string()
        .min(1, "Description is required")
        .optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    language: z.enum(["C", "CPP"]).optional(),
    boilerplateCode: z.string().nullable().optional(),
    testCases: z
        .array(testCaseSchema)
        .min(1, "At least one test case is required")
        .optional(),
});

export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

/**
 * Schema for query params on GET /api/questions (list).
 */
export const listQuestionsQuerySchema = z.object({
    search: z.string().optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    language: z.enum(["C", "CPP"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>;
