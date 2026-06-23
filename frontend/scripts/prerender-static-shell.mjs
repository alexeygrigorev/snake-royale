import fs from "node:fs";
import path from "node:path";

const server = (await import("../dist/server/server.js")).default;
const response = await server.fetch(new Request("http://localhost/"), {}, {});

if (!response.ok) {
  throw new Error(`Frontend prerender failed with status ${response.status}`);
}

const html = await response.text();

if (!html.includes("$_TSR")) {
  throw new Error("Frontend prerender did not include TanStack hydration data");
}

fs.writeFileSync(path.join(process.cwd(), "dist", "client", "index.html"), html);
