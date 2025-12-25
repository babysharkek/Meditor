import { ThemeProvider } from "next-themes";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { baseMetaData } from "./metadata";
import { BotIdClient } from "botid/client";
import { toolsEnv } from "@opencut/env/tools";
import { Inter } from "next/font/google";

const siteFont = Inter({ subsets: ["latin"] });

export const metadata = baseMetaData;

const protectedRoutes = [
  {
    path: "/none",
    method: "GET",
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <BotIdClient protect={protectedRoutes} />
      </head>
      <body className={`${siteFont.className} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <TooltipProvider>
            {children}
            <Toaster />
            <Script
              src="https://cdn.databuddy.cc/databuddy.js"
              strategy="afterInteractive"
              async
              data-client-id="Apo7VtbtH8QvYfCn-NLXX"
              data-disabled={toolsEnv.NODE_ENV === "development"}
              data-track-attributes={false}
              data-track-errors={true}
              data-track-outgoing-links={false}
              data-track-web-vitals={false}
              data-track-sessions={false}
            />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
