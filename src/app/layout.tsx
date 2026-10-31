import type { Metadata } from "next";
import localFont from "next/font/local";
import { EasylinkAiChatbot } from "@/components/ai-chat/EasylinkAiChatbot";
import { AiEventCapture } from "@/components/ai/AiEventCapture";
import { ClarityAnalytics } from "@/components/analytics/ClarityAnalytics";
import { ReduxProvider } from "@/components/providers/ReduxProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { TopProgressBar } from "@/components/providers/TopProgressBar";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

// Geist / Geist Mono used to load here too, preloaded on every page via
// next/font, but nothing in the app actually set its font-family to them
// (`--font-sans`/`--font-mono` in globals.css now resolve to Source Sans and
// the system mono stack) — two webfont families nobody was rendering with.
// Fonts ship with the site (latin, variable weight; SIL Open Font License)
// instead of next/font/google, which downloads them from Google at build
// time. Those downloads failed now and then on the build servers, and a
// failed download failed the whole deploy.
const sourceSans = localFont({
  src: "./fonts/source-sans-3-latin-wght-normal.woff2",
  variable: "--font-source-sans",
  weight: "200 900",
  display: "swap",
});

const outfit = localFont({
  src: "./fonts/outfit-latin-wght-normal.woff2",
  variable: "--font-outfit",
  weight: "100 900",
  display: "swap",
});

const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const dmSans = localFont({
  src: "./fonts/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EasyLink Solar",
  description: "Australia's trusted solar energy platform – EasyLink Solar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sourceSans.variable} ${outfit.variable} ${inter.variable} ${dmSans.variable} antialiased`}
        suppressHydrationWarning
      >
        <ReduxProvider>
          <TopProgressBar />
          {children}
          <EasylinkAiChatbot />
          <AiEventCapture />
          <ToastProvider />
        </ReduxProvider>
        <ClarityAnalytics />
      </body>
    </html>
  );
}
