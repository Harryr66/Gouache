
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export default function RootPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <section className="container flex flex-col items-center text-center gap-6 pt-10 md:pt-14 pb-6 md:pb-20 px-6">
          <div className="w-full max-w-xl md:max-w-3xl mx-auto">
            <img
              src="/assets/welcome-hero-light-20241111.png"
              alt="Welcome to Gouache"
              className="block w-full h-auto dark:hidden"
            />
            <img
              src="/assets/welcome-hero-dark-20241111.png"
              alt="Welcome to Gouache"
              className="hidden w-full h-auto dark:block"
            />
            <span className="sr-only">
              Welcome to Gouache. Connect with emerging artists worldwide on Gouache, discover unique artworks, and be part of the creative journey from studio to
              collection.
            </span>
          </div>
          <div className="flex justify-center items-center gap-4">
            <Button variant="gradient" size="lg">
              <Link
                href="/login?tab=signup"
                className="relative z-[2] block rounded-[10px] px-8 py-3 text-foreground font-semibold"
              >
                Create a Free Account
              </Link>
            </Button>
            <Button variant="gradient" size="lg">
              <Link
                href="/login"
                className="relative z-[2] block rounded-[10px] px-8 py-3 text-foreground font-semibold"
              >
                Login
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
