import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kelas 3D · Bengkel Koding",
  description: "Kelas virtual 3D Bengkel Koding",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
