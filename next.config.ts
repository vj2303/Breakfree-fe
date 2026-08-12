import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // An orphaned, empty package-lock.json sits in the parent directory, so Turbopack's workspace
  // detection chose that directory as the root and then could not resolve `next` from it
  // ("Next.js package not found" — a FATAL panic on every dev request). node_modules lives in
  // this directory, so pin the root here.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
