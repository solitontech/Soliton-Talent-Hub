import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Seed script for development data.
 *
 * Creates:
 *  1. A default admin account (from env vars or defaults)
 *  2. Sample questions with test cases
 *
 * Usage:
 *   npx prisma db seed
 *   // or directly:
 *   npx tsx prisma/seed.ts
 *
 * Idempotent — uses upsert so it can be run multiple times safely.
 */

// ── Prisma client (standalone, not the app singleton) ──────────
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Seed config ────────────────────────────────────────────────
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@soliton.com";
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Admin";

async function main() {
    console.log("🌱 Seeding database...\n");

    // ── 1. Default Admin ──────────────────────────────────────────
    const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);

    const admin = await prisma.admin.upsert({
        where: { email: SEED_ADMIN_EMAIL },
        update: { name: SEED_ADMIN_NAME, passwordHash },
        create: {
            email: SEED_ADMIN_EMAIL,
            name: SEED_ADMIN_NAME,
            passwordHash,
        },
    });
    console.log(`✅ Admin: ${admin.email} (id: ${admin.id})`);

    // ── 2. Sample Questions ───────────────────────────────────────
    const q1 = await prisma.question.upsert({
        where: { id: "seed-q1-hello-world" },
        update: {},
        create: {
            id: "seed-q1-hello-world",
            title: "Hello World",
            description:
                '## Hello World\n\nWrite a C program that prints `Hello, World!` to standard output.\n\n### Example\n\n**Output:**\n```\nHello, World!\n```',
            difficulty: "EASY",
            language: "C",
            boilerplateCode: '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}',
            createdById: admin.id,
            testCases: {
                create: [
                    {
                        id: "seed-tc1-hello-public",
                        input: "",
                        output: "Hello, World!\n",
                        isPublic: true,
                        order: 1,
                    },
                    {
                        id: "seed-tc2-hello-private",
                        input: "",
                        output: "Hello, World!\n",
                        isPublic: false,
                        order: 2,
                    },
                ],
            },
        },
    });
    console.log(`✅ Question: "${q1.title}" (id: ${q1.id})`);

    const q2 = await prisma.question.upsert({
        where: { id: "seed-q2-sum-two" },
        update: {},
        create: {
            id: "seed-q2-sum-two",
            title: "Sum of Two Numbers",
            description:
                "## Sum of Two Numbers\n\nRead two integers from standard input and print their sum.\n\n### Input\nTwo space-separated integers `a` and `b` (`-10^9 ≤ a, b ≤ 10^9`).\n\n### Output\nA single integer — the sum of `a` and `b`.\n\n### Examples\n\n| Input | Output |\n|-------|--------|\n| `3 5` | `8`    |\n| `-1 1`| `0`    |",
            difficulty: "EASY",
            language: "C",
            boilerplateCode:
                '#include <stdio.h>\n\nint main() {\n    int a, b;\n    // Read input and print the sum\n    return 0;\n}',
            createdById: admin.id,
            testCases: {
                create: [
                    {
                        id: "seed-tc3-sum-pub1",
                        input: "3 5\n",
                        output: "8\n",
                        isPublic: true,
                        order: 1,
                    },
                    {
                        id: "seed-tc4-sum-pub2",
                        input: "-1 1\n",
                        output: "0\n",
                        isPublic: true,
                        order: 2,
                    },
                    {
                        id: "seed-tc5-sum-priv1",
                        input: "0 0\n",
                        output: "0\n",
                        isPublic: false,
                        order: 3,
                    },
                    {
                        id: "seed-tc6-sum-priv2",
                        input: "1000000000 1000000000\n",
                        output: "2000000000\n",
                        isPublic: false,
                        order: 4,
                    },
                ],
            },
        },
    });
    console.log(`✅ Question: "${q2.title}" (id: ${q2.id})`);

    const q3 = await prisma.question.upsert({
        where: { id: "seed-q3-reverse-array" },
        update: {},
        create: {
            id: "seed-q3-reverse-array",
            title: "Reverse an Array",
            description:
                "## Reverse an Array\n\nGiven an array of `n` integers, print them in reverse order.\n\n### Input\n- First line: integer `n` (1 ≤ n ≤ 10^5)\n- Second line: `n` space-separated integers\n\n### Output\nThe `n` integers in reverse order, space-separated.\n\n### Example\n\n**Input:**\n```\n5\n1 2 3 4 5\n```\n\n**Output:**\n```\n5 4 3 2 1\n```",
            difficulty: "MEDIUM",
            language: "C",
            boilerplateCode:
                '#include <stdio.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    int arr[n];\n    for (int i = 0; i < n; i++) {\n        scanf("%d", &arr[i]);\n    }\n    // Reverse and print the array\n    return 0;\n}',
            createdById: admin.id,
            testCases: {
                create: [
                    {
                        id: "seed-tc7-rev-pub1",
                        input: "5\n1 2 3 4 5\n",
                        output: "5 4 3 2 1\n",
                        isPublic: true,
                        order: 1,
                    },
                    {
                        id: "seed-tc8-rev-pub2",
                        input: "1\n42\n",
                        output: "42\n",
                        isPublic: true,
                        order: 2,
                    },
                    {
                        id: "seed-tc9-rev-priv1",
                        input: "3\n-1 0 1\n",
                        output: "1 0 -1\n",
                        isPublic: false,
                        order: 3,
                    },
                    {
                        id: "seed-tc10-rev-priv2",
                        input: "6\n10 20 30 40 50 60\n",
                        output: "60 50 40 30 20 10\n",
                        isPublic: false,
                        order: 4,
                    },
                ],
            },
        },
    });
    console.log(`✅ Question: "${q3.title}" (id: ${q3.id})`);

    console.log("\n🎉 Seed complete!");
    console.log(`\n📋 Summary:`);
    console.log(`   Admin login:    ${SEED_ADMIN_EMAIL} / ${SEED_ADMIN_PASSWORD}`);
    console.log(`   Questions:      3 (with test cases)`);
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
