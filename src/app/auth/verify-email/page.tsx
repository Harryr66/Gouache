'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeLoading } from '@/components/theme-loading';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the action code from URL parameters
        // Firebase sends it as 'oobCode' in the query string
        const actionCode = searchParams.get('oobCode') || searchParams.get('code');
        const mode = searchParams.get('mode') || 'verifyEmail';
        const continueUrl = searchParams.get('continueUrl');

        if (!actionCode) {
          setStatus('error');
          setMessage('Invalid verification link. Please request a new verification email.');
          return;
        }

        // Check what type of action this is
        let actionInfo;
        try {
          actionInfo = await checkActionCode(auth, actionCode);
        } catch (error: any) {
          if (error.code === 'auth/expired-action-code') {
            setStatus('expired');
            setMessage('This verification link has expired. Please request a new one.');
            return;
          } else if (error.code === 'auth/invalid-action-code') {
            setStatus('error');
            setMessage('Invalid verification link. Please request a new verification email.');
            return;
          }
          throw error;
        }

        // Apply the action code based on the mode
        if (mode === 'verifyEmail' || mode === 'verifyAndChangeEmail') {
          // Verify the email
          await applyActionCode(auth, actionCode);
          setStatus('success');
          setMessage('Your email has been verified successfully!');
          
          // Redirect after a short delay
          setTimeout(() => {
            if (continueUrl) {
              router.push(continueUrl);
            } else {
              router.push('/profile/edit');
            }
          }, 2000);
        } else if (mode === 'resetPassword') {
          // Redirect to password reset page
          router.push(`/auth/reset-password?oobCode=${actionCode}&continueUrl=${encodeURIComponent(continueUrl || '/login')}`);
        } else {
          setStatus('error');
          setMessage('Unknown verification type. Please contact support.');
        }
      } catch (error: any) {
        console.error('Error verifying email:', error);
        setStatus('error');
        
        if (error.code === 'auth/expired-action-code') {
          setMessage('This verification link has expired. Please request a new verification email from your profile settings.');
        } else if (error.code === 'auth/invalid-action-code') {
          setMessage('Invalid verification link. Please request a new verification email from your profile settings.');
        } else if (error.code === 'auth/user-disabled') {
          setMessage('This account has been disabled. Please contact support.');
        } else {
          setMessage('An error occurred while verifying your email. Please try again or contact support.');
        }
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Email Verification</CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' && 'Please wait while we verify your email...'}
            {status === 'success' && 'Verification complete!'}
            {status === 'error' && 'Verification failed'}
            {status === 'expired' && 'Link expired'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <ThemeLoading size="lg" text="" />
              <p className="mt-4 text-sm text-muted-foreground">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-center text-sm text-muted-foreground mb-4">{message}</p>
              <p className="text-center text-xs text-muted-foreground">
                Redirecting you to your profile...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-8">
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <p className="text-center text-sm text-muted-foreground mb-4">{message}</p>
              <div className="flex flex-col gap-2 w-full">
                <Button asChild variant="default" className="w-full">
                  <Link href="/profile/edit">Go to Profile Settings</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/">Go to Home</Link>
                </Button>
              </div>
            </div>
          )}

          {status === 'expired' && (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
              <p className="text-center text-sm text-muted-foreground mb-4">{message}</p>
              <div className="flex flex-col gap-2 w-full">
                <Button asChild variant="default" className="w-full">
                  <Link href="/profile/edit">Request New Verification Email</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/">Go to Home</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <ThemeLoading size="lg" text="" />
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

