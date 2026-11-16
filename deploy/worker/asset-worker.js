import app from "./index.js";
import { files } from "./static-registry.js";
import { serveStatic } from "./serve-static.js";

export default {
  async fetch(request, env, ctx) {
    const embedded = serveStatic(request, files);
    if (embedded) return embedded;
    return app.fetch(request, env, ctx);
  },
};
