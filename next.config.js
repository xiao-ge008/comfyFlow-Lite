/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: {
  //   appDir: false, // 使用 pages 目录 - 这个选项在最新版本中已经移除
  // },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // 国际化配置
  i18n: {
    locales: ['zh', 'en', 'ja'],
    defaultLocale: 'en',
    localeDetection: false, // 我们使用客户端检测
  },
  // 静态文件服务
  async rewrites() {
    return [
      {
        source: '/output/:path*',
        destination: '/api/output/:path*',
      },
    ];
  },
};

module.exports = nextConfig;