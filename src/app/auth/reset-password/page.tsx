'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeLoading } from '@/components/theme-loading';
import { CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';

const passwordResetSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string().min(6, { message: 'Please confirm your password.' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'verifying' | 'ready' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('Verifying reset link...');
  const [email, setEmail] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const form = useForm<z.infer<typeof passwordResetSchema>>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const verifyResetCode = async () => {
      try {
        const actionCode = searchParams.get('oobCode') || searchParams.get('code');
        const continueUrl = searchParams.get('continueUrl');

        if (!actionCode) {
          setStatus('error');
          setMessage('Invalid password reset link. Please request a new one.');
          return;
        }

        // Verify the action code and get the email
        try {
          const emailFromCode = await verifyPasswordResetCode(auth, actionCode);
          setEmail(emailFromCode);
          setStatus('ready');
          setMessage('Enter your new password below.');
        } catch (error: any) {
          if (error.code === 'auth/expired-action-code') {
            setStatus('expired');
            setMessage('This password reset link has expired. Please request a new one.');
          } else if (error.code === 'auth/invalid-action-code') {
            setStatus('error');
            setMessage('Invalid password reset link. Please request a new one.');
          } else {
            throw error;
          }
        }
      } catch (error: any) {
        console.error('Error verifying password reset code:', error);
        setStatus('error');
        setMessage('An error occurred while verifying your reset link. Please try again or request a new one.');
      }
    };

    verifyResetCode();
  }, [searchParams]);

  const onSubmit = async (values: z.infer<typeof passwordResetSchema>) => {
    setIsResetting(true);
    try {
      const actionCode = searchParams.get('oobCode') || searchParams.get('code');
      
      if (!actionCode) {
        throw new Error('Reset code not found');
      }

      // Confirm the password reset
      await confirmPasswordReset(auth, actionCode, values.password);
      
      setStatus('success');
      setMessage('Your password has been reset successfully!');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setIsResetting(false);
      
      if (error.code === 'auth/expired-action-code') {
        setStatus('expired');
        setMessage('This password reset link has expired. Please request a new one.');
      } else if (error.code === 'auth/invalid-action-code') {
        setStatus('error');
        setMessage('Invalid password reset link. Please request a new one.');
      } else if (error.code === 'auth/weak-password') {
        form.setError('password', { message: 'Password is too weak. Please choose a stronger password.' });
      } else {
        toast({
          title: 'Password Reset Failed',
          description: 'An error occurred while resetting your password. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Reset Your Password</CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' && 'Verifying reset link...'}
            {status === 'verifying' && 'Verifying...'}
            {status === 'ready' && email && `Enter a new password for ${email}`}
            {status === 'success' && 'Password reset complete!'}
            {status === 'error' && 'Reset failed'}
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

          {status === 'ready' && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your new password"
                            {...field}
                            disabled={isResetting}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isResetting}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm your new password"
                            {...field}
                            disabled={isResetting}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={isResetting}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isResetting}>
                  {isResetting ? (
                    <>
                      <ThemeLoading size="sm" text="" />
                      <span className="ml-2">Resetting Password...</span>
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </Form>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-center text-sm text-muted-foreground mb-4">{message}</p>
              <p className="text-center text-xs text-muted-foreground">
                Redirecting you to login...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-8">
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <p className="text-center text-sm text-muted-foreground mb-4">{message}</p>
              <div className="flex flex-col gap-2 w-full">
                <Button asChild variant="default" className="w-full">
                  <Link href="/login">Request New Reset Link</Link>
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
                  <Link href="/login">Request New Reset Link</Link>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <ThemeLoading size="lg" text="" />
            <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

