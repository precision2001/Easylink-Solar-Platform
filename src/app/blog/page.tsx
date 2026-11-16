import type { Metadata } from "next";
import { BlogJournalPage } from "@/components/pages/blog/journal/BlogJournalPage";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";

export const metadata: Metadata = {
  title: "Blog | EasyLink Solar",
  description:
    "Rebate changes, power prices and plain-English solar and battery buying guides for Australian homes, from EasyLink Solar.",
};

export default function BlogPage() {
  return (
    <>
      <Header />
      <main>
        <BlogJournalPage />
      </main>
      <FooterSection />
    </>
  );
}
