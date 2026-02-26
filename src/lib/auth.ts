import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * NextAuth v5 configuration for admin authentication.
 *
 * - Uses Credentials provider (email + password)
 * - Passwords verified via bcrypt
 * - JWT strategy (no database sessions)
 * - Admin id, email, and name stored in token/session
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const email = credentials.email as string;
                const password = credentials.password as string;

                const admin = await db.admin.findUnique({
                    where: { email },
                });

                if (!admin) {
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(
                    password,
                    admin.passwordHash
                );

                if (!isPasswordValid) {
                    return null;
                }

                return {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 8 * 60 * 60, // 8 hours
    },
    pages: {
        signIn: "/admin/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            // On initial sign in, persist user data into the token
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            // Expose admin id in the session object
            if (session.user) {
                session.user.id = token.id as string;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
});
