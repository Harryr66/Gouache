
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail, fetchSignInMethodsForEmail } from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  usernameOrEmail: z.string().min(1, { message: "Username or email is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      usernameOrEmail: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      let emailToUse = values.usernameOrEmail.trim();
      
      // Check if input is an email (contains @) or a username
      const isEmail = emailToUse.includes('@');
      
      if (!isEmail) {
        // It's a username - look up the user's email from Firestore
        const username = emailToUse.toLowerCase();
        
        // Query userProfiles collection by handle
        const usersQuery = query(
          collection(db, 'userProfiles'),
          where('handle', '==', username),
          limit(1)
        );
        
        const querySnapshot = await getDocs(usersQuery);
        
        if (querySnapshot.empty) {
          // Also try querying by username field (for backwards compatibility)
          const usernameQuery = query(
            collection(db, 'userProfiles'),
            where('username', '==', username),
            limit(1)
          );
          const usernameSnapshot = await getDocs(usernameQuery);
          
          if (usernameSnapshot.empty) {
            toast({
              title: "Login Failed",
              description: "No account found with this username.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          
          // Get email from the found user document
          const userDoc = usernameSnapshot.docs[0];
          const userData = userDoc.data();
          
          // Try to get email from userData, or use Firebase Auth email lookup
          // Note: We need the email from Firebase Auth, not Firestore
          // Since we have the uid, we can't directly get email without admin SDK
          // So we'll need to store email in Firestore or use a different approach
          
          // For now, let's check if email is stored in userProfiles
          if (userData.email) {
            emailToUse = userData.email;
          } else {
            // If email not in Firestore, we need to get it from Firebase Auth
            // This requires the user to use their email instead
            toast({
              title: "Login Failed",
              description: "Please use your email address to log in. Username login requires email to be stored in profile.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        } else {
          // Get email from the found user document
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          
          if (userData.email) {
            emailToUse = userData.email;
          } else {
            toast({
              title: "Login Failed",
              description: "Please use your email address to log in. Username login requires email to be stored in profile.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Authenticate with Firebase using the email
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        emailToUse, 
        values.password
      );
      
      const user = userCredential.user;
      console.log('User signed in:', user);
      
      toast({
        title: "Login Successful!",
        description: `Welcome back to Gouache, ${user.displayName || user.email}!`,
      });
      
      // Redirect to discover
      router.push('/discover');
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = "An error occurred during login. Please try again.";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address or username.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address format.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address or username.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingReset(true);
    try {
      let emailToUse = forgotPasswordEmail.trim();
      
      // Check if input is an email (contains @) or a username
      const isEmail = emailToUse.includes('@');
      
      if (!isEmail) {
        // It's a username - look up the user's email from Firestore
        const username = emailToUse.toLowerCase();
        console.log('Looking up username:', username);
        
        // Query userProfiles collection by handle
        const usersQuery = query(
          collection(db, 'userProfiles'),
          where('handle', '==', username),
          limit(1)
        );
        
        const querySnapshot = await getDocs(usersQuery);
        
        if (querySnapshot.empty) {
          // Also try querying by username field (for backwards compatibility)
          const usernameQuery = query(
            collection(db, 'userProfiles'),
            where('username', '==', username),
            limit(1)
          );
          const usernameSnapshot = await getDocs(usernameQuery);
          
          if (usernameSnapshot.empty) {
            toast({
              title: "User not found",
              description: "No account found with this username. Please use your email address.",
              variant: "destructive",
            });
            setIsSendingReset(false);
            return;
          }
          
          // Get email from the found user document
          const userDoc = usernameSnapshot.docs[0];
          const userData = userDoc.data();
          console.log('Found user data:', userData);
          
          if (userData.email) {
            emailToUse = userData.email;
            console.log('Using email from Firestore:', emailToUse);
          } else {
            toast({
              title: "Email not found",
              description: "Please use your email address to reset your password. Your username doesn't have an email associated with it in our system.",
              variant: "destructive",
            });
            setIsSendingReset(false);
            return;
          }
        } else {
          // Get email from the found user document
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          console.log('Found user data:', userData);
          
          if (userData.email) {
            emailToUse = userData.email;
            console.log('Using email from Firestore:', emailToUse);
          } else {
            toast({
              title: "Email not found",
              description: "Please use your email address to reset your password. Your username doesn't have an email associated with it in our system.",
              variant: "destructive",
            });
            setIsSendingReset(false);
            return;
          }
        }
      }
      
      // Validate email format
      if (!emailToUse.includes('@') || !emailToUse.includes('.')) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        setIsSendingReset(false);
        return;
      }
      
      console.log('Sending password reset email to:', emailToUse);
      console.log('Current origin:', typeof window !== 'undefined' ? window.location.origin : 'N/A');
      
      // First, verify the email exists in Firebase Auth
      // This helps us catch cases where the email in Firestore doesn't match Firebase Auth
      let emailExistsInAuth = false;
      let signInMethods: string[] = [];
      try {
        console.log('Checking if email exists in Firebase Auth...');
        signInMethods = await fetchSignInMethodsForEmail(auth, emailToUse);
        emailExistsInAuth = signInMethods.length > 0;
        console.log('✅ Email verification result:', {
          email: emailToUse,
          existsInAuth: emailExistsInAuth,
          signInMethods: signInMethods,
          methodCount: signInMethods.length
        });
      } catch (checkError: any) {
        console.error('❌ Error checking if email exists in Firebase Auth:', checkError);
        console.error('Error code:', checkError.code);
        console.error('Error message:', checkError.message);
        
        // If it's a user-not-found error, the email doesn't exist
        if (checkError.code === 'auth/user-not-found') {
          emailExistsInAuth = false;
          console.log('⚠️ Email does NOT exist in Firebase Auth');
        } else {
          // For other errors, log but continue - sendPasswordResetEmail will handle it
          console.warn('⚠️ Could not verify email, but continuing with password reset...');
        }
      }
      
      if (!emailExistsInAuth) {
        console.error('❌ Email not found in Firebase Auth:', emailToUse);
        console.error('⚠️ This means the email exists in Firestore but NOT in Firebase Auth');
        console.error('⚠️ Firebase will not send emails to addresses that don\'t exist in Firebase Auth');
        toast({
          title: "Email not found in authentication system",
          description: `The email ${emailToUse} exists in your profile but is not registered in Firebase Authentication. This means you signed up with a different email address. Please check Firebase Console → Authentication → Users to find your actual account email, or contact support.`,
          variant: "destructive",
        });
        setIsSendingReset(false);
        return;
      }
      
      console.log('✅ Email verified in Firebase Auth');
      console.log('✅ Email exists and is registered');
      console.log('✅ Proceeding to send reset email...');
      
      // Send password reset email
      // Note: Firebase will only send email if the email exists in Firebase Auth
      // The email must match exactly (case-insensitive) with the email used during signup
      try {
        const actionCodeSettings = {
          url: `${typeof window !== 'undefined' ? window.location.origin : 'https://gouache.art'}/auth/reset-password`,
          handleCodeInApp: false,
        };
        console.log('Action code settings:', actionCodeSettings);
        console.log('Calling sendPasswordResetEmail...');
        
        await sendPasswordResetEmail(auth, emailToUse, actionCodeSettings);
        
        console.log('✅ sendPasswordResetEmail completed successfully');
        console.log('📧 Password reset email should have been sent to:', emailToUse);
        console.log('💡 If you don\'t see it, check:');
        console.log('   1. Spam/junk folder');
        console.log('   2. Firebase Console → Authentication → Email templates');
        console.log('   3. Firebase Console → Authentication → Settings → Authorized domains');
      } catch (firebaseError: any) {
        console.error('❌ Error sending password reset email:', firebaseError);
        console.error('Error code:', firebaseError.code);
        console.error('Error message:', firebaseError.message);
        console.error('Full error:', firebaseError);
        
        // If user-not-found, it means the email doesn't exist in Firebase Auth
        // This could happen if:
        // 1. The email in Firestore doesn't match the email in Firebase Auth
        // 2. The user signed up with a different email
        // 3. The account was created differently
        if (firebaseError.code === 'auth/user-not-found') {
          throw new Error(`No account found with email ${emailToUse}. Make sure you're using the exact email address you used to sign up.`);
        } else if (firebaseError.code === 'auth/invalid-continue-uri') {
          throw new Error(`Invalid redirect URL. Please contact support. Error: ${firebaseError.message}`);
        } else if (firebaseError.code === 'auth/unauthorized-continue-uri') {
          throw new Error(`Unauthorized redirect URL. The domain ${typeof window !== 'undefined' ? window.location.origin : 'N/A'} is not authorized in Firebase Console. Please contact support.`);
        }
        throw firebaseError;
      }
      
      console.log('✅ Password reset email sent successfully');
      
      toast({
        title: "Password reset email sent",
        description: `We've sent a password reset link to ${emailToUse}. Please check your inbox AND spam/junk folder. The link will expire in 1 hour. 
        
        If you don't see the email within 5-10 minutes, please:
        1. Check your spam/junk folder
        2. Check that the email address is correct
        3. Check Firebase Console email template settings
        4. Contact support if the issue persists`,
        duration: 10000, // Show for 10 seconds
      });
      
      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    } catch (error: any) {
      console.error('Password reset error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = "Failed to send password reset email. Please try again.";
      let errorTitle = "Password reset failed";
      
      if (error.code === 'auth/user-not-found') {
        errorTitle = "Account not found";
        errorMessage = "No account found with this email address. Make sure you're using the email address you signed up with.";
      } else if (error.code === 'auth/invalid-email') {
        errorTitle = "Invalid email";
        errorMessage = "Invalid email address format. Please check and try again.";
      } else if (error.code === 'auth/too-many-requests') {
        errorTitle = "Too many requests";
        errorMessage = "Too many password reset requests. Please wait a few minutes and try again.";
      } else if (error.code === 'auth/invalid-continue-uri') {
        errorTitle = "Configuration error";
        errorMessage = "There's a configuration issue. Please contact support.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="usernameOrEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username or Email</FormLabel>
                <FormControl>
                  <Input placeholder="elena_vance or you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-baseline">
                  <FormLabel>Password</FormLabel>
                  <Button
                    variant="link"
                    type="button"
                    className="p-0 h-auto text-xs text-foreground"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowForgotPassword(true);
                    }}
                  >
                    Forgot password?
                  </Button>
                </div>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button variant="gradient" type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </Form>
      
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address or username and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-password-email">Email or Username</Label>
              <Input
                id="forgot-password-email"
                type="text"
                placeholder="elena_vance or you@example.com"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleForgotPassword();
                  }
                }}
                autoFocus
              />
            </div>
            <Button
              type="button"
              onClick={handleForgotPassword}
              disabled={isSendingReset || !forgotPasswordEmail.trim()}
              className="w-full"
            >
              {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Make sure you're using the email address associated with your account. Check your spam folder if you don't see the email.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
