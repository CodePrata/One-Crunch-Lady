const isProd = process.env.NODE_ENV === "production";

// Supabase REST/Auth calls and the realtime websocket (subscribed in
// AdminOrdersClient) both hit the project's own host, so connect-src needs
// both the https and wss origins derived from it.
let supabaseHttpOrigin = "";
let supabaseWsOrigin = "";
try {
  const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  supabaseHttpOrigin = supabaseUrl.origin;
  supabaseWsOrigin = `wss://${supabaseUrl.host}`;
} catch {
  // Missing/invalid NEXT_PUBLIC_SUPABASE_URL at build time - leave both
  // blank rather than failing the build; Supabase calls would already be
  // broken at runtime without this variable.
}

// next-cloudinary's CldUploadWidget (admin product image upload) loads its
// script and opens its picker from Cloudinary's own widget host, and
// uploads go straight to Cloudinary's API - not through our server.
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://upload-widget.cloudinary.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https://res.cloudinary.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' https://api.cloudinary.com${supabaseHttpOrigin ? ` ${supabaseHttpOrigin}` : ""}${supabaseWsOrigin ? ` ${supabaseWsOrigin}` : ""}`,
  "frame-src https://upload-widget.cloudinary.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspDirectives,
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Custom loader sends every <Image> straight to Cloudinary
    // (lib/cloudinary-loader.ts) instead of through Next's default
    // loader, which Netlify rewrites to /.netlify/images - billing
    // Netlify bandwidth/request credits to re-encode an image Cloudinary
    // already optimized. remotePatterns is kept as a guard in case a
    // future <Image> opts back into the default loader.
    loader: "custom",
    loaderFile: "./lib/cloudinary-loader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    // Narrowed from Next's 16-value default to the widths actually
    // rendered in the app (ProductCard: 343/352/395, ProductDetail:
    // 700 + 100vw on mobile, CartDrawer: 64), plus 2x-DPR headroom and
    // the project's mobile/tablet/desktop breakpoints (375/768/1280).
    // Keeps the set of possible Cloudinary transformations predictable.
    deviceSizes: [375, 750, 768, 1280, 1536],
    imageSizes: [64, 128, 343, 395, 700],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
