import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "釣果情報.com | 東京湾・相模湾 船釣り釣果情報",
  description:
    "東京湾・相模湾エリアの船宿釣果情報をまとめて確認。タチウオ・アジ・シーバス・サワラの最新釣果データを毎日更新。",
  openGraph: {
    title: "釣果情報.com | 東京湾・相模湾 船釣り釣果情報",
    description:
      "東京湾・相模湾エリアの船宿釣果情報をまとめて確認。タチウオ・アジ・シーバス・サワラの最新釣果データを毎日更新。",
    siteName: "釣果情報.com",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary",
    title: "釣果情報.com | 東京湾・相模湾 船釣り釣果情報",
    description:
      "東京湾・相模湾エリアの船宿釣果情報をまとめて確認。タチウオ・アジ・シーバス・サワラの最新釣果データを毎日更新。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1812773737440303"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
