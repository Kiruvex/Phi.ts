import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // 允许从内网 IP / 域名访问开发服务器（HMR 热更新跨域放行）
  // 否则用 127.0.0.1 以外的地址访问时 _next/webpack-hmr 会被阻止
  allowedDevOrigins: ["*"],
};

export default nextConfig;
