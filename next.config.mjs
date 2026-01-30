import { siteConfig } from "./site.config.ts";

const isPublish = process.env.NEXT_PUBLIC_BUILD_MODE === "publish";

const nextConfig = {
  output: isPublish ? "export" : undefined,
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  distDir: siteConfig.outputDir
};

export default nextConfig;
