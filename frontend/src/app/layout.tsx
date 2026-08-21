import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentLens | Candidate Search",
  description: "Search and compare the strongest candidates in your resume database.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased overflow-hidden flex flex-col">
        {children}
      </body>
    </html>
  );
}
