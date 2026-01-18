'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { Megaphone, DollarSign, Calendar } from 'lucide-react';

const advertisingTypes = [
  { value: 'banner', label: 'Banner Advertisement', description: 'Display ads on key pages' },
  { value: 'sponsored-content', label: 'Sponsored Articles', description: 'We will write an article showcasing your brand and feature it in our newsroom blog page' },
  { value: 'video', label: 'Video Advertisement', description: 'Featured video placements within our Discover feed' },
  { value: 'newsletter', label: 'Newsletter Sponsorship', description: 'Email marketing integration' },
  { value: 'event', label: 'Event Sponsorship', description: 'Sponsor art events and exhibitions' },
  { value: 'social-media', label: 'Social Media', description: 'Social media advertising and promotion' }
];

const budgetRanges = [
  { value: 'under-1k', label: 'Under $1,000' },
  { value: '1k-5k', label: '$1,000 - $5,000' },
  { value: '5k-10k', label: '$5,000 - $10,000' },
  { value: '10k-25k', label: '$10,000 - $25,000' },
  { value: '25k-50k', label: '$25,000 - $50,000' },
  { value: '50k-plus', label: '$50,000+' }
];

export default function AdvertisePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAdTypes, setSelectedAdTypes] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    budget: '',
    targetAudience: '',
    campaignGoals: '',
    message: '',
    timeline: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAdTypeToggle = (value: string) => {
    setSelectedAdTypes(prev => 
      prev.includes(value) 
        ? prev.filter(t => t !== value)
        : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.companyName || !formData.contactName || !formData.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAdTypes.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select at least one advertising type.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const adData = {
        companyName: formData.companyName,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        advertisingTypes: selectedAdTypes,
        budget: formData.budget,
        targetAudience: formData.targetAudience,
        campaignGoals: formData.campaignGoals,
        message: formData.message,
        timeline: formData.timeline,
        status: 'pending',
        submittedAt: serverTimestamp(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const adDocRef = await addDoc(collection(db, 'advertisingApplications'), adData);
      console.log('✅ Advertising application submitted successfully:', adDocRef.id, adData);

      // Email notification
      try {
        const notifyRes = await fetch('/api/notify-advertising', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...adData, applicationId: adDocRef.id, sendTo: 'advertising@gouache.art' }),
        });
        if (!notifyRes.ok) {
          console.warn('⚠️ Advertising email notification failed', await notifyRes.text());
        }
      } catch (err) {
        console.warn('⚠️ Failed to send advertising email notification', err);
      }

      toast({
        title: "Application Submitted",
        description: "Your advertising application has been submitted successfully. We'll review it and get back to you within 2-3 business days.",
      });

      // Reset form
      setFormData({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        website: '',
        budget: '',
        targetAudience: '',
        campaignGoals: '',
        message: '',
        timeline: ''
      });
      setSelectedAdTypes([]);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <Card key={type.value} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">{type.label}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Application Form */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Advertising Application
            </CardTitle>
            <CardDescription>
              Fill out the form below to submit your advertising application. Our team will review it and get back to you within 2-3 business days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Company Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="Enter company name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange('contactName', e.target.value)}
                      placeholder="Enter contact person name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              {/* Campaign Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Campaign Details</h3>
                
                {/* Multi-select Advertising Types */}
                <div className="space-y-3">
                  <Label>Advertising Types * (Select all that apply)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {advertisingTypes.map((type) => (
                      <div 
                        key={type.value} 
                        className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAdTypes.includes(type.value) 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleAdTypeToggle(type.value)}
                      >
                        <Checkbox
                          id={type.value}
                          checked={selectedAdTypes.includes(type.value)}
                          onCheckedChange={() => handleAdTypeToggle(type.value)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor={type.value} 
                            className="text-sm font-medium cursor-pointer"
                          >
                            {type.label}
                          </label>
                          <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Budget Range</Label>
                  <Select value={formData.budget} onValueChange={(value) => handleInputChange('budget', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent>
                      {budgetRanges.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Input
                    id="targetAudience"
                    value={formData.targetAudience}
                    onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                    placeholder="Describe your target audience"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaignGoals">Campaign Goals</Label>
                  <Textarea
                    id="campaignGoals"
                    value={formData.campaignGoals}
                    onChange={(e) => handleInputChange('campaignGoals', e.target.value)}
                    placeholder="What do you hope to achieve with this campaign?"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeline">Campaign Timeline</Label>
                  <Input
                    id="timeline"
                    value={formData.timeline}
                    onChange={(e) => handleInputChange('timeline', e.target.value)}
                    placeholder="When would you like to start your campaign?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Additional Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Any additional information or special requirements?"
                    rows={4}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <div className="text-center mt-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">Questions?</h3>
          <p className="text-muted-foreground mb-4">
            Contact our advertising team at{' '}
            <a href="mailto:advertising@gouache.art" className="text-primary hover:underline">
              advertising@gouache.art
            </a>
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Response time: 2-3 business days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
