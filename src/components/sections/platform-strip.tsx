import Image from "next/image";

type Platform =
  | {
      name: string;
      kind: "image";
      logo: string;
      className: string;
    }
  | {
      name: string;
      kind: "wordmark";
      text: string;
      color: string;
      className: string;
    };

const platforms: Platform[] = [
  {
    name: "Amazon KDP",
    kind: "image",
    logo: "/platforms/amazon-kdp.webp",
    className: "size-9",
  },
  {
    name: "Apple Books",
    kind: "image",
    logo: "/platforms/apple-books.webp",
    className: "size-9",
  },
  {
    name: "Etsy",
    kind: "image",
    logo: "/platforms/etsy.webp",
    className: "h-8 w-auto",
  },
  {
    name: "Gumroad",
    kind: "image",
    logo: "/platforms/gumroad.webp",
    className: "size-9",
  },
  {
    name: "Kobo",
    kind: "wordmark",
    text: "kobo",
    color: "#BF0000",
    className: "font-sans text-[1.25rem] font-bold leading-none tracking-tight",
  },
  {
    name: "Shopify",
    kind: "image",
    logo: "/platforms/shopify.svg",
    className: "size-9",
  },
  {
    name: "Instagram",
    kind: "image",
    logo: "/platforms/instagram.webp",
    className: "size-9",
  },
  {
    name: "TikTok",
    kind: "image",
    logo: "/platforms/tiktok.webp",
    className: "size-9",
  },
  {
    name: "Facebook",
    kind: "image",
    logo: "/platforms/facebook.webp",
    className: "size-9",
  },
  {
    name: "Your own site",
    kind: "image",
    logo: "/platforms/your-site.svg",
    className: "size-9",
  },
];

export function PlatformStrip() {
  return (
    <div className="container-page relative pb-12">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        Publish and sell on
      </p>
      {/* Equal-width slots keep centre-to-centre spacing even, even when a
          wordmark sits next to a compact icon. */}
      <ul className="mx-auto mt-6 grid max-w-3xl grid-cols-5 items-center justify-items-center gap-y-5 sm:grid-cols-10 sm:gap-x-0">
        {platforms.map((platform) => (
          <li
            key={platform.name}
            className="flex h-10 w-full items-center justify-center"
          >
            {platform.kind === "wordmark" ? (
              <span
                aria-label={platform.name}
                className={platform.className}
                style={{ color: platform.color }}
              >
                {platform.text}
              </span>
            ) : (
              <Image
                src={platform.logo}
                alt={platform.name}
                width={72}
                height={36}
                className={`${platform.className} object-contain`}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
