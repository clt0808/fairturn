declare module "cloudflare:workers" {
  export const env: {
    DB?: import("@/lib/db/types").AppDatabase;
    SEED_DEMO?: string;
    ADMIN_PASSWORD?: string;
    AUTH_SECRET?: string;
    IP_HASH_SALT?: string;
  };
}
