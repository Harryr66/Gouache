'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Plus, Trash2, BookOpen, ListChecks, Image as ImageIcon, DollarSign, Search, Rocket, Video, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useCourses } from '@/providers/course-provider';
import { toast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '@/lib/firebase';
import { collection, doc, getDocs, query, setDoc, where, serverTimestamp } from 'firebase/firestore';

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
  'styles': {
    name: 'Styles',
    subcategories: ['Abstract', 'Realism', 'Impressionism', 'Expressionism', 'Surrealism', 'Minimalism', 'Contemporary', 'Pop Art', 'Cubism', 'Street Art']
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
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [trailerPreviewUrl, setTrailerPreviewUrl] = useState<string | null>(null);

  // Kajabi-style multi-step wizard
  const steps = [
    { id: 'basics', label: 'Basics', icon: BookOpen },
    { id: 'curriculum', label: 'Curriculum', icon: ListChecks },
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'pricing', label: 'Pricing & Offers', icon: DollarSign },
    { id: 'discoverability', label: 'Discoverability', icon: Search },
    { id: 'publish', label: 'Publish', icon: Rocket },
  ] as const;
  type StepId = typeof steps[number]['id'];
  const [activeStep, setActiveStep] = useState<StepId>('basics');

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
    // SEO
    metaTitle: '',
    metaDescription: '',
    slug: '',
    // Curriculum
    curriculum: [] as Array<{ id: string; title: string; description?: string; type: 'video' | 'reading' | 'assignment'; duration?: string }>,
    // Publish options
    isPublished: false,
  });

  const [newTag, setNewTag] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState<'video' | 'reading' | 'assignment'>('video');
  const [newLessonDuration, setNewLessonDuration] = useState('');
  
  // AI tag generation
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // Slug state & validation
  const [slug, setSlug] = useState('');
  const [isSlugUnique, setIsSlugUnique] = useState(true);

  // Restore draft from localStorage (Kajabi-like autosave) and save to Firestore for cross-device
  useEffect(() => {
    try {
      const draft = localStorage.getItem('soma-course-draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        setFormData((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem('soma-course-draft', JSON.stringify(formData));
        if (user) {
          setDoc(doc(db, 'courseDrafts', user.id), { formData, updatedAt: serverTimestamp() }, { merge: true }).catch(()=>{});
        }
      } catch {}
    }, 500);
    return () => clearTimeout(timeout);
  }, [formData]);

  // Auto-generate slug from title and validate
  useEffect(() => {
    const next = formData.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setSlug(next);
  }, [formData.title]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!slug) { setIsSlugUnique(true); return; }
      try {
        const q = query(collection(db, 'courses'), where('slug', '==', slug));
        const snap = await getDocs(q);
        if (!cancelled) setIsSlugUnique(snap.empty);
      } catch {
        if (!cancelled) setIsSlugUnique(true);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [slug]);

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

  const handleTrailerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setTrailerFile(file);
      const url = URL.createObjectURL(file);
      setTrailerPreviewUrl(url);
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

  // AI tag generation function
  const generateAITags = async () => {
    if (!formData.title || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please provide a course title and description to generate tags.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingTags(true);
    try {
      // Mock AI tag generation - in production, this would call an AI service
      const mockTags = [
        formData.category.toLowerCase(),
        formData.subcategory.toLowerCase().replace(/\s+/g, '-'),
        formData.difficulty.toLowerCase(),
        ...formData.title.toLowerCase().split(' ').filter(word => word.length > 3),
        ...formData.description.toLowerCase().split(' ').filter(word => 
          word.length > 4 && 
          !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'there', 'could', 'other', 'after', 'first', 'well', 'also', 'where', 'much', 'some', 'these', 'would', 'into', 'has', 'more', 'very', 'what', 'know', 'just', 'like', 'over', 'also', 'back', 'here', 'through', 'when', 'much', 'before', 'right', 'should', 'because', 'each', 'which', 'their', 'said', 'them', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'].includes(word)
        ).slice(0, 5)
      ].filter((tag, index, arr) => arr.indexOf(tag) === index).slice(0, 10);

      setSuggestedTags(mockTags);
      
      toast({
        title: "Tags Generated",
        description: `${mockTags.length} suggested tags generated based on your course content.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate tags. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const addSuggestedTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const addLesson = () => {
    if (!newLessonTitle.trim()) return;
    setFormData(prev => ({
      ...prev,
      curriculum: [
        ...prev.curriculum,
        { id: `${Date.now()}`, title: newLessonTitle.trim(), type: newLessonType, duration: newLessonDuration }
      ]
    }));
    setNewLessonTitle('');
    setNewLessonDuration('');
    setNewLessonType('video');
  };
  const removeLesson = (lessonId: string) => {
    setFormData(prev => ({ ...prev, curriculum: prev.curriculum.filter(l => l.id !== lessonId) }));
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

    // Validate required fields (based on step)
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

      // Upload optional trailer
      let trailerUrl: string | undefined;
      if (trailerFile) {
        const trailerRef = ref(storage, `course-trailers/${user.id}/${Date.now()}_${trailerFile.name}`);
        await uploadBytes(trailerRef, trailerFile);
        trailerUrl = await getDownloadURL(trailerRef);
      }

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
        // longDescription already included above; avoid duplicate keys
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
        lessons: formData.curriculum.length,
        rating: 0,
        reviewCount: 0,
        isOnSale: !!formData.originalPrice,
        isNew: true,
        isFeatured: false,
        // Force admin approval requirement: mark as pending and not published
        status: 'pending' as const,
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
        previewVideoUrl: trailerUrl,
        longDescription: formData.longDescription,
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
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Sidebar Steps */}
        <div className="md:col-span-2 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Create Course</CardTitle>
              <CardDescription>Step {steps.findIndex(s=>s.id===activeStep)+1} of {steps.length}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {steps.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStep(s.id)}
                  className={`w-full flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${activeStep===s.id? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'}`}
                >
                  <s.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{s.label}</span>
                </button>
              ))}
              <div className="pt-2">
                <Button type="button" variant="outline" className="w-full" onClick={() => toast({ title: 'Draft saved' })}>
                  <Save className="h-4 w-4 mr-2" /> Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Form */}
        <div className="md:col-span-3 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {steps.find(s=>s.id===activeStep)?.label}
              </CardTitle>
              <CardDescription>
                Share your knowledge and expertise with the Gouache Learn community.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {activeStep === 'basics' && (
                  <>
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
                  </>
                )}

                {activeStep === 'curriculum' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Curriculum Builder</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input placeholder="Lesson title" value={newLessonTitle} onChange={(e)=>setNewLessonTitle(e.target.value)} />
                      <Select value={newLessonType} onValueChange={(v: any)=>setNewLessonType(v)}>
                        <SelectTrigger><SelectValue placeholder="Type"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="reading">Reading</SelectItem>
                          <SelectItem value="assignment">Assignment</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Input placeholder="Duration (e.g., 8 min)" value={newLessonDuration} onChange={(e)=>setNewLessonDuration(e.target.value)} />
                        <Button type="button" onClick={addLesson} size="sm"><Plus className="h-4 w-4"/></Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {formData.curriculum.length === 0 && (
                        <p className="text-sm text-muted-foreground">No lessons added yet.</p>
                      )}
                      <ul className="space-y-2">
                        {formData.curriculum.map(lesson => (
                          <li
                            key={lesson.id}
                            className="flex items-center justify-between rounded-md border p-2"
                            draggable
                            onDragStart={() => (window as any)._dnd = lesson.id}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              const from = (window as any)._dnd as string | undefined;
                              if (!from || from === lesson.id) return;
                              setFormData(prev => {
                                const items = [...prev.curriculum];
                                const fromIdx = items.findIndex(i => i.id === from);
                                const toIdx = items.findIndex(i => i.id === lesson.id);
                                if (fromIdx === -1 || toIdx === -1) return prev;
                                const [moved] = items.splice(fromIdx, 1);
                                items.splice(toIdx, 0, moved);
                                return { ...prev, curriculum: items };
                              });
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <ListChecks className="h-4 w-4"/>
                              <span className="font-medium">{lesson.title}</span>
                              <Badge variant="outline" className="ml-2">{lesson.type}</Badge>
                              {lesson.duration && <span className="text-xs text-muted-foreground">{lesson.duration}</span>}
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={()=>removeLesson(lesson.id)}>
                              <Trash2 className="h-4 w-4"/>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {activeStep === 'media' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Media</h3>
                    <div className="space-y-2">
                      <Label>Optional Trailer Video</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                        <input type="file" accept="video/*" id="trailer-upload" className="hidden" onChange={handleTrailerUpload} />
                        <label htmlFor="trailer-upload" className="cursor-pointer">
                          {trailerPreviewUrl ? (
                            <video className="mx-auto w-full max-w-md rounded-lg" src={trailerPreviewUrl} controls />
                          ) : (
                            <div className="space-y-2">
                              <Video className="h-12 w-12 mx-auto text-muted-foreground" />
                              <p className="text-sm">Upload an optional trailer video</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 'pricing' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Pricing & Offers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Price (USD) *</Label>
                        <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e)=>handleInputChange('price', e.target.value)} placeholder="0.00" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="originalPrice">Original Price (optional)</Label>
                        <Input id="originalPrice" type="number" step="0.01" value={formData.originalPrice} onChange={(e)=>handleInputChange('originalPrice', e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">Tip: Use an original price to show a discounted launch offer.</p>
                  </div>
                )}

                {activeStep === 'discoverability' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Discoverability</h3>
                    <p className="text-sm text-muted-foreground">Help students find your course by optimizing search and adding relevant tags.</p>
                    
                    {/* Course Description - Acts as prompt for AI tags */}
                    <div className="space-y-2">
                      <Label>Course Description</Label>
                      <Textarea 
                        value={formData.description} 
                        onChange={(e)=>handleInputChange('description', e.target.value)} 
                        placeholder="Describe your course in detail. This description will be used to generate relevant tags automatically." 
                        rows={4} 
                      />
                      <p className="text-xs text-muted-foreground">
                        A detailed description helps our AI generate better tag suggestions for your course.
                      </p>
                    </div>
                    
                    {/* Tags Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">Course Tags</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={generateAITags}
                          disabled={isGeneratingTags || !formData.description.trim()}
                        >
                          {isGeneratingTags ? 'Generating...' : 'Generate AI Tags'}
                        </Button>
                      </div>
                      
                      {/* Current Tags */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {formData.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {/* Suggested Tags */}
                      {suggestedTags.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Suggested Tags</Label>
                          <div className="flex flex-wrap gap-2">
                            {suggestedTags.map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="outline" 
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                onClick={() => addSuggestedTag(tag)}
                              >
                                + {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Manual Tag Input */}
                      <div className="flex gap-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add a custom tag"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" onClick={addTag} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* SEO Fields */}
                    <div className="space-y-4">
                      <h4 className="text-base font-medium">Search Optimization</h4>
                      <div className="space-y-2">
                        <Label>Meta Title</Label>
                        <Input 
                          value={formData.metaTitle} 
                          onChange={(e)=>handleInputChange('metaTitle', e.target.value)} 
                          placeholder="Title for search engines" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Meta Description</Label>
                        <Textarea 
                          value={formData.metaDescription} 
                          onChange={(e)=>handleInputChange('metaDescription', e.target.value)} 
                          placeholder="One or two sentences that summarize your course" 
                          rows={3} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Course URL Slug</Label>
                        <Input 
                          value={slug} 
                          onChange={(e)=>setSlug(e.target.value)} 
                          placeholder="e.g., mastering-oil-painting" 
                        />
                        <p className={`text-xs ${isSlugUnique ? 'text-green-600' : 'text-destructive'}`}>
                          {isSlugUnique ? 'Slug is available' : 'Slug is already in use'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 'publish' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Publish Settings</h3>
                    <div className="flex items-center gap-3">
                      <input id="publish-toggle" type="checkbox" checked={formData.isPublished} onChange={(e)=>handleInputChange('isPublished', e.target.checked)} />
                      <Label htmlFor="publish-toggle">Publish immediately after approval</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">Your course will be reviewed by Gouache. If approved, it will be published automatically if enabled.</p>
                  </div>
                )}

            {/* Skills Section - Tags moved to Discoverability step */}
            {activeStep === 'basics' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Skills Students Will Learn</h3>
              

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
            )}

            {/* Instructor Information */}
            {activeStep === 'basics' && (
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
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {steps.map((s, i) => s.id === activeStep && (
                  <span key={s.id} className="text-xs text-muted-foreground">Step {i+1} of {steps.length}</span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setActiveStep(steps[Math.max(0, steps.findIndex(s=>s.id===activeStep)-1)].id)}>Back</Button>
                {activeStep !== 'publish' ? (
                  <Button type="button" onClick={() => setActiveStep(steps[Math.min(steps.length-1, steps.findIndex(s=>s.id===activeStep)+1)].id)}>Continue</Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting} className="gradient-button">
                    {isSubmitting ? 'Submitting...' : 'Submit Course'}
                  </Button>
                )}
              </div>
            </div>
          </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
