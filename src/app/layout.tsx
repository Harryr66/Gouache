import type { Metadata } from 'next';
import { Inter, Belleza, Alegreya } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { CourseProvider } from '@/providers/course-provider';
import { DiscoverSettingsProvider } from '@/providers/discover-settings-provider';
import { Toaster } from '@/components/ui/toaster';
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
    icon: '/favicon.ico?v=20241116',
    shortcut: '/favicon.ico?v=20241116',
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
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <CourseProvider>
              <DiscoverSettingsProvider>
                {children}
                <Toaster />
              </DiscoverSettingsProvider>
            </CourseProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
