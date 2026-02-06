import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

// Simple password verification using crypto (for demo purposes)
function verifyPassword(password: string, hashedPassword: string): boolean {
	const [salt, hash] = hashedPassword.split(":");
	const computedHash = createHash("sha256")
		.update(password + salt)
		.digest("hex");
	return hash === computedHash;
}

export async function POST(req: NextRequest) {
	try {
		const { email, password } = await req.json();

		if (!email || !password) {
			return NextResponse.json(
				{ error: "Email and password are required" },
				{ status: 400 },
			);
		}

		// Find user
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (!user) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 },
			);
		}

		// Check password (assuming password is stored in users table)
		if (!user.password) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 },
			);
		}

		const isValid = verifyPassword(password, user.password);
		if (!isValid) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 },
			);
		}

		// Create simple session token (you may want to use JWT in production)
		const sessionToken = randomBytes(32).toString("hex");

		// Set session cookie
		const response = NextResponse.json({
			user: { id: user.id, name: user.name, email: user.email },
		});

		response.cookies.set("session", sessionToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 60 * 60 * 24 * 7, // 7 days
			path: "/",
		});

		return response;
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
