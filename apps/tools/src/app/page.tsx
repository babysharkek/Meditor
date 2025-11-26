import type { Metadata } from "next";
import { SITE_URL } from "@/constants/site-constants";

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
};

export default async function Home() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
}
