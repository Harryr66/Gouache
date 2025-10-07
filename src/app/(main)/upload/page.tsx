'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Image, Package, GraduationCap, Calendar, ArrowLeft } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { UploadForm } from '@/components/upload-form';

export default function UploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<'portfolio' | 'product' | 'course' | 'event' | null>(null);

  // Check if user is a professional artist
  const isProfessional = user?.isProfessional || false;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isProfessional) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="p-8 text-center">
          <CardContent>
            <h2 className="text-2xl font-bold mb-4">Professional Artist Account Required</h2>
            <p className="text-muted-foreground mb-6">
              You need a verified professional artist account to upload content.
            </p>
            <Button onClick={() => router.push('/profile/edit')} variant="gradient">
              Upgrade Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If a type is selected, show the appropriate form
  if (selectedType === 'portfolio') {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setSelectedType(null)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Upload Options
        </Button>
        <header className="mb-8">
          <h1 className="font-headline text-4xl md:text-5xl font-semibold mb-2">
            Upload Portfolio Image
          </h1>
          <p className="text-muted-foreground text-lg">
            Add a new piece to your portfolio to showcase your work.
          </p>
        </header>
        <UploadForm />
      </div>
    );
  }

  if (selectedType === 'product') {
    router.push('/profile/edit?tab=portfolio');
    return null;
  }

  if (selectedType === 'course') {
    router.push('/learn/submit');
    return null;
  }

  if (selectedType === 'event') {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setSelectedType(null)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Upload Options
        </Button>
        <header className="mb-8">
          <h1 className="font-headline text-4xl md:text-5xl font-semibold mb-2">
            Create Event
          </h1>
          <p className="text-muted-foreground text-lg">
            Organize an upcoming event for your community.
          </p>
        </header>
        <Card className="p-8 text-center">
          <CardContent>
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Event Creation Coming Soon</h3>
            <p className="text-muted-foreground">
              Event creation functionality will be available soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show upload type selection
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="font-headline text-4xl md:text-5xl font-semibold mb-2">
          What would you like to upload?
        </h1>
        <p className="text-muted-foreground text-lg">
          Choose the type of content you want to share with the SOMA community.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Portfolio Image */}
        <Card 
          className="group hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
          onClick={() => setSelectedType('portfolio')}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Image className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Portfolio Image</CardTitle>
            <CardDescription>
              Upload artwork to showcase in your portfolio. Perfect for displaying your best work and attracting collectors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Upload Image
            </Button>
          </CardContent>
        </Card>

        {/* Product */}
        <Card 
          className="group hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
          onClick={() => setSelectedType('product')}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Product for Sale</CardTitle>
            <CardDescription>
              List a product in your shop. Sell original artwork, prints, or merchandise directly to your audience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              List Product
            </Button>
          </CardContent>
        </Card>

        {/* Course */}
        <Card 
          className="group hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
          onClick={() => setSelectedType('course')}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Course or Tutorial</CardTitle>
            <CardDescription>
              Create an educational course to teach your skills. Share your knowledge and earn from student enrollments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Create Course
            </Button>
          </CardContent>
        </Card>

        {/* Event */}
        <Card 
          className="group hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
          onClick={() => setSelectedType('event')}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Upcoming Event</CardTitle>
            <CardDescription>
              Organize a workshop, exhibition, or community event. Connect with your audience in person or online.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Create Event
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
