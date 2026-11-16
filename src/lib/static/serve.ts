export type StaticFile = {
  contentType: string;
  /** File bytes as UTF-8 text, or standard base64 for binary files. */
  body: string;
  encoding: "utf8" | "base64";
  etag: string;
  bytes: number;
  cacheControl?: string;
};

export type StaticFiles = Record<string, StaticFile>;

function requestPath(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }
  if (pathname.includes("%")) {
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      return null;
    }
  }
  if (pathname.includes("..") || pathname.includes("\0")) return null;
  return pathname;
}

function etagMatches(header: string | null, etag: string): boolean {
  if (!header) return false;
  const bare = etag.replace(/^W\//i, "").replaceAll('"', "");
  return header.split(",").some((part) => {
    const token = part.trim();
    if (token === "*") return true;
    return token.replace(/^W\//i, "").replaceAll('"', "") === bare;
  });
}

function bodyBytes(file: StaticFile): Uint8Array {
  if (file.encoding === "utf8") return new TextEncoder().encode(file.body);
  const binary = atob(file.body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** Serve one embedded build file, or return null so the app can handle the request. */
export function serveStatic(request: Request, files: StaticFiles): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const pathname = requestPath(request.url);
  if (!pathname) return null;
  const file = files[pathname];
  if (!file) return null;

  const headers = new Headers();
  headers.set("content-type", file.contentType);
  headers.set("etag", file.etag);
  if (file.cacheControl) headers.set("cache-control", file.cacheControl);

  if (etagMatches(request.headers.get("if-none-match"), file.etag)) {
    return new Response(null, { status: 304, headers });
  }

  headers.set("content-length", String(file.bytes));
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  const body = file.encoding === "utf8" ? file.body : bodyBytes(file);
  return new Response(body, { status: 200, headers });
}
