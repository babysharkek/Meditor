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
import { signUp } from "@/lib/auth/client";

export default function SignupPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	return (
		<div className="flex min-h-[calc(100svh-4.5rem)] items-center justify-center px-4 py-12">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl">Create account</CardTitle>
					<CardDescription>
						Sign up with email and password.
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
								const result = await signUp.email({
									email,
									password,
									name,
								});

								if (result?.error) {
									setError(result.error.message ?? "Failed to sign up.");
									return;
								}

								router.push("/projects");
							} catch {
								setError("Failed to sign up.");
							} finally {
								setIsLoading(false);
							}
						}}
					>
						<div className="flex flex-col gap-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								autoComplete="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>

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
								autoComplete="new-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>

						{error ? (
							<p className="text-sm text-red-500">{error}</p>
						) : null}

						<Button type="submit" variant="foreground" disabled={isLoading}>
							{isLoading ? "Creating..." : "Create account"}
						</Button>

						<p className="text-muted-foreground text-sm">
							Already have an account?{" "}
							<Link href="/login" className="text-foreground underline">
								Log in
							</Link>
						</p>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
