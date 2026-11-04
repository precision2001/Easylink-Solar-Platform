"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const categories = [
  "Portable Power Station",
  "Home Battery Backup",
  "Alternator Charger",
  "Solar Generators",
];

const products = [
  {
    name: "Elite 300 New",
    subtitle: "Your Essential Home Backup",
    specs: "2,400W | 3,014Wh | LiFePO4",
    price: "A$2,799",
    image: "/images/home/bluetti-elite300.png",
  },
  {
    name: "Elite 100 V2",
    subtitle: "Camp Light. Backup Light",
    specs: "1,800W | 1,024Wh | LiFePO4",
    price: "A$999",
    image: "/images/home/bluetti-elite100.png",
  },
  {
    name: "Elite 200 V2",
    subtitle: "Top Efficiency, Minimal Waste",
    specs: "2,600W | 2,073.6Wh | LiFePO4",
    price: "A$1,999",
    image: "/images/home/bluetti-elite200.png",
  },
];

export function BluettiProductsSection() {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <section className="bg-linear-to-r from-yellow-lemon to-orange-amber px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-[1280px]">
        {/* Header */}
        <div className="text-center">
          <h2 className="font-source-sans text-3xl font-bold tracking-[-0.9px] text-ink sm:text-4xl">
            BLUETTI Products
          </h2>
          <p className="mt-4 font-source-sans text-base text-ink">
            Premium portable power solutions for every need
          </p>
        </div>

        {/* Category tabs */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {categories.map((cat, i) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(i)}
              className={`rounded-full px-4 py-2 font-source-sans text-sm font-medium transition ${
                i === activeCategory ? "text-white" : "bg-white text-primary"
              }`}
              style={
                i === activeCategory
                  ? {
                      backgroundImage:
                        "linear-gradient(145deg, #2094f3 0%, #17cfcf 100%)",
                    }
                  : undefined
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product cards */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.name}
              className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_-8px_rgba(17,28,39,0.12)]"
            >
              {/* Image area */}
              <div className="relative flex aspect-square items-center justify-center bg-linear-to-br from-cream-200 to-cream-400">
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  className="object-contain"
                  sizes="100%"
                />
              </div>
              {/* Info */}
              <div className="p-6">
                <h3 className="font-source-sans text-lg font-bold tracking-[-0.45px] text-ink">
                  {p.name}
                </h3>
                <p className="mt-1 font-source-sans text-sm text-muted">
                  {p.subtitle}
                </p>
                <p className="mt-1 font-source-sans text-xs font-medium text-primary">
                  {p.specs}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-source-sans text-xl font-bold text-ink">
                    {p.price}
                  </span>
                  <Link
                    href="/bluetti"
                    className="rounded-[10px] px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
                    style={{
                      backgroundImage:
                        "linear-gradient(120deg, #2094f3 0%, #17cfcf 100%)",
                    }}
                  >
                    Buy Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
