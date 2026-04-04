import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Orphan page — canonical location is profile tab
      // Use :locale(\\w{2}) to only match 2-letter locale codes, preventing match on "admin"
      { source: '/:locale(\\w{2})/orders', destination: '/:locale/profile?tab=orders', permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rwbmdxgcjgidalcoeppp.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
