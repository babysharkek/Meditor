import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

// Simple password hashing using crypto (for demo purposes)
function hashPassword(password: string): string {
	const salt = randomBytes(16).toString("hex");
	const hash = createHash("sha256")
		.update(password + salt)
		.digest("hex");
	return `${salt}:${hash}`;
}

// Generate a simple unique ID
function generateId(): string {
	return randomBytes(16).toString("hex");
}

export async function POST(req: NextRequest) {
	try {
		const { name, email, password } = await req.json();

		if (!name || !email || !password) {
			return NextResponse.json(
				{ error: "Name, email, and password are required" },
				{ status: 400 },
			);
		}

		// Check if user already exists
		const existing = await db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (existing.length > 0) {
			return NextResponse.json(
				{ error: "User with this email already exists" },
				{ status: 409 },
			);
		}

		// Hash password
		const hashedPassword = hashPassword(password);

		// Create user
		const [newUser] = await db
			.insert(users)
			.values({
				id: generateId(),
				name,
				email,
				emailVerified: true,
				image: null,
				password: hashedPassword,
			})
			.returning();

		return NextResponse.json(
			{ user: { id: newUser.id, name: newUser.name, email: newUser.email } },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Register error:", error);
		console.error("Error details:", {
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			databaseUrl: process.env.DATABASE_URL ? "Set" : "Not set",
		});
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
