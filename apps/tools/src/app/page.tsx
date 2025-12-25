import type { Metadata } from "next";
import { SITE_URL } from "@/constants/site-constants";

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
};

export default async function Home() {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-lg border p-6">
        <h3 className="text-xl font-semibold">Background Remover</h3>
        <p className="text-muted-foreground mt-2">
          Remove backgrounds from images with AI-powered precision
        </p>
      </div>
    </div>
  );
}
