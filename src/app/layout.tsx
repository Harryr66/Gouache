import type { Metadata } from 'next';
import { Inter, Belleza, Alegreya } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { CourseProvider } from '@/providers/course-provider';
import { DiscoverSettingsProvider } from '@/providers/discover-settings-provider';
import { LikesProvider } from '@/providers/likes-provider';
import { Toaster } from '@/components/ui/toaster';
import { HueChatbot } from '@/components/hue-chatbot';
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
  <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
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
                  {children}
                  <Toaster />
                  <HueChatbot />
                </DiscoverSettingsProvider>
              </CourseProvider>
            </LikesProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
