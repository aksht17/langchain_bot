import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Antigravity | Agentic Resume RAG Copilot",
  description: "Autonomous Candidate Discovery & Comparative Evaluation Engine over 2,000+ Profiles using LangGraph and Pinecone Serverless.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-[#090d16] text-gray-100 antialiased overflow-hidden flex flex-col">
        {children}
      </body>
    </html>
  );
}
