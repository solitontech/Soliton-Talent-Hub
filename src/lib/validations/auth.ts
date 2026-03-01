import { z } from "zod";

/**
 * Schema for admin login form.
 */
export const loginSchema = z.object({
    email: z
        .string()
        .min(1, "Email is required")
        .email("Please enter a valid email address"),
    password: z
        .string()
        .min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema for admin registration form (used in Settings page + API).
 */
export const registerSchema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .max(100, "Name must be 100 characters or less"),
    email: z
        .string()
        .min(1, "Email is required")
        .email("Please enter a valid email address"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must be 128 characters or less"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
