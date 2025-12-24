'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export default function PartnerLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      // First authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );

      const user = userCredential.user;

      // Check if this is a partner account or admin account
      const partnerQuery = query(
        collection(db, 'partnerAccounts'),
        where('email', '==', values.email),
        limit(1)
      );

      const partnerSnapshot = await getDocs(partnerQuery);
      
      // Also check if this is an admin account
      const userProfileQuery = query(
        collection(db, 'userProfiles'),
        where('email', '==', values.email),
        limit(1)
      );
      
      const userProfileSnapshot = await getDocs(userProfileQuery);
      const isAdmin = userProfileSnapshot.docs.length > 0 && 
                      userProfileSnapshot.docs[0].data().isAdmin === true;

      if (partnerSnapshot.empty && !isAdmin) {
        // Not a partner account or admin - sign out and show error
        await auth.signOut();
        toast({
          title: "Access Denied",
          description: "This account is not authorized for partner access. Please use the regular login page.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // If it's a partner account, check if it's active
      if (!partnerSnapshot.empty) {
        const partnerData = partnerSnapshot.docs[0].data();

        if (!partnerData.isActive) {
          await auth.signOut();
          toast({
            title: "Account Inactive",
            description: "Your partner account has been deactivated. Please contact support.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        toast({
          title: "Login Successful!",
          description: `Welcome back, ${partnerData.companyName || partnerData.contactName}!`,
        });
      } else if (isAdmin) {
        // Admin account
        const adminData = userProfileSnapshot.docs[0].data();
        toast({
          title: "Login Successful!",
          description: `Welcome back, ${adminData.displayName || adminData.name || 'Admin'}!`,
        });
      }

      // Redirect to partner dashboard
      router.push('/partners/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);

      let errorMessage = "An error occurred during login. Please try again.";

      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address.";
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
    <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Partner Login</CardTitle>
            <CardDescription>
              Access your advertising dashboard to manage campaigns and track performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="partner@example.com" {...field} />
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
                      <FormLabel>Password</FormLabel>
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
            <p className="text-xs text-muted-foreground text-center mt-4">
              Need partner access? Contact{" "}
              <a href="mailto:Advertising@gouache.art" className="text-primary hover:underline">
                Advertising@gouache.art
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


