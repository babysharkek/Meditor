"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { signIn } from "@/lib/auth/client";

export function LoginForm({ next }: { next?: string }) {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const redirectTo = next && next.startsWith("/") ? next : "/projects";

	return (
		<div className="flex min-h-[calc(100svh-4.5rem)] items-center justify-center px-4 py-12">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl">Log in</CardTitle>
					<CardDescription>
						Use your email and password to continue.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						className="flex flex-col gap-4"
						onSubmit={async (e) => {
							e.preventDefault();
							setIsLoading(true);
							setError(null);
							try {
								const result = await signIn.email({
									email,
									password,
								});

								if (result?.error) {
									setError(result.error.message ?? "Failed to log in.");
									console.error("Login error:", result.error);
									return;
								}

								router.push(redirectTo);
							} catch (err) {
								console.error("Login exception:", err);
								setError(err instanceof Error ? err.message : "Failed to log in.");
							} finally {
								setIsLoading(false);
							}
						}}
					>
						<div className="flex flex-col gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								autoComplete="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>

						{error ? (
							<p className="text-sm text-red-500">{error}</p>
						) : null}

						<Button type="submit" variant="foreground" disabled={isLoading}>
							{isLoading ? "Logging in..." : "Log in"}
						</Button>

						<p className="text-muted-foreground text-sm">
							No account?{" "}
							<Link
								href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
								className="text-foreground underline"
							>
								Create one
							</Link>
						</p>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
