import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
	try {
		const sessionToken = req.cookies.get("session")?.value;

		if (!sessionToken) {
			return NextResponse.json(
				{ error: "No session found" },
				{ status: 401 },
			);
		}

		// For now, we'll use a simple approach
		// In production, you'd store session tokens in a separate table
		// For demo purposes, we'll return a mock user if session exists
		// TODO: Implement proper session validation with database

		return NextResponse.json({
			user: {
				id: "demo-user",
				name: "Demo User",
				email: "demo@example.com",
			},
		});
	} catch (error) {
		console.error("Me endpoint error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
