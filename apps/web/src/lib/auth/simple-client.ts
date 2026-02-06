export async function registerUser(data: {
	name: string;
	email: string;
	password: string;
}) {
	const response = await fetch("/api/auth/register", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to register");
	}

	return response.json();
}

export async function loginUser(data: {
	email: string;
	password: string;
}) {
	const response = await fetch("/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to log in");
	}

	return response.json();
}

export async function getCurrentUser() {
	const response = await fetch("/api/auth/me");

	if (!response.ok) {
		return null;
	}

	return response.json();
}
