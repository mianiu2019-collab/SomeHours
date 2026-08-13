import type { Metadata, Viewport } from "next";
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
  title: "Some Hours",
  applicationName: "Some Hours",
  description: "记录今天真正专注的时间。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Some Hours",
  },
  openGraph: {
    title: "Some Hours",
    description: "记录今天真正专注的时间。",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Some Hours",
    description: "记录今天真正专注的时间。",
  },
  icons: {
    icon: [
      { url: "/some-hours-icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/some-hours-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/some-hours-icon-48.png", sizes: "48x48", type: "image/png" },
    ],
    shortcut: "/some-hours-favicon.ico",
    apple: [{ url: "/some-hours-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#f3f0e8" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('minimal-focus-timer:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
