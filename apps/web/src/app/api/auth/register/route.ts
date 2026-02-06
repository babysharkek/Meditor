import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user
		const [newUser] = await db
			.insert(users)
			.values({
				name,
				email,
				emailVerified: new Date(),
				image: null,
			})
			.returning();

		// Store password in a simple way (you may want a separate passwords table)
		await db
			.update(users)
			.set({ password: hashedPassword })
			.where(eq(users.id, newUser.id));

		return NextResponse.json(
			{ user: { id: newUser.id, name: newUser.name, email: newUser.email } },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Register error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
