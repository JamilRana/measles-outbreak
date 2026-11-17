import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { nikosh } from "./font"; // Match the filename!

import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import AuthProvider from "@/components/AuthProvider";
import I18nProvider from "@/components/I18nProvider";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "হাম প্রাদুর্ভাব পর্যবেক্ষণ প্ল্যাটফর্ম | Measles Outbreak Monitoring",
  description: "বাংলাদেশের সকল জেলায় হামের প্রাদুর্ভাব পর্যবেক্ষণ ও রিপোর্টিং প্ল্যাটফর্ম।",
  icons: {
    icon: "/dghs_logo.svg",
    shortcut: "/dghs_logo.svg",
    apple: "/dghs_logo.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);

  return (
    <html
      lang="bn"
      className={cn(inter.variable, nikosh.variable)}
    >
      <body className={cn(
        "bg-slate-50 text-slate-900 antialiased",
        inter.className,  // Latin text uses Inter
        "font-nikosh"     // Bengali text uses Nikosh (see globals.css)
      )}>
        <AuthProvider session={session}>
          <I18nProvider>
            {children}
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}