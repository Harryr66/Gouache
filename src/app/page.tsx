'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { Loader2, LogIn, UserPlus, User } from 'lucide-react';
import Link from 'next/link';
import { LoadingTransition } from '@/components/loading-transition';

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  // Redirect logged-in users to news page
  useEffect(() => {
    if (!loading && user) {
      router.replace('/news');
    }
  }, [user, loading, router]);

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    try {
      await signInAnonymously(auth);
      toast({
        title: "Welcome!",
        description: "You're now browsing as a guest. You can explore the platform, but some features require an account.",
      });
      router.push('/news');
    } catch (error: any) {
      console.error('Guest login error:', error);
      toast({
        title: "Guest login failed",
        description: error.message || "Failed to sign in as guest. Please try again.",
        variant: "destructive",
      });
      setIsGuestLoading(false);
    }
  };

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingTransition />
      </div>
    );
  }

  // Show homepage for logged-out users
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center">
            <div className="mr-4 flex">
              <Link 
                href="/" 
                className="mr-6 flex items-center space-x-2"
                onClick={(e) => {
                  // If already on homepage, scroll to top
                  if (window.location.pathname === '/') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              >
                <span className="sr-only">Gouache</span>
                <img
                  src="/assets/gouache-logo-light-20241111.png"
                  alt="Gouache"
                  width={1750}
                  height={375}
                  className="block h-8 w-auto dark:hidden sm:h-10"
                />
                <img
                  src="/assets/gouache-logo-dark-20241111.png"
                  alt="Gouache"
                  width={1750}
                  height={375}
                  className="hidden h-8 w-auto dark:block sm:h-10"
                />
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
          {/* Hero Image */}
          <div className="absolute inset-0 overflow-hidden -z-10">
            <img
              src="/assets/Gouache Hero Light.png"
              alt="Gouache Hero"
              className="w-full h-full object-cover block dark:hidden"
            />
            <img
              src="/assets/Gouache Hero Dark.png"
              alt="Gouache Hero"
              className="w-full h-full object-cover hidden dark:block"
            />
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-background/60 dark:bg-background/70" />
          </div>

          <div className="w-full max-w-md space-y-6 relative z-10">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">Welcome to Gouache</h1>
              <p className="text-muted-foreground">
                Discover art, connect with artists, and explore creative communities
              </p>
            </div>

            <Card className="bg-background/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-center">Get Started</CardTitle>
                <CardDescription className="text-center">
                  Choose how you'd like to access Gouache
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="gradient"
                  className="w-full"
                  size="lg"
                  asChild
                >
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  asChild
                >
                  <Link href="/login?tab=signup">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  size="lg"
                  onClick={handleGuestLogin}
                  disabled={isGuestLoading}
                >
                  {isGuestLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-4 w-4" />
                      Login as Guest
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </main>
      </div>
    );
  }

  // This shouldn't render, but just in case
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingTransition />
    </div>
  );
}
