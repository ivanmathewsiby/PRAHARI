import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "../context/LanguageContext";
import { ThemeProvider } from "../context/ThemeContext";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "PRAHARI | Digital Public Safety Intelligence",
  description: "AI-powered public safety tool to detect and mitigate digital arrest scams, coercion, and authority impersonation.",
  keywords: ["digital arrest", "cybercrime", "public safety", "prahari", "scam detection", "security"],
  authors: [{ name: "AI Digital Public Safety Challenge Team" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased transition-colors duration-200"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-white text-gray-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans selection:bg-indigo-500/25 selection:text-indigo-900 dark:selection:text-indigo-200">
        <LanguageProvider>
          <ThemeProvider>
            <Navbar />
            <main className="flex-grow flex flex-col">
              {children}
            </main>
            <Footer />
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
