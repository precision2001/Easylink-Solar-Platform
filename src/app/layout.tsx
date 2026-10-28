import type { Metadata } from "next";
import { DM_Sans, Inter, Outfit, Source_Sans_3 } from "next/font/google";
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
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
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
