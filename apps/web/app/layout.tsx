import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "@/lib/auth/AuthContext";
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
        <AuthProvider>
          <FreelanceStoreProvider>
            <ToastProvider>{children}</ToastProvider>
          </FreelanceStoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}