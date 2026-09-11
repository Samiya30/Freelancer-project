import type { Metadata } from "next";
import "./globals.css";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { FreelanceStoreProvider } from "@/lib/store/FreelanceStore";

export const metadata: Metadata = {
  title: "FreelanceOS",
  description: "All-in-one workspace for freelancers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <FreelanceStoreProvider>
          <ToastProvider>{children}</ToastProvider>
        </FreelanceStoreProvider>
      </body>
    </html>
  );
}