
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  usernameOrEmail: z.string().min(1, { message: "Username or email is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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
  

  return (
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
                <Button variant="link" type="button" className="p-0 h-auto text-xs text-foreground">Forgot password?</Button>
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
  );
}
