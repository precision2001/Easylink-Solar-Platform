import { describe, expect, it } from "vitest";
import { productDatasheetUrl, productDocuments } from "./datasheet";

describe("product documents", () => {
  it("prefer EasyLink's stored copy over the original link", () => {
    const specs = { datasheetUrl: "https://maker.example/ds.pdf", datasheet: { url: "https://bucket.example/datasheets/x.pdf" } };
    expect(productDatasheetUrl(specs)).toBe("https://bucket.example/datasheets/x.pdf");
  });
  it("fall back to the original link, then nothing", () => {
    expect(productDatasheetUrl({ datasheetUrl: "https://maker.example/ds.pdf" })).toBe("https://maker.example/ds.pdf");
    expect(productDatasheetUrl({ datasheetUrl: "not a link" })).toBeNull();
    expect(productDatasheetUrl(null)).toBeNull();
  });
  it("list the datasheet first, then brand documents", () => {
    const docs = productDocuments({
      datasheet: { url: "https://b.example/ds.pdf" },
      documents: [{ title: "Compatible inverters", url: "https://b.example/compat.pdf" }, { title: "", url: "https://x" }],
    });
    expect(docs.map((d) => d.title)).toEqual(["Datasheet", "Compatible inverters"]);
  });
});
