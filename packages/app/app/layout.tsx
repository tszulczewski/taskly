import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "../components/query-provider";

export const metadata: Metadata = {
  title: "Taskly",
  description: "Plan and track home renovation work",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
