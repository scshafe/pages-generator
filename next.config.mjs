const isPublish = process.env.NEXT_PUBLIC_BUILD_MODE === "publish";
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const normalizedBasePath = rawBasePath
  ? `/${rawBasePath}`.replace(/\/+/g, "/").replace(/\/$/, "")
  : "";

const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? normalizedBasePath;

const nextConfig = {
  output: isPublish ? "export" : undefined,
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  basePath: isPublish && normalizedBasePath ? normalizedBasePath : undefined,
  assetPrefix: isPublish && assetPrefix ? assetPrefix : undefined
};

export default nextConfig;
