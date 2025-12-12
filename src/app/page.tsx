'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { Loader2, LogIn, UserPlus, User } from 'lucide-react';
import Link from 'next/link';
import { LoadingTransition } from '@/components/loading-transition';
import { SiteFooter } from '@/components/site-footer';

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [isAnonymousUser, setIsAnonymousUser] = useState(false);

  // Check if current Firebase user is anonymous
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Firebase anonymous users don't have email and have isAnonymous property
        setIsAnonymousUser(firebaseUser.isAnonymous || !firebaseUser.email);
      } else {
        setIsAnonymousUser(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Redirect logged-in users (but not anonymous) to news page
  useEffect(() => {
    if (!loading && user && !isAnonymousUser) {
      // Only redirect if user has an email (not anonymous)
      if (user.email && user.email !== '') {
        router.replace('/news');
      }
    }
  }, [user, loading, isAnonymousUser, router]);

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      console.log('Guest login successful:', userCredential.user.uid, 'isAnonymous:', userCredential.user.isAnonymous);
      
      // Wait for auth provider to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Welcome!",
        description: "You're now browsing as a guest. You can explore the platform, but some features require an account.",
      });
      
      // Force redirect to news page - don't wait for state updates
      window.location.href = '/news';
    } catch (error: any) {
      console.error('Guest login error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = "Failed to sign in as guest. Please try again.";
      let errorTitle = "Guest login failed";
      
      if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/admin-restricted-operation') {
        errorTitle = "Anonymous Authentication Disabled";
        errorMessage = "Anonymous authentication is not enabled in Firebase Console. To enable it:\n\n1. Go to Firebase Console (https://console.firebase.google.com/)\n2. Select your project (soma-social)\n3. Navigate to Authentication > Sign-in method\n4. Find 'Anonymous' in the list\n5. Click 'Enable'\n6. Click 'Save'\n\nAfter enabling, guest login will work.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show detailed error in console for debugging
      if (error.code === 'auth/admin-restricted-operation') {
        console.error('🔴 ANONYMOUS AUTHENTICATION IS NOT ENABLED IN FIREBASE CONSOLE');
        console.error('📋 Steps to fix:');
        console.error('   1. Go to: https://console.firebase.google.com/');
        console.error('   2. Select project: soma-social');
        console.error('   3. Go to: Authentication > Sign-in method');
        console.error('   4. Find "Anonymous" and click "Enable"');
        console.error('   5. Click "Save"');
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 15000,
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

  // Show homepage for logged-out users or anonymous users
  if (!user || isAnonymousUser) {
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
                    className="block h-6 w-auto dark:hidden sm:h-8"
                  />
                  <img
                    src="/assets/gouache-logo-dark-20241111.png"
                    alt="Gouache"
                    width={1750}
                    height={375}
                    className="hidden h-6 w-auto dark:block sm:h-8"
                  />
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-start pt-4 pb-2 sm:pt-8 sm:pb-4 relative min-h-[calc(100vh-4rem)]">
          <div className="w-full max-w-4xl space-y-3 sm:space-y-6 relative z-10 px-4">
            <div className="text-center space-y-3 sm:space-y-6">
              {/* Hero Image - replaces welcome text */}
              <div className="flex items-center justify-center px-2 sm:px-8 md:px-16 lg:px-24">
                <img
                  src="/assets/Gouache Hero Light.png"
                  alt="Welcome to Gouache - Discover art, connect with artists, and explore creative communities"
                  className="w-full max-w-6xl h-auto object-contain block dark:hidden"
                />
                <img
                  src="/assets/Gouache Hero Dark.png"
                  alt="Welcome to Gouache - Discover art, connect with artists, and explore creative communities"
                  className="w-full max-w-6xl h-auto object-contain hidden dark:block"
                />
              </div>
              
              {/* Buttons below hero image - constrained to hero image width */}
              <div className="flex flex-col items-center space-y-2 pt-1 sm:pt-2 px-2 sm:px-8 md:px-16 lg:px-24">
                <div className="w-full max-w-6xl flex flex-col items-center space-y-2">
                  <Button
                    variant="gradient"
                    className="w-3/4 !h-7 !rounded-full [&::before]:!rounded-full [&::before]:!inset-[1px] text-xs"
                    asChild
                  >
                    <Link href="/login">
                      Login
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-3/4 !h-7 !rounded-full !border-2 border-border text-xs"
                    asChild
                  >
                    <Link href="/login?tab=signup">
                      Create Account
                    </Link>
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-3/4 !h-7 !rounded-full text-xs"
                    onClick={handleGuestLogin}
                    disabled={isGuestLoading}
                  >
                    {isGuestLoading ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Login as Guest'
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </main>
        
        {/* Footer */}
        <SiteFooter />
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
