'use client';

import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, DollarSign, Calendar } from 'lucide-react';

const advertisingTypes = [
  { value: 'banner', label: 'Banner Advertisement', description: 'Display ads on key pages' },
  { value: 'sponsored-content', label: 'Sponsored Articles', description: 'We will write an article showcasing your brand and feature it in our newsroom blog page' },
  { value: 'video', label: 'Video Advertisement', description: 'Featured video placements within our Discover feed' },
  { value: 'newsletter', label: 'Newsletter Sponsorship', description: 'Email marketing integration' },
  { value: 'event', label: 'Event Sponsorship', description: 'Sponsor art events and exhibitions' },
  { value: 'social-media', label: 'Social Media', description: 'Social media advertising and promotion' }
];

export default function AdvertisePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex flex-col md:flex-row items-center justify-center mb-4 gap-4 md:gap-0">
            <Megaphone className="h-12 w-12 text-primary md:mr-4" />
            <h1 className="text-4xl font-bold text-foreground">Advertise with Gouache</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Reach the art community and connect with passionate artists, collectors, and art enthusiasts worldwide.
          </p>
        </div>

        {/* Advertising Types */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Advertising Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {advertisingTypes.map((type) => (
              <Card key={type.value}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{type.label}</CardTitle>
                    <Badge variant="secondary">Popular</Badge>
                  </div>
                  <CardDescription>{type.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Why Advertise */}
        <div className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
          <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  <CardTitle>Targeted Audience</CardTitle>
                </div>
                <CardDescription>Reach niche art lovers globally.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <CardTitle>Flexible Budgets</CardTitle>
                </div>
                <CardDescription>Campaigns sized to your goals.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle>Event & Content Placements</CardTitle>
                </div>
                <CardDescription>Exhibitions, newsletters, social and more.</CardDescription>
              </CardHeader>
            </Card>
                  </div>
                </div>

        {/* Contact */}
        <div className="text-center space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Ready to discuss?</h3>
          <p className="text-muted-foreground">
            Email our advertising team at{' '}
            <a href="mailto:news@gouache.art" className="text-primary hover:underline">
              news@gouache.art
            </a>
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Typical response time: 2-3 business days</span>
          </div>
        </div>
      </div>
    </div>
  );
}

