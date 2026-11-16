import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogArticlePage } from "@/components/pages/blog/journal/BlogArticlePage";
import { FooterSection } from "@/components/modules/LandingFooter";
import { Header } from "@/components/modules/LandingHero";
import { fetchPublicBlog, fetchPublicBlogs } from "@/lib/public/blogs";

type Props = {
  params: Promise<{ blogid: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { blogid } = await params;
  const detail = await fetchPublicBlog(blogid).catch(() => null);
  if (!detail) return { title: "Blog | EasyLink Solar" };
  return {
    title: `${detail.post.title} | EasyLink Solar`,
    description: detail.post.excerpt,
    openGraph: {
      title: detail.post.title,
      description: detail.post.excerpt,
      images: [{ url: detail.post.heroImageSrc, alt: detail.post.heroImageAlt }],
      type: "article",
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { blogid } = await params;
  const [detail, posts] = await Promise.all([
    fetchPublicBlog(blogid).catch(() => null),
    fetchPublicBlogs().catch(() => []),
  ]);

  if (!detail) {
    notFound();
  }

  const relatedPosts = posts.filter((post) => post.id !== detail.post.id).slice(0, 3);

  return (
    <>
      <Header />
      <main>
        <BlogArticlePage post={detail.post} article={detail.article} relatedPosts={relatedPosts} />
      </main>
      <FooterSection />
    </>
  );
}
