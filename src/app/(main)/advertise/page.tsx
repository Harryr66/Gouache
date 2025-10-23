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
import { Megaphone, DollarSign, Calendar } from 'lucide-react';

const advertisingTypes = [
  { value: 'banner', label: 'Banner Advertisement', description: 'Display ads on key pages' },
  { value: 'sponsored-content', label: 'Sponsored Content', description: 'Native content integration' },
  { value: 'video', label: 'Video Advertisement', description: 'Featured video placements' },
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
    timeline: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = ['companyName', 'contactName', 'email', 'advertisingType'];
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
      const adData = {
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
      };
      const adDocRef = await addDoc(collection(db, 'advertisingApplications'), adData);
      console.log('✅ Advertising application submitted successfully:', adDocRef.id, adData);

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
        advertisingType: '',
        budget: '',
        targetAudience: '',
        campaignGoals: '',
        message: '',
        timeline: ''
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
              {submissionType === 'course-submission' ? 'Course Submission Request' : 
               'Advertising Application'}
            </CardTitle>
            <CardDescription>
              {submissionType === 'course-submission' ? 'Request permission to submit a course to our art school platform. Our team will review your proposal and get back to you within 2-3 business days.' :
               'Fill out the form below to submit your advertising application. Our team will review it and get back to you within 2-3 business days.'}
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
              {submissionType === 'advertising' && (
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
              )}

              {/* Course Submission Information */}
              {submissionType === 'course-submission' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Course Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="courseCategory">Course Category *</Label>
                      <Select value={formData.courseCategory} onValueChange={(value) => {
                        handleInputChange('courseCategory', value);
                        handleInputChange('courseSubcategory', '');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="painting">Painting</SelectItem>
                          <SelectItem value="drawing">Drawing</SelectItem>
                          <SelectItem value="sculpture">Sculpture</SelectItem>
                          <SelectItem value="pottery-ceramics">Pottery & Ceramics</SelectItem>
                          <SelectItem value="books">Books</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="courseSubcategory">Course Subcategory *</Label>
                      <Select value={formData.courseSubcategory} onValueChange={(value) => handleInputChange('courseSubcategory', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.courseCategory === 'painting' && (
                            <>
                              <SelectItem value="oil-painting">Oil Painting</SelectItem>
                              <SelectItem value="watercolor">Watercolor</SelectItem>
                              <SelectItem value="acrylic">Acrylic</SelectItem>
                              <SelectItem value="gouache">Gouache</SelectItem>
                              <SelectItem value="mixed-media">Mixed Media</SelectItem>
                            </>
                          )}
                          {formData.courseCategory === 'drawing' && (
                            <>
                              <SelectItem value="pencil-drawing">Pencil Drawing</SelectItem>
                              <SelectItem value="charcoal">Charcoal</SelectItem>
                              <SelectItem value="ink">Ink & Pen</SelectItem>
                              <SelectItem value="pastel">Pastel</SelectItem>
                              <SelectItem value="figure-drawing">Figure Drawing</SelectItem>
                            </>
                          )}
                          {formData.courseCategory === 'sculpture' && (
                            <>
                              <SelectItem value="stone-carving">Stone Carving</SelectItem>
                              <SelectItem value="metalwork">Metalwork</SelectItem>
                              <SelectItem value="wood-carving">Wood Carving</SelectItem>
                              <SelectItem value="mixed-media-sculpture">Mixed Media Sculpture</SelectItem>
                              <SelectItem value="installation-art">Installation Art</SelectItem>
                            </>
                          )}
                          {formData.courseCategory === 'pottery-ceramics' && (
                            <>
                              <SelectItem value="wheel-throwing">Wheel Throwing</SelectItem>
                              <SelectItem value="hand-building">Hand Building</SelectItem>
                              <SelectItem value="glazing-techniques">Glazing Techniques</SelectItem>
                              <SelectItem value="kiln-firing">Kiln Firing</SelectItem>
                              <SelectItem value="ceramic-sculpture">Ceramic Sculpture</SelectItem>
                              <SelectItem value="functional-pottery">Functional Pottery</SelectItem>
                            </>
                          )}
                          {formData.courseCategory === 'books' && (
                            <>
                              <SelectItem value="art-techniques">Art Techniques</SelectItem>
                              <SelectItem value="art-history">Art History</SelectItem>
                              <SelectItem value="artist-biographies">Artist Biographies</SelectItem>
                              <SelectItem value="art-theory">Art Theory</SelectItem>
                              <SelectItem value="coffee-table-books">Coffee Table Books</SelectItem>
                              <SelectItem value="exhibition-catalogs">Exhibition Catalogs</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="courseTitle">Course Title *</Label>
                    <Input
                      id="courseTitle"
                      value={formData.courseTitle}
                      onChange={(e) => handleInputChange('courseTitle', e.target.value)}
                      placeholder="Enter course title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="courseDescription">Course Description *</Label>
                    <Textarea
                      id="courseDescription"
                      value={formData.courseDescription}
                      onChange={(e) => handleInputChange('courseDescription', e.target.value)}
                      placeholder="Describe your course in detail"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="courseDuration">Course Duration</Label>
                      <Input
                        id="courseDuration"
                        value={formData.courseDuration}
                        onChange={(e) => handleInputChange('courseDuration', e.target.value)}
                        placeholder="e.g., 6 weeks, 8 hours"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="courseFormat">Course Format</Label>
                      <Select value={formData.courseFormat} onValueChange={(value) => handleInputChange('courseFormat', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self-paced">Self-Paced</SelectItem>
                          <SelectItem value="live-sessions">Live Sessions</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="e-book">E-Book</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructorBio">Instructor Bio *</Label>
                    <Textarea
                      id="instructorBio"
                      value={formData.instructorBio}
                      onChange={(e) => handleInputChange('instructorBio', e.target.value)}
                      placeholder="Tell us about yourself, your background, and expertise"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teachingExperience">Teaching Experience *</Label>
                    <Textarea
                      id="teachingExperience"
                      value={formData.teachingExperience}
                      onChange={(e) => handleInputChange('teachingExperience', e.target.value)}
                      placeholder="Describe your teaching experience and qualifications"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sampleWork">Sample Work/Portfolio</Label>
                    <Textarea
                      id="sampleWork"
                      value={formData.sampleWork}
                      onChange={(e) => handleInputChange('sampleWork', e.target.value)}
                      placeholder="Share links to your portfolio, previous work, or sample lessons"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="courseGoals">Course Goals</Label>
                    <Textarea
                      id="courseGoals"
                      value={formData.courseGoals}
                      onChange={(e) => handleInputChange('courseGoals', e.target.value)}
                      placeholder="What will students learn and achieve from this course?"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 
                 submissionType === 'course-submission' ? 'Submit Course Request' :
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
