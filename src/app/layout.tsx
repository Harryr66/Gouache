import type { Metadata } from 'next';
import { Inter, Belleza, Alegreya } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { CourseProvider } from '@/providers/course-provider';
import { DiscoverSettingsProvider } from '@/providers/discover-settings-provider';
import { LikesProvider } from '@/providers/likes-provider';
import { VideoControlProvider } from '@/providers/video-control-provider';
import { Toaster } from '@/components/ui/toaster';
import { HueChatbot } from '@/components/hue-chatbot';
import { CloudflarePreconnect } from '@/components/cloudflare-preconnect';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import { cn } from '@/lib/utils';

const fontHeadline = Belleza({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-headline',
});

const fontBody = Alegreya({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Gouache',
  description:
    'A social marketplace for artists and art lovers to connect, discover, and trade art.',
  icons: {
    icon: '/favicon.ico?v=1',
    shortcut: '/favicon.ico?v=1',
    apple: '/favicon.ico?v=1',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
  <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <head>
        {/* Preconnect to Cloudflare CDN for faster image loading */}
        <link rel="preconnect" href="https://imagedelivery.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cloudflarestream.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://imagedelivery.net" />
        <link rel="dns-prefetch" href="https://cloudflarestream.com" />
        
        {/* Preload critical hero images for instant homepage load */}
        <link rel="preload" as="image" href="/assets/Gouache Hero Light.png" media="(prefers-color-scheme: light)" />
        <link rel="preload" as="image" href="/assets/Gouache Hero Dark.png" media="(prefers-color-scheme: dark)" />
      </head>
      <body
        className={cn(
          'min-h-screen w-full max-w-full overflow-x-hidden bg-background font-body antialiased',
          fontHeadline.variable,
          fontBody.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <LikesProvider>
              <CourseProvider>
                <DiscoverSettingsProvider>
                  <VideoControlProvider>
                    <CloudflarePreconnect />
                    <ServiceWorkerRegister />
                    {children}
                    <Toaster />
                    <HueChatbot />
                  </VideoControlProvider>
                </DiscoverSettingsProvider>
              </CourseProvider>
            </LikesProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
