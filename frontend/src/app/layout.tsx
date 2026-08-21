import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentLens | Talent Atlas",
  description: "An editorial workspace for discovering the strongest evidence in your resume index.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        {children}
      </body>
    </html>
  );
}
