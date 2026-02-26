import { DefaultSession } from "next-auth";

/**
 * Extend the default NextAuth session and JWT types
 * to include the admin `id` field.
 */
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
        } & DefaultSession["user"];
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
    }
}
