const isPublish = process.env.NEXT_PUBLIC_BUILD_MODE === "publish";

const nextConfig = {
  output: isPublish ? "export" : undefined,
  images: {
    unoptimized: true
  },
  trailingSlash: true
};

export default nextConfig;
