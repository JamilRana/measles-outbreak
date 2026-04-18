import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import AuthProvider from "@/components/AuthProvider";
import I18nProvider from "@/components/I18nProvider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "হাম প্রাদুর্ভাব পর্যবেক্ষণ প্ল্যাটফর্ম | Measles Outbreak Monitoring",
  description: "বাংলাদেশের সকল জেলায় হামের প্রাদুর্ভাব পর্যবেক্ষণ ও রিপোর্টিং প্ল্যাটফর্ম। Monitor and report districtwise measles outbreaks efficiently.",
  icons: {
    icon: "/dghs_logo.svg",
    shortcut: "/dghs_logo.svg",
    apple: "/dghs_logo.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="bn" className={cn("font-sans", geist.variable)}>
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        <AuthProvider session={session}>
          <I18nProvider>
            {children}
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
