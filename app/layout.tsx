import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "PostDraft - AI Tweet Generation",
  description: "Automatically generate X (Twitter) posts from email newsletters",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={dmSans.className}>
        <Sidebar />
        <main className="ml-16 min-h-screen bg-background">
          {children}
        </main>
      </body>
    </html>
  );
}
