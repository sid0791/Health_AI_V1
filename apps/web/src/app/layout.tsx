import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthCoach AI - Your Personal Health & Nutrition Assistant",
  description: "AI-powered health coaching platform with personalized nutrition, fitness planning, and health report analysis. India-first with global scalability.",
  keywords: ["health", "nutrition", "AI", "fitness", "meal planning", "health reports"],
  authors: [{ name: "HealthCoach AI Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-gray-50 min-h-screen">
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  );
}
