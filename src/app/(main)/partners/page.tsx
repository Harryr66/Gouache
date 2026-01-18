'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Calendar, ShoppingBag, Megaphone, BarChart3, Target } from 'lucide-react';
import Link from 'next/link';

export default function PartnersPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl w-full max-w-full overflow-x-hidden">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 break-words">Partner with Gouache</h1>
        <p className="text-muted-foreground text-lg">
          Advertising partners and gallery partnerships
        </p>
      </div>

      {/* Advertising Partner Login Card */}
      <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Advertising Partners</CardTitle>
              <CardDescription>
                Access your self-serve advertising dashboard to manage campaigns and track performance.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-start gap-2">
              <Target className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Create Campaigns</p>
                <p className="text-xs text-muted-foreground">Self-serve ad creation</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Track Performance</p>
                <p className="text-xs text-muted-foreground">Real-time analytics</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Megaphone className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Manage Budget</p>
                <p className="text-xs text-muted-foreground">Control your spend</p>
              </div>
            </div>
          </div>
          <Link href="/partners/login">
            <Button variant="gradient" className="w-full sm:w-auto">
              Partner Login
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Gallery Account Request Card */}
      <Card className="mb-8 border-primary/20 bg-gradient-to-r from-blue-500/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-full">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Request a Gallery Account</CardTitle>
              <CardDescription>
                Are you a gallery or art space? Apply to showcase exhibitions and sell artworks on Gouache.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-start gap-2">
              <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Gallery Profile</p>
                <p className="text-xs text-muted-foreground">Professional presence</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">List Events</p>
                <p className="text-xs text-muted-foreground">Exhibitions & openings</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Sell Artworks</p>
                <p className="text-xs text-muted-foreground">Art Market access</p>
              </div>
            </div>
          </div>
          <Link href="/partners/gallery-request">
            <Button variant="outline" className="w-full sm:w-auto border-blue-500/30 hover:bg-blue-500/10">
              Apply for Gallery Account
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* What to Expect */}
      <Card>
        <CardHeader>
          <CardTitle>What to Expect</CardTitle>
          <CardDescription>
            Our application review process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                1
              </div>
              <div>
                <p className="font-medium">Submit Your Application</p>
                <p className="text-sm text-muted-foreground">
                  Complete the application form with your portfolio, experience, and social links.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                2
              </div>
              <div>
                <p className="font-medium">Review Period</p>
                <p className="text-sm text-muted-foreground">
                  Our team reviews applications within 5-7 business days. We&apos;ll check your portfolio and verify your information.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                3
              </div>
              <div>
                <p className="font-medium">Get Approved</p>
                <p className="text-sm text-muted-foreground">
                  Once approved, you&apos;ll receive an email with instructions to set up your professional account.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

