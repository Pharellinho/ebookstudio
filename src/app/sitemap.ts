import type { MetadataRoute } from "next";
import { formats } from "@/lib/content";
import { posts } from "@/lib/posts";
import { site } from "@/lib/site";

const routes: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/ebook-types", priority: 0.8, changeFrequency: "monthly" },
  { path: "/for-authors", priority: 0.8, changeFrequency: "monthly" },
  { path: "/for-course-creators", priority: 0.8, changeFrequency: "monthly" },
  { path: "/tools", priority: 0.7, changeFrequency: "monthly" },
  {
    path: "/tools/kdp-royalty-calculator",
    priority: 0.7,
    changeFrequency: "monthly",
  },
  {
    path: "/tools/word-count-to-pages",
    priority: 0.7,
    changeFrequency: "monthly",
  },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    ...routes.map((route) => ({
      url: `${site.url}${route.path}`,
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...formats.map((format) => ({
      url: `${site.url}/ebook-types/${format.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...posts.map((post) => ({
      url: `${site.url}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
