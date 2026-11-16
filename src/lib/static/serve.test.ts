import { describe, expect, it } from "vitest";
import { serveStatic, type StaticFile } from "./serve";

const css = "body{background:#f3efe6}";

const files: Record<string, StaticFile> = {
  "/_next/static/css/app.css": {
    contentType: "text/css; charset=utf-8",
    encoding: "utf8",
    body: css,
    etag: '"css-etag"',
    bytes: new TextEncoder().encode(css).length,
    cacheControl: "public, max-age=31536000, immutable",
  },
};

describe("embedded static files", () => {
  it("serves a static CSS path with the stylesheet content type", async () => {
    const response = serveStatic(new Request("https://fairturn.example/_next/static/css/app.css"), files);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toBe("text/css; charset=utf-8");
    expect(response?.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(await response?.text()).toBe(css);
  });

  it("answers a matching ETag with 304", () => {
    const response = serveStatic(
      new Request("https://fairturn.example/_next/static/css/app.css", {
        headers: { "if-none-match": '"css-etag"' },
      }),
      files,
    );
    expect(response?.status).toBe(304);
    expect(response?.headers.get("etag")).toBe('"css-etag"');
  });
});
