import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Dancing_Script, Great_Vibes, Sacramento, Satisfy } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dancingScript = Dancing_Script({
  variable: "--font-signature",
  subsets: ["latin"],
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  weight: "400",
  subsets: ["latin"],
});

const sacramento = Sacramento({
  variable: "--font-sacramento",
  weight: "400",
  subsets: ["latin"],
});

const satisfy = Satisfy({
  variable: "--font-satisfy",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Armor Health — Franklin County Background Screening Portal",
  description: "Franklin County background screening portal for Armor Health of Ohio",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? "";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dancingScript.variable} ${greatVibes.variable} ${sacramento.variable} ${satisfy.variable} antialiased bg-gray-50`}
        nonce={nonce}
      >
        {children}
      </body>
    </html>
  );
}
