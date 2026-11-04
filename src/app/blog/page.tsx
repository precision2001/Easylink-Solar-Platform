import type { Metadata } from "next";
import { BlogPageSection } from "@/components/pages/blog/BlogPageSection";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";

export const metadata: Metadata = {
  title: "Blog | EasyLink Solar",
  description:
    "News and updates from the renewable energy sector, from EasyLink Solar.",
};

export default function BlogPage() {
  return (
    <>
      <Header />
      <main>
        <BlogPageSection />
      </main>
      <FooterSection />
    </>
  );
}
