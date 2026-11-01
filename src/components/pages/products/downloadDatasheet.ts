import type { Product } from "@/components/pages/products/types";
import { SPEC_LABEL_BY_CATEGORY, SPEC_UNIT_BY_CATEGORY } from "@/components/pages/products/productsData";

export function downloadDatasheet(product: Product) {
  // Real manufacturer datasheet when the catalogue has one; otherwise fall
  // back to the generated text summary below.
  if (product.datasheetUrl) {
    window.open(product.datasheetUrl, "_blank", "noopener,noreferrer");
    return;
  }

  const specLabel = SPEC_LABEL_BY_CATEGORY[product.categoryKey];
  const specUnit = SPEC_UNIT_BY_CATEGORY[product.categoryKey];

  const lines = [
    `${product.brand} ${product.name}`,
    `Model: ${product.model}`,
    `${specLabel}: ${product.specValue} ${specUnit}`,
    `Price: $${product.price.toLocaleString("en-AU")} AUD`,
    `Rating: ${product.rating.toFixed(1)} / 5`,
    "",
    "Key features:",
    ...product.features.map((feature) => `- ${feature}`),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${product.id}-datasheet.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
