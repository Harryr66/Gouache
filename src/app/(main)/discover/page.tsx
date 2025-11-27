'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check, Mail, Palette, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function DiscoverPage() {
  // Newsletter signup state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isNewsletterSubmitting, setIsNewsletterSubmitting] = useState(false);
  const [isNewsletterSuccess, setIsNewsletterSuccess] = useState(false);

  // Artist profile request state
  const [artistRequest, setArtistRequest] = useState({
    name: '',
    email: '',
    artistStatement: '',
    experience: '',
    instagram: '',
    website: ''
  });
  const [isArtistSubmitting, setIsArtistSubmitting] = useState(false);
  const [isArtistSuccess, setIsArtistSuccess] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newsletterEmail.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address.',
        variant: 'destructive'
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      return;
    }

    setIsNewsletterSubmitting(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: newsletterEmail.trim().toLowerCase(),
          source: 'discover-coming-soon'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe to newsletter');
      }

      setIsNewsletterSuccess(true);
      setNewsletterEmail('');
      
      toast({
        title: 'Successfully subscribed!',
        description: 'Thank you for signing up for first access to our discover platform.',
      });

      setTimeout(() => {
        setIsNewsletterSuccess(false);
      }, 3000);
      } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast({
        title: 'Subscription failed',
        description: error instanceof Error ? error.message : 'Unable to subscribe. Please try again.',
        variant: 'destructive'
      });
      } finally {
      setIsNewsletterSubmitting(false);
    }
  };

  const handleArtistRequestSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
    
    if (!artistRequest.name.trim() || !artistRequest.email.trim()) {
      toast({
        title: 'Required fields',
        description: 'Please fill in your name and email.',
        variant: 'destructive'
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(artistRequest.email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      return;
    }

    setIsArtistSubmitting(true);

    try {
      const response = await fetch('/api/artist-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: artistRequest.name.trim(),
          email: artistRequest.email.trim().toLowerCase(),
          artistStatement: artistRequest.artistStatement.trim() || undefined,
          experience: artistRequest.experience.trim() || undefined,
          socialLinks: {
            ...(artistRequest.instagram.trim() && { instagram: artistRequest.instagram.trim() }),
            ...(artistRequest.website.trim() && { website: artistRequest.website.trim() })
          },
          source: 'discover-coming-soon'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit artist request');
      }

      setIsArtistSuccess(true);
      setArtistRequest({
        name: '',
        email: '',
        artistStatement: '',
        experience: '',
        instagram: '',
        website: ''
      });
      
      toast({
        title: 'Submitted',
        description: 'Your application will be reviewed and you will receive an email link upon confirmation.',
      });

      setTimeout(() => {
        setIsArtistSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Artist request error:', error);
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Unable to submit request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsArtistSubmitting(false);
    }
  };

  return (
      <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Coming Soon Header */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center justify-center mb-4">
            <Eye className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Discover is Coming Soon
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover Upcoming Exhibitions, Events & More
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Newsletter Signup Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
              </div>
                <CardTitle className="text-2xl">First Access</CardTitle>
              </div>
              <CardDescription>
                Sign up to be notified when our discover platform launches. Get early access to explore artists, artworks, and events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNewsletterSubmit} className="space-y-4">
        <div>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    disabled={isNewsletterSubmitting || isNewsletterSuccess}
                    className="h-11"
                    required
                  />
                  </div>
                  <Button
                  type="submit"
                  disabled={isNewsletterSubmitting || isNewsletterSuccess}
                  className="w-full h-11"
                >
                  {isNewsletterSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : isNewsletterSuccess ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Subscribed!
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Sign Up for First Access
                    </>
                  )}
                      </Button>
              </form>
            </CardContent>
          </Card>

          {/* Artist Profile Request Card */}
          <Card>
                    <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                        </div>
                <CardTitle className="text-2xl">Request Artist Profile</CardTitle>
                      </div>
              <CardDescription>
                Are you an artist? Request a professional profile on our platform to showcase your work and connect with collectors.
              </CardDescription>
                    </CardHeader>
            <CardContent>
              <form onSubmit={handleArtistRequestSubmit} className="space-y-4">
                <div className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={artistRequest.name}
                    onChange={(e) => setArtistRequest(prev => ({ ...prev, name: e.target.value }))}
                    disabled={isArtistSubmitting || isArtistSuccess}
                    className="h-10"
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={artistRequest.email}
                    onChange={(e) => setArtistRequest(prev => ({ ...prev, email: e.target.value }))}
                    disabled={isArtistSubmitting || isArtistSuccess}
                    className="h-10"
                    required
                  />
                  <Textarea
                    placeholder="Artist statement (optional)"
                    value={artistRequest.artistStatement}
                    onChange={(e) => setArtistRequest(prev => ({ ...prev, artistStatement: e.target.value }))}
                    disabled={isArtistSubmitting || isArtistSuccess}
                    rows={3}
                    className="resize-none"
                  />
                  <Textarea
                    placeholder="Experience/Background (optional)"
                    value={artistRequest.experience}
                    onChange={(e) => setArtistRequest(prev => ({ ...prev, experience: e.target.value }))}
                    disabled={isArtistSubmitting || isArtistSuccess}
                    rows={2}
                    className="resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
            <Input
                      type="text"
                      placeholder="Instagram (optional)"
                      value={artistRequest.instagram}
                      onChange={(e) => setArtistRequest(prev => ({ ...prev, instagram: e.target.value }))}
                      disabled={isArtistSubmitting || isArtistSuccess}
                      className="h-10"
                    />
                  <Input
                      type="url"
                      placeholder="Website (optional)"
                      value={artistRequest.website}
                      onChange={(e) => setArtistRequest(prev => ({ ...prev, website: e.target.value }))}
                      disabled={isArtistSubmitting || isArtistSuccess}
                      className="h-10"
                    />
          </div>
                  </div>
          <Button
                  type="submit"
                  disabled={isArtistSubmitting || isArtistSuccess}
                  className="w-full h-11"
                >
                  {isArtistSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : isArtistSuccess ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Request Submitted!
                    </>
                  ) : (
                    <>
                      <Palette className="mr-2 h-4 w-4" />
                      Request Profile
                    </>
                  )}
                      </Button>
              </form>
                  </CardContent>
                </Card>
            </div>
            
        {/* Additional Info Section */}
        <div className="mt-16 text-center space-y-4">
          <Separator className="max-w-md mx-auto" />
          <p className="text-muted-foreground">
            Visit our{' '}
            <a href="/news" className="text-primary hover:underline">newsroom</a> for updates and news.
          </p>
              </div>
      </div>
    </div>
  );
}
