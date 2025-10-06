'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Plus, Trash2, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useCourses } from '@/providers/course-provider';
import { toast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const COURSE_CATEGORIES = {
  'painting': {
    name: 'Painting',
    subcategories: ['Oil Painting', 'Watercolor', 'Acrylic', 'Gouache', 'Mixed Media']
  },
  'drawing': {
    name: 'Drawing',
    subcategories: ['Pencil Drawing', 'Charcoal', 'Ink & Pen', 'Pastel', 'Figure Drawing']
  },
  'sculpture': {
    name: 'Sculpture',
    subcategories: ['Stone Carving', 'Metalwork', 'Wood Carving', 'Mixed Media Sculpture', 'Installation Art']
  },
  'pottery-ceramics': {
    name: 'Pottery & Ceramics',
    subcategories: ['Wheel Throwing', 'Hand Building', 'Glazing Techniques', 'Kiln Firing', 'Ceramic Sculpture', 'Functional Pottery']
  },
  'books': {
    name: 'Books',
    subcategories: ['Art Techniques', 'Art History', 'Artist Biographies', 'Art Theory', 'Coffee Table Books', 'Exhibition Catalogs']
  }
};

export default function CourseSubmissionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createCourse, createInstructor } = useCourses();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    longDescription: '',
    category: '',
    subcategory: '',
    difficulty: '',
    duration: '',
    format: '',
    price: '',
    originalPrice: '',
    tags: [] as string[],
    skills: [] as string[],
    // Instructor info
    instructorBio: '',
    credentials: '',
    specialties: [] as string[],
  });

  const [newTag, setNewTag] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialtyToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(specialty => specialty !== specialtyToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit a course.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    const requiredFields = ['title', 'description', 'category', 'subcategory', 'difficulty', 'duration', 'format', 'price', 'instructorBio'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!thumbnailFile) {
      toast({
        title: "Thumbnail Required",
        description: "Please upload a course thumbnail image.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload thumbnail
      const thumbnailRef = ref(storage, `course-thumbnails/${user.id}/${Date.now()}_${thumbnailFile.name}`);
      await uploadBytes(thumbnailRef, thumbnailFile);
      const thumbnailUrl = await getDownloadURL(thumbnailRef);

      // Create instructor profile if needed
      const instructorData = {
        id: `instructor-${user.id}`, // Generate instructor ID
        userId: user.id,
        name: user.displayName || 'Unknown Instructor',
        avatar: user.avatarUrl || '',
        bio: formData.instructorBio,
        rating: 5.0,
        students: 0,
        courses: 1,
        verified: false,
        credentials: formData.credentials,
        specialties: formData.specialties,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create course data
      const courseData = {
        title: formData.title,
        description: formData.description,
        longDescription: formData.longDescription,
        instructor: instructorData,
        thumbnail: thumbnailUrl,
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        currency: 'USD',
        category: formData.category,
        subcategory: formData.subcategory,
        difficulty: formData.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
        duration: formData.duration,
        format: formData.format as 'Self-Paced' | 'Live Sessions' | 'Hybrid' | 'E-Book',
        students: 0,
        lessons: 0,
        rating: 0,
        reviewCount: 0,
        isOnSale: !!formData.originalPrice,
        isNew: true,
        isFeatured: false,
        isPublished: false,
        tags: formData.tags,
        skills: formData.skills,
        curriculum: [],
        reviews: [],
        discussions: [],
        enrollmentCount: 0,
        completionRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create the course
      await createCourse(courseData);

      toast({
        title: "Course Submitted",
        description: "Your course has been submitted for review. You'll be notified once it's approved.",
      });

      router.push('/profile');

    } catch (error) {
      console.error('Error submitting course:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Create Course
          </CardTitle>
          <CardDescription>
            Share your knowledge and expertise with the SOMA Learn community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Course Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Course Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter course title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Short Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of your course"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longDescription">Detailed Description</Label>
                <Textarea
                  id="longDescription"
                  value={formData.longDescription}
                  onChange={(e) => handleInputChange('longDescription', e.target.value)}
                  placeholder="Detailed description of what students will learn"
                  rows={6}
                />
              </div>

              {/* Course Thumbnail */}
              <div className="space-y-2">
                <Label>Course Thumbnail *</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                    id="thumbnail-upload"
                  />
                  <label htmlFor="thumbnail-upload" className="cursor-pointer">
                    {thumbnailPreview ? (
                      <div className="space-y-2">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="mx-auto h-32 w-48 object-cover rounded-lg"
                        />
                        <p className="text-sm text-muted-foreground">Click to change</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Upload course thumbnail</p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG up to 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => {
                    handleInputChange('category', value);
                    handleInputChange('subcategory', '');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COURSE_CATEGORIES).map(([key, category]) => (
                        <SelectItem key={key} value={key}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory *</Label>
                  <Select value={formData.subcategory} onValueChange={(value) => handleInputChange('subcategory', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.category && COURSE_CATEGORIES[formData.category as keyof typeof COURSE_CATEGORIES]?.subcategories.map((subcategory) => (
                        <SelectItem key={subcategory} value={subcategory}>{subcategory}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty *</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration *</Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    placeholder="e.g., 6 weeks, 8 hours"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="format">Format *</Label>
                  <Select value={formData.format} onValueChange={(value) => handleInputChange('format', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Self-Paced">Self-Paced</SelectItem>
                      <SelectItem value="Live Sessions">Live Sessions</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="E-Book">E-Book</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="originalPrice">Original Price (optional)</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    value={formData.originalPrice}
                    onChange={(e) => handleInputChange('originalPrice', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Tags and Skills */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tags & Skills</h3>
              
              <div className="space-y-2">
                <Label>Course Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Skills Students Will Learn</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <Button type="button" onClick={addSkill} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="flex items-center gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Instructor Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Instructor Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="instructorBio">Instructor Bio *</Label>
                <Textarea
                  id="instructorBio"
                  value={formData.instructorBio}
                  onChange={(e) => handleInputChange('instructorBio', e.target.value)}
                  placeholder="Tell students about yourself, your background, and expertise"
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credentials">Credentials & Experience</Label>
                <Textarea
                  id="credentials"
                  value={formData.credentials}
                  onChange={(e) => handleInputChange('credentials', e.target.value)}
                  placeholder="Your education, certifications, exhibitions, publications, etc."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Specialties</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="Add a specialty"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                  />
                  <Button type="button" onClick={addSpecialty} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.specialties.map((specialty) => (
                    <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                      {specialty}
                      <button
                        type="button"
                        onClick={() => removeSpecialty(specialty)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="gradient-button">
                {isSubmitting ? 'Submitting...' : 'Submit Course'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
