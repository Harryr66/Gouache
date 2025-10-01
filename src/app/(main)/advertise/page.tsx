'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { Megaphone, Target, Users, DollarSign, Calendar, Globe } from 'lucide-react';

const advertisingTypes = [
  { value: 'banner', label: 'Banner Advertisement', description: 'Display ads on key pages' },
  { value: 'sponsored-content', label: 'Sponsored Content', description: 'Native content integration' },
  { value: 'video', label: 'Video Advertisement', description: 'Pre-roll and mid-roll ads' },
  { value: 'newsletter', label: 'Newsletter Sponsorship', description: 'Email marketing integration' },
  { value: 'event', label: 'Event Sponsorship', description: 'Sponsor art events and exhibitions' },
  { value: 'influencer', label: 'Influencer Partnership', description: 'Collaborate with artists' }
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
  const [submissionType, setSubmissionType] = useState<'advertising' | 'affiliate' | 'both'>('advertising');
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    advertisingType: '',
    budget: '',
    targetAudience: '',
    campaignGoals: '',
    message: '',
    timeline: '',
    // Affiliate-specific fields
    productCategory: '',
    productSubcategory: '',
    productTitle: '',
    productDescription: '',
    productPrice: '',
    productCurrency: 'USD',
    affiliateLink: '',
    commissionRate: '',
    marketingGoals: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields based on submission type
    const requiredFields = ['companyName', 'contactName', 'email'];
    if (submissionType === 'advertising' || submissionType === 'both') {
      requiredFields.push('advertisingType');
    }
    if (submissionType === 'affiliate' || submissionType === 'both') {
      requiredFields.push('website', 'productCategory', 'productSubcategory', 'productTitle', 'productDescription', 'productPrice', 'affiliateLink');
    }

    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit advertising application if requested
      if (submissionType === 'advertising' || submissionType === 'both') {
        await addDoc(collection(db, 'advertisingApplications'), {
          companyName: formData.companyName,
          contactName: formData.contactName,
          email: formData.email,
          phone: formData.phone,
          website: formData.website,
          advertisingType: formData.advertisingType,
          budget: formData.budget,
          targetAudience: formData.targetAudience,
          campaignGoals: formData.campaignGoals,
          message: formData.message,
          timeline: formData.timeline,
          status: 'pending',
          submittedAt: serverTimestamp(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Submit affiliate request if requested
      if (submissionType === 'affiliate' || submissionType === 'both') {
        await addDoc(collection(db, 'affiliateRequests'), {
          companyName: formData.companyName,
          contactName: formData.contactName,
          email: formData.email,
          phone: formData.phone,
          website: formData.website,
          productCategory: formData.productCategory,
          productSubcategory: formData.productSubcategory,
          productTitle: formData.productTitle,
          productDescription: formData.productDescription,
          productPrice: parseFloat(formData.productPrice),
          productCurrency: formData.productCurrency,
          productImages: [], // Will be uploaded separately
          affiliateLink: formData.affiliateLink,
          commissionRate: formData.commissionRate,
          targetAudience: formData.targetAudience,
          marketingGoals: formData.marketingGoals,
          message: formData.message,
          status: 'pending',
          submittedAt: serverTimestamp()
        });
      }

      const submissionText = submissionType === 'both' ? 'applications have been' : 'application has been';
      toast({
        title: "Application Submitted",
        description: `Your ${submissionText} submitted successfully. We'll review it and get back to you within 2-3 business days.`,
      });

      // Reset form
      setFormData({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        website: '',
        advertisingType: '',
        budget: '',
        targetAudience: '',
        campaignGoals: '',
        message: '',
        timeline: '',
        productCategory: '',
        productSubcategory: '',
        productTitle: '',
        productDescription: '',
        productPrice: '',
        productCurrency: 'USD',
        affiliateLink: '',
        commissionRate: '',
        marketingGoals: ''
      });
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
          <div className="flex items-center justify-center mb-4">
            <Megaphone className="h-12 w-12 text-primary mr-4" />
            <h1 className="text-4xl font-bold text-foreground">Advertise with SOMA</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Reach the art community and connect with passionate artists, collectors, and art enthusiasts worldwide.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-foreground">10K+</h3>
              <p className="text-muted-foreground">Active Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Globe className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-foreground">50+</h3>
              <p className="text-muted-foreground">Countries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Target className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-foreground">95%</h3>
              <p className="text-muted-foreground">Engagement Rate</p>
            </CardContent>
          </Card>
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
              {submissionType === 'affiliate' ? 'Marketplace Partnership Application' : 
               submissionType === 'both' ? 'Advertising & Marketplace Partnership' : 
               'Advertising Application'}
            </CardTitle>
            <CardDescription>
              {submissionType === 'affiliate' ? 'Apply to showcase your products in our marketplace with affiliate links.' :
               submissionType === 'both' ? 'Apply for both advertising opportunities and marketplace partnership.' :
               'Fill out the form below to submit your advertising application. Our team will review it and get back to you within 2-3 business days.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Submission Type Selection */}
              <div className="space-y-2">
                <Label>What are you interested in? *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        id="advertising"
                        type="radio"
                        name="submissionType"
                        value="advertising"
                        checked={submissionType === 'advertising'}
                        onChange={(e) => setSubmissionType(e.target.value as 'advertising' | 'affiliate' | 'both')}
                        className="rounded"
                      />
                      <Label htmlFor="advertising">Advertising Only</Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">Promote your brand through promoted ad placements</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        id="affiliate"
                        type="radio"
                        name="submissionType"
                        value="affiliate"
                        checked={submissionType === 'affiliate'}
                        onChange={(e) => setSubmissionType(e.target.value as 'advertising' | 'affiliate' | 'both')}
                        className="rounded"
                      />
                      <Label htmlFor="affiliate">Marketplace Partnership</Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">Sell products via our affiliate marketplace</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        id="both"
                        type="radio"
                        name="submissionType"
                        value="both"
                        checked={submissionType === 'both'}
                        onChange={(e) => setSubmissionType(e.target.value as 'advertising' | 'affiliate' | 'both')}
                        className="rounded"
                      />
                      <Label htmlFor="both">Both Options</Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">Advertising + marketplace</p>
                  </div>
                </div>
              </div>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="advertisingType">Advertising Type *</Label>
                    <Select value={formData.advertisingType} onValueChange={(value) => handleInputChange('advertisingType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select advertising type" />
                      </SelectTrigger>
                      <SelectContent>
                        {advertisingTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

              {/* Affiliate Product Information */}
              {(submissionType === 'affiliate' || submissionType === 'both') && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Product Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="productCategory">Product Category *</Label>
                      <Select value={formData.productCategory} onValueChange={(value) => {
                        handleInputChange('productCategory', value);
                        // Reset subcategory when category changes
                        handleInputChange('productSubcategory', value === 'art-prints' ? 'fine-art-prints' : 'art-history');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="art-prints">Art Prints</SelectItem>
                          <SelectItem value="art-books">Art Books</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="productSubcategory">Product Subcategory *</Label>
                      <Select value={formData.productSubcategory} onValueChange={(value) => handleInputChange('productSubcategory', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.productCategory === 'art-prints' ? (
                            <>
                              <SelectItem value="fine-art-prints">Fine Art Prints</SelectItem>
                              <SelectItem value="canvas-prints">Canvas Prints</SelectItem>
                              <SelectItem value="framed-prints">Framed Prints</SelectItem>
                              <SelectItem value="limited-editions">Limited Editions</SelectItem>
                              <SelectItem value="posters">Posters</SelectItem>
                              <SelectItem value="digital-prints">Digital Downloads</SelectItem>
                            </>
                          ) : formData.productCategory === 'art-books' ? (
                            <>
                              <SelectItem value="art-history">Art History</SelectItem>
                              <SelectItem value="artist-biographies">Artist Biographies</SelectItem>
                              <SelectItem value="technique-books">Technique & How-To</SelectItem>
                              <SelectItem value="art-theory">Art Theory</SelectItem>
                              <SelectItem value="coffee-table-books">Coffee Table Books</SelectItem>
                              <SelectItem value="exhibition-catalogs">Exhibition Catalogs</SelectItem>
                            </>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="productTitle">Product Title *</Label>
                    <Input
                      id="productTitle"
                      value={formData.productTitle}
                      onChange={(e) => handleInputChange('productTitle', e.target.value)}
                      placeholder="Enter product title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="productDescription">Product Description *</Label>
                    <Textarea
                      id="productDescription"
                      value={formData.productDescription}
                      onChange={(e) => handleInputChange('productDescription', e.target.value)}
                      placeholder="Describe your product in detail"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="productPrice">Product Price *</Label>
                      <Input
                        id="productPrice"
                        type="number"
                        step="0.01"
                        value={formData.productPrice}
                        onChange={(e) => handleInputChange('productPrice', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="productCurrency">Currency</Label>
                      <Select value={formData.productCurrency} onValueChange={(value) => handleInputChange('productCurrency', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="affiliateLink">Affiliate Link *</Label>
                    <Input
                      id="affiliateLink"
                      value={formData.affiliateLink}
                      onChange={(e) => handleInputChange('affiliateLink', e.target.value)}
                      placeholder="https://yourwebsite.com/product-page"
                    />
                    <p className="text-xs text-muted-foreground">
                      This is where customers will be redirected when they click "Buy Now"
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commissionRate">Commission Rate (optional)</Label>
                    <Input
                      id="commissionRate"
                      value={formData.commissionRate}
                      onChange={(e) => handleInputChange('commissionRate', e.target.value)}
                      placeholder="e.g., 10% or $5 per sale"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marketingGoals">Marketing Goals</Label>
                    <Textarea
                      id="marketingGoals"
                      value={formData.marketingGoals}
                      onChange={(e) => handleInputChange('marketingGoals', e.target.value)}
                      placeholder="What are your marketing goals for this product?"
                      rows={3}
                    />
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Product Image Requirements</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Upload 2-5 high-quality images on a white background</li>
                      <li>• Images should be at least 1000x1000 pixels</li>
                      <li>• Product should be clearly visible and well-lit</li>
                      <li>• Images will be uploaded after your application is approved</li>
                    </ul>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 
                 submissionType === 'both' ? 'Submit Applications' :
                 submissionType === 'affiliate' ? 'Submit Partnership Application' :
                 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <div className="text-center mt-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">Questions?</h3>
          <p className="text-muted-foreground mb-4">
            Contact our advertising team at{' '}
            <a href="mailto:advertising@soma.com" className="text-primary hover:underline">
              advertising@soma.com
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
