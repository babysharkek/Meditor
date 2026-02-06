import { SignupForm } from "./signup-form";

export default function SignupPage({
	searchParams,
}: {
	searchParams?: { next?: string };
}) {
	return <SignupForm next={searchParams?.next} />;
}
