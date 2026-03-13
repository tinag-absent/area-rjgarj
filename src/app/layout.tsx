import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "海蝕機関",
  description: "機関員専用アクセスポータル",
  robots: "noindex, nofollow",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "海蝕機関",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};


// --- Eruda デバッグコンソール（ERUDA_ENABLED=True 時のみ有効）---
function ErudaLoader() {
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_ERUDA) {
    return null;
  }
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/eruda';
            s.onload = function() { eruda.init(); };
            document.head.appendChild(s);
          })();
        `,
      }}
    />
  );
}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="dark">
      <body className="scanline">
        <ErudaLoader />
        {children}
        <SpeedInsights />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
