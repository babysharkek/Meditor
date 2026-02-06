import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";


export async function middleware(request: NextRequest) {
	const { pathname, search } = request.nextUrl;

	if (pathname.startsWith("/projects")) {
		const sessionCookie = getSessionCookie(request);
		if (!sessionCookie) {
			const next = `${pathname}${search}`;
			const url = new URL(`/login?next=${encodeURIComponent(next)}`, request.url);
			return NextResponse.redirect(url);
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico).*)",
	],
};
