
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export default function RootPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <section className="container flex flex-col items-center justify-center text-center py-24 md:py-32">
          <div className="w-full max-w-3xl mx-auto">
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
          <div className="mt-8 flex justify-center items-center gap-4">
            <Button asChild variant="gradient" size="lg">
              <Link href="/login?tab=signup">Create a Free Account</Link>
            </Button>
            <Button asChild variant="gradient" size="lg">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
