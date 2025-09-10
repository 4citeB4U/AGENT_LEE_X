import type {NextConfig} from 'next';

const repoName = 'AGENT_LEE_X';
const isProd = process.env.NODE_ENV === 'production';
const enableBasePath = isProd || process.env.NEXT_PUBLIC_BASE_PATH === '1';

const nextConfig: NextConfig = {
  /* config options here */
  ...(isProd ? { output: 'standalone' as const } : {}),
  ...(isProd && enableBasePath
    ? {
        basePath: `/${repoName}`,
        assetPrefix: `/${repoName}/`,
      }
    : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Transpile certain ESM packages so Turbopack/Next can bundle them for the client worker.
  // Next 15+ accepts top-level `transpilePackages` for package transpilation.
  // @ts-ignore - some typings may not reflect this option in older TS lib defs.
  // Transpile packages that ship ESM-only code (e.g. kokoro-js). This helps Turbopack
  // and Webpack include the package in the client worker bundle.
  // For local dev, you can run `npm run dev:webpack` to disable Turbopack if you hit
  // rewrite/404 issues with remote ESM imports.
  // @ts-ignore - some typings may not reflect this option in older TS lib defs.
  transpilePackages: ['kokoro-js'],
  // Server components HMR cache reduces rebuilds for data-fetching server components
  // in dev and can improve Fast Refresh times.
  // @ts-ignore
  experimental: {
    serverComponentsHmrCache: true,
    // Help reduce shipped exports for some heavy packages in dev
    optimizePackageImports: ['@xenova/transformers'],
  },

  // Add headers to enable cross-origin isolation so WASM threads and SharedArrayBuffer
  // become available in the browser (useful for high-performance WASM workloads).
  async headers() {
    // Only enable global COOP/COEP when explicitly requested via env var.
    // Set NEXT_ENABLE_COOP_COEP=1 in your environment to turn this on globally.
    if (process.env.NEXT_ENABLE_COOP_COEP === '1') {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
            { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          ],
        },
      ];
    }
    return [];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent client bundle from trying to resolve Node core modules used conditionally by some libs
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        os: false,
      };
    }
    if (isServer) {
      // Prevent server bundle from trying to include native onnxruntime-node
      config.externals = config.externals || [];
      try { config.externals.push({ 'onnxruntime-node': 'commonjs2 onnxruntime-node' }); } catch {}
    }
    return config;
  },
};

export default nextConfig;
