import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "../components/query-provider";
import { ThemeScript } from "../components/shell/theme-script";

export const metadata: Metadata = {
  title: { default: "Taskly", template: "%s · Taskly" },
  description: "Plan and track home renovation work",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // ThemeScript sets data-theme before React hydrates; without this, React flags it as a mismatch.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
