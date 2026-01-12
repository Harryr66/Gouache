'use client';

// Force dynamic rendering since we use useSearchParams
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState, Suspense, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Plus, Trash2, BookOpen, ListChecks, Image as ImageIcon, DollarSign, Search, Rocket, Video, Save, Clock, AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useCourses } from '@/providers/course-provider';
import { toast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, query, setDoc, where, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';

const COURSE_CATEGORIES = [
  'Abstract Painting',
  'Acrylic',
  'Anatomy',
  'Botanical Drawing',
  'Business',
  'Charcoal',
  'Content Production',
  'Encaustic',
  'Figure Drawing',
  'Figure Painting',
  'Fresco',
  'Gouache',
  'Ink & Pen',
  'Landscape Painting',
  'Mixed Media',
  'Oil Painting',
  'Other',
  'Pastel',
  'Pencil Drawing',
  'Portrait Drawing',
  'Portrait Painting',
  'Pottery & Ceramics',
  'Sculpture',
  'Still Life',
  'Tempera',
  'Watercolor'
];

function CourseSubmissionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { createCourse, createInstructor, updateCourse, getCourse, deleteCourse } = useCourses();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    hasStripe: boolean;
    isComplete: boolean;
  } | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [trailerPreviewUrl, setTrailerPreviewUrl] = useState<string | null>(null);
  const [myDrafts, setMyDrafts] = useState<any[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [shouldRedirectAfterSave, setShouldRedirectAfterSave] = useState(true);

  // Kajabi-style multi-step wizard
  const steps = [
    { id: 'basics', label: 'Basics', icon: BookOpen },
    { id: 'curriculum', label: 'Curriculum', icon: ListChecks },
    { id: 'media', label: 'Trailer', icon: ImageIcon },
    { id: 'pricing', label: 'Pricing & Offers', icon: DollarSign },
    { id: 'discoverability', label: 'Discoverability', icon: Search },
    { id: 'publish', label: 'Publish', icon: Rocket },
  ] as const;
  type StepId = typeof steps[number]['id'];
  const [activeStep, setActiveStep] = useState<StepId>('basics');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: '',
    duration: '',
    price: '',
    currency: 'USD',
    tags: [] as string[],
    // Instructor info
    instructorBio: '',
    // SEO
    metaTitle: '',
    metaDescription: '',
    slug: '',
    // Curriculum - flat array of lessons
    curriculum: [] as Array<{ id: string; title: string; description?: string; type: 'video' | 'reading' | 'assignment'; duration?: string; videoUrl?: string; content?: string; order: number; isPreview: boolean }>,
    // Supply List
    supplyList: [] as Array<{ id: string; item: string; brand: string; affiliateLink?: string }>,
    // Course hosting type
    courseType: 'affiliate' as 'hosted' | 'affiliate',
    externalUrl: '',
    hostingPlatform: '',
    // Publish options
    isPublished: false,
    // Originality disclaimer
    originalityDisclaimer: false,
  });

  const [newTag, setNewTag] = useState('');
  const [tagKeywords, setTagKeywords] = useState('');
  // Curriculum builder state - simplified to single lesson form
  const [lessonFormData, setLessonFormData] = useState<{
    title: string;
    duration: string;
    notes: string;
    videoFile: File | null;
  }>({
    title: '',
    duration: '', // Will be extracted from video
    notes: '', // Optional notes that display alongside the course
    videoFile: null as File | null,
  });
  
  // Helper function to extract video duration
  const getVideoDuration = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };
  const [uploadingVideo, setUploadingVideo] = useState(false);
  // Supply list state
  const [newSupplyItem, setNewSupplyItem] = useState('');
  const [newSupplyBrand, setNewSupplyBrand] = useState('');
  const [newSupplyAffiliateLink, setNewSupplyAffiliateLink] = useState('');
  
  // AI tag generation
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // Slug state & validation
  const [slug, setSlug] = useState('');
  const [isSlugUnique, setIsSlugUnique] = useState(true);

  // Track the last editId to prevent unnecessary resets
  const editIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);
  
  // Extract editId value and memoize ONLY by string value, not object reference
  // This ensures memoization only changes when actual editId string changes
  const editIdString = searchParams?.get('edit') || null;
  const currentEditId = useMemo(() => editIdString, [editIdString]);
  
  // Load course data if editing, OR reset form if creating new
  // CRITICAL: Only run when editId actually changes, NEVER on re-renders from video uploads
  useEffect(() => {
    const editId = currentEditId;
    const previousEditId = editIdRef.current;
    
    // CRITICAL: Skip entirely if editId hasn't changed
    // This is the PRIMARY protection against form resets during video uploads
    if (hasInitializedRef.current && previousEditId === editId) {
      return; // editId unchanged, do absolutely nothing - form stays intact
    }
    
    // Mark as initialized and update the ref BEFORE any async operations
    hasInitializedRef.current = true;
    editIdRef.current = editId;
    
    const loadCourseForEdit = async () => {
      // DOUBLE CHECK: If editId changed between ref update and async execution, abort
      if (editIdRef.current !== editId) {
        return; // editId changed again, don't proceed
      }
      
      if (!editId) {
        // Creating new course
        // CRITICAL: Only reset when transitioning FROM editing TO creating new
        // NEVER reset if already creating new (previousEditId was also null)
        // This absolutely prevents reset during video uploads when user is creating new course
        if (previousEditId !== null) {
          // Transitioning from editing to new - reset form ONLY in this case
          setIsEditing(false);
          setEditingCourseId(null);
          setFormData({
            title: '',
            description: '',
            category: '',
            difficulty: '',
            duration: '',
            price: '',
            currency: 'USD',
            tags: [],
            instructorBio: '',
            metaTitle: '',
            metaDescription: '',
            slug: '',
            curriculum: [],
            supplyList: [],
            courseType: 'affiliate',
            externalUrl: '',
            hostingPlatform: '',
            isPublished: false,
            originalityDisclaimer: false,
          });
          setThumbnailFile(null);
          setThumbnailPreview(null);
          setTrailerFile(null);
          setTrailerPreviewUrl(null);
          setSlug('');
          setActiveStep('basics');
        }
        // If already creating new (previousEditId was null), do absolutely nothing - form stays intact
        return;
      }
      
      // Load existing course for editing
      // CRITICAL: Only load if editId actually changed from previous value
      // If we're already editing this course, don't reload (prevents overwriting user changes)
      if (editId && user && previousEditId !== editId) {
        setIsLoadingCourse(true);
        setIsEditing(true);
        setEditingCourseId(editId);
        try {
          const courseData = await getCourse(editId);
          if (courseData) {
            // Verify user owns the course
            if (courseData.instructor?.userId !== user.id) {
              toast({
                title: "Access Denied",
                description: "You can only edit your own courses.",
                variant: "destructive",
              });
              router.push('/learn');
              return;
            }

            // CRITICAL: Double-check editId hasn't changed during async operation
            // If it changed, don't overwrite form (user might have navigated away)
            if (editIdRef.current !== editId) {
              return; // editId changed, abort
            }

            // Populate form with course data ONLY when loading a different course
            setFormData({
              title: courseData.title || '',
              description: courseData.description || '',
              category: courseData.category || '',
              difficulty: courseData.difficulty || '',
              duration: courseData.duration || '',
              price: courseData.price?.toString() || '',
              currency: courseData.currency || 'USD',
              tags: courseData.tags || [],
              instructorBio: courseData.instructor?.bio || '',
              metaTitle: courseData.metaTitle || '',
              metaDescription: courseData.metaDescription || '',
              slug: courseData.slug || '',
              isPublished: courseData.isPublished || false, // Track if course is published
              curriculum: courseData.curriculum?.[0]?.lessons?.map((lesson: any, index: number) => ({
                id: lesson.id || `lesson-${index}`,
                title: lesson.title || '',
                description: lesson.description || '',
                type: lesson.type || 'video',
                duration: lesson.duration || '',
                videoUrl: lesson.videoUrl || '',
                content: lesson.content || '',
                order: index,
                isPreview: lesson.isPreview || false,
              })) || [],
              supplyList: courseData.supplyList || [],
              courseType: courseData.courseType || 'affiliate',
              externalUrl: courseData.externalUrl || '',
              hostingPlatform: courseData.hostingPlatform || '',
              // Reset originality disclaimer to false when editing (ensures compliance - user must re-confirm)
              originalityDisclaimer: false,
            });

            // Set preview URLs if they exist
            if (courseData.thumbnail) {
              setThumbnailPreview(courseData.thumbnail);
            }
            if (courseData.previewVideoUrl) {
              setTrailerPreviewUrl(courseData.previewVideoUrl);
            }

            setSlug(courseData.slug || '');
          }
        } catch (error) {
          console.error('Error loading course:', error);
          toast({
            title: "Error",
            description: "Failed to load course data.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingCourse(false);
        }
      }
    };

    if (user) {
      loadCourseForEdit();
    }
    // CRITICAL: Only depend on memoized editId, which only changes when actual editId changes
    // This absolutely prevents form reset when video uploads cause re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEditId, user]);

  // Load user's draft courses (unpublished)
  // Also filter out deleted courses
  const loadDrafts = async () => {
    if (!user) return;
    
    setLoadingDrafts(true);
    try {
      // First, try the optimized query
      let allDrafts: any[] = [];
      try {
        const draftsQuery = query(
          collection(db, 'courses'),
          where('instructor.userId', '==', user.id),
          where('isPublished', '==', false)
        );
        const snapshot = await getDocs(draftsQuery);
        allDrafts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (queryError: any) {
        console.warn('⚠️ Optimized query failed, trying fallback:', queryError);
        // Fallback: Get all courses for this user and filter client-side
        const fallbackQuery = query(
          collection(db, 'courses'),
          where('instructor.userId', '==', user.id)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        allDrafts = fallbackSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((course: any) => course.isPublished === false);
      }
      
      // Filter out deleted courses AND ensure we only show actual drafts (not published courses)
      // Also exclude courses that have ever been published (have publishedAt date) to prevent deleting published courses
      const drafts = allDrafts.filter((course: any) => {
        const notDeleted = !course.deleted;
        const isDraft = course.isPublished === false || course.isPublished === undefined;
        const neverPublished = !course.publishedAt; // If it has a publishedAt date, it was published at some point
        return notDeleted && isDraft && neverPublished; // Only show non-deleted, unpublished courses that were never published
      });
      
      // If no drafts found with optimized query, try fallback to catch any missed drafts
      if (drafts.length === 0 && allDrafts.length === 0) {
        try {
          const fallbackQuery = query(
            collection(db, 'courses'),
            where('instructor.userId', '==', user.id)
          );
          const fallbackSnapshot = await getDocs(fallbackQuery);
          const allUserCourses = fallbackSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          
          // Filter for actual drafts (isPublished === false, not deleted, never published)
          const actualDrafts = allUserCourses.filter((c: any) => {
            const isDraft = c.isPublished === false || c.isPublished === undefined;
            const notDeleted = !c.deleted;
            const neverPublished = !c.publishedAt; // If it has a publishedAt date, it was published at some point
            return isDraft && notDeleted && neverPublished;
          });
          
          if (actualDrafts.length > 0) {
            setMyDrafts(actualDrafts);
            return;
          }
        } catch (fallbackError) {
          // Silently fail fallback - optimized query result is primary
        }
      }
      
      setMyDrafts(drafts);
    } catch (error) {
      console.error('❌ Error loading drafts:', error);
      toast({
        title: "Error loading drafts",
        description: "Failed to load your saved drafts. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoadingDrafts(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, [user]);

  // Check Stripe connection status
  useEffect(() => {
    if (!user) return;
    
    const checkStripeStatus = async () => {
      try {
        const userDocRef = doc(db, 'userProfiles', user.id);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const hasStripe = !!userData.stripeAccountId;
          const isComplete = hasStripe && 
            userData.stripeOnboardingStatus === 'complete' &&
            userData.stripeChargesEnabled === true &&
            userData.stripePayoutsEnabled === true;
          
          setStripeStatus({ hasStripe, isComplete });
        } else {
          setStripeStatus({ hasStripe: false, isComplete: false });
        }
      } catch (error) {
        console.error('Error checking Stripe status:', error);
        setStripeStatus({ hasStripe: false, isComplete: false });
      }
    };
    
    checkStripeStatus();
  }, [user]);

  // Restore draft from localStorage (Kajabi-like autosave) and save to Firestore for cross-device
  // CRITICAL: Only restore draft ONCE on mount, not on every render
  const draftRestoredRef = useRef(false);
  useEffect(() => {
    // Only restore draft once, never overwrite existing form data
    if (draftRestoredRef.current) return;
    
    try {
      const draft = localStorage.getItem('soma-course-draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        // Only restore if form is truly empty (use setFormData callback to check current state)
        setFormData((prev) => {
          // Check if form is empty using current state (prev), not stale closure
          const formIsEmpty = !prev.title && !prev.description && prev.curriculum.length === 0 && !prev.category && !prev.difficulty;
          if (formIsEmpty) {
            // Always reset originalityDisclaimer to false when loading draft (should never be pre-checked)
            return { ...prev, ...parsed, originalityDisclaimer: false };
          }
          // Form has data, don't overwrite - return unchanged
          return prev;
        });
      }
      draftRestoredRef.current = true;
    } catch {}
    // Always reset isSubmitting to false on mount
    setIsSubmitting(false);
  }, []); // Empty deps - only run once on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        // Don't save originalityDisclaimer to draft (should always start unchecked)
        const draftData = { ...formData, originalityDisclaimer: false };
        localStorage.setItem('soma-course-draft', JSON.stringify(draftData));
        if (user) {
          setDoc(doc(db, 'courseDrafts', user.id), { formData: draftData, updatedAt: serverTimestamp() }, { merge: true }).catch(()=>{});
        }
      } catch {}
    }, 500);
    return () => clearTimeout(timeout);
  }, [formData]);

  // Auto-generate slug from title and validate (only for new courses)
  useEffect(() => {
    if (!isEditing) {
      const next = formData.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setSlug(next);
    }
  }, [formData.title, isEditing]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!slug) { setIsSlugUnique(true); return; }
      try {
        const q = query(collection(db, 'courses'), where('slug', '==', slug));
        const snap = await getDocs(q);
        if (!cancelled) {
          // If editing, allow the same slug for the current course
          if (isEditing && editingCourseId) {
            const matchingDocs = snap.docs.filter(doc => doc.id !== editingCourseId);
            setIsSlugUnique(matchingDocs.length === 0);
          } else {
            setIsSlugUnique(snap.empty);
          }
        }
      } catch {
        if (!cancelled) setIsSlugUnique(true);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [slug, isEditing, editingCourseId]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size before setting (Cloudflare Images limit: 20MB)
      const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB in bytes
      if (file.size > MAX_IMAGE_SIZE) {
        toast({
          title: "Thumbnail Too Large",
          description: `Your thumbnail image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 20MB. Please compress the image or use a smaller file.`,
          variant: "destructive",
        });
        // Clear the file and reset the input
        setThumbnailFile(null);
        setThumbnailPreview(null);
        event.target.value = '';
        return;
      }
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
    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
  };

  const handleRemoveTrailer = () => {
    setTrailerFile(null);
    setTrailerPreviewUrl(null);
    // Reset the file input
    const input = document.getElementById('trailer-upload') as HTMLInputElement;
    if (input) {
      input.value = '';
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



  // AI tag generation function
  const generateAITags = async () => {
    if (!formData.title || (!formData.description && !tagKeywords.trim())) {
      toast({
        title: "Missing Information",
        description: "Please provide a course title and either a description or keywords to generate tags.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingTags(true);
    try {
      // Extract keywords from the keywords field (comma or space separated)
      const keywordTags = tagKeywords.trim()
        .split(/[,\s]+/)
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 2);

      // Mock AI tag generation - in production, this would call an AI service
      const mockTags = [
        formData.category?.toLowerCase(),
        formData.difficulty?.toLowerCase(),
        ...(formData.title ? formData.title.toLowerCase().split(' ').filter(word => word.length > 3) : []),
        ...(formData.description ? formData.description.toLowerCase().split(' ').filter(word => 
          word.length > 4 && 
          !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'there', 'could', 'other', 'after', 'first', 'well', 'also', 'where', 'much', 'some', 'these', 'would', 'into', 'has', 'more', 'very', 'what', 'know', 'just', 'like', 'over', 'also', 'back', 'here', 'through', 'when', 'much', 'before', 'right', 'should', 'because', 'each', 'which', 'their', 'said', 'them', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'].includes(word)
        ).slice(0, 5) : []),
        ...keywordTags // Add user-provided keywords
      ].filter((tag, index, arr) => tag && arr.indexOf(tag) === index).slice(0, 10);

      setSuggestedTags(mockTags);
      
      toast({
        title: "Tags Generated",
        description: `${mockTags.length} suggested tags generated based on your course information${tagKeywords.trim() ? ' and keywords' : ''}.`
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

  const addLesson = async () => {
    if (!lessonFormData.title.trim()) {
      toast({
        title: "Lesson title required",
        description: "Please enter a title for this lesson.",
        variant: "destructive",
      });
      return;
    }

    if (!lessonFormData.videoFile) {
      toast({
        title: "Video file required",
        description: "Please upload a video file for this lesson.",
        variant: "destructive",
      });
      return;
    }

    let videoUrl = '';
    let thumbnailUrl = '';
    
    // Upload video file to Cloudflare Stream (NO Firebase Storage)
    setUploadingVideo(true);
    try {
      if (!user) throw new Error('User not authenticated');
      
      // Use Cloudflare Stream for video uploads
      const { uploadMedia } = await import('@/lib/media-upload-v2');
      const uploadResult = await uploadMedia(lessonFormData.videoFile, 'video', user.id);
      videoUrl = uploadResult.url;
      thumbnailUrl = uploadResult.thumbnailUrl || '';
      
      toast({
        title: "Video uploaded",
        description: "Your video has been uploaded successfully.",
      });
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload video. Please try again.",
        variant: "destructive",
      });
      setUploadingVideo(false);
      return;
    }
    setUploadingVideo(false);

    setFormData(prev => {
      const lessonOrder = prev.curriculum.length + 1;
      return {
      ...prev,
      curriculum: [
        ...prev.curriculum,
          {
            id: `${Date.now()}`,
            title: lessonFormData.title.trim(),
            ...(lessonFormData.notes.trim() ? { description: lessonFormData.notes.trim() } : {}),
            type: 'video' as const,
            ...(lessonFormData.duration.trim() ? { duration: lessonFormData.duration.trim() } : {}),
            videoUrl: videoUrl,
            ...(lessonFormData.notes.trim() ? { content: lessonFormData.notes.trim() } : {}),
            order: lessonOrder,
            isPreview: prev.curriculum.length === 0 // First lesson is preview
          }
        ]
      };
    });

    // Reset form
    setLessonFormData({ title: '', duration: '', notes: '', videoFile: null });
  };

  const removeLesson = (lessonId: string) => {
    setFormData(prev => ({
      ...prev,
      curriculum: prev.curriculum
        .filter(l => l.id !== lessonId)
        .map((l, idx) => ({ ...l, order: idx + 1 })) // Renumber lessons
    }));
  };

  const addSupplyItem = () => {
    if (!newSupplyItem.trim() || !newSupplyBrand.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both item name and brand.",
        variant: "destructive",
      });
      return;
    }
    setFormData(prev => ({
      ...prev,
      supplyList: [
        ...prev.supplyList,
        { 
          id: `${Date.now()}`, 
          item: newSupplyItem.trim(), 
          brand: newSupplyBrand.trim(),
          ...(newSupplyAffiliateLink.trim() ? { affiliateLink: newSupplyAffiliateLink.trim() } : {})
        }
      ]
    }));
    setNewSupplyItem('');
    setNewSupplyBrand('');
    setNewSupplyAffiliateLink('');
  };

  const removeSupplyItem = (supplyId: string) => {
    setFormData(prev => ({ ...prev, supplyList: prev.supplyList.filter(s => s.id !== supplyId) }));
  };

  const handleSubmit = async (e: React.FormEvent, skipValidation: boolean = false, shouldRedirect: boolean = true, isSaveChangesOnly: boolean = false) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit a course.",
        variant: "destructive",
      });
      return;
    }

    // CRITICAL: Determine if we're publishing based on current step
    // If skipValidation is true (Save Draft button), NEVER publish
    const isPublishing = activeStep === 'publish' && !skipValidation;

    // Determine if we're saving a draft vs updating a published course
    // isSavingDraft is ONLY true when:
    // 1. skipValidation is true AND we're creating a new course (not editing), OR
    // 2. skipValidation is true AND we're editing AND the course is NOT published (actual draft)
    // "Save Changes" (isSaveChangesOnly=true) is NEVER saving a draft - it's just updating amendments
    // CRITICAL: If editing a published course (formData.isPublished=true), NEVER treat it as a draft save
    const isSavingDraft = skipValidation && !isSaveChangesOnly && (
      !isEditing || // New course being saved as draft
      (isEditing && !formData.isPublished) // Editing an unpublished course (actual draft)
    );

    // Skip Stripe check for draft saves (user is just saving work in progress)
    if (!isSavingDraft) {
      // Check Stripe connection before allowing course submission (only for publishing/submitting)
      if (!stripeStatus?.isComplete) {
        toast({
          title: "Stripe connection required",
          description: "Please connect your Stripe account in Settings → Business before submitting a course. This is required to receive payments for course sales.",
          variant: "destructive",
          duration: 10000,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/settings?tab=business')}
            >
              Go to Settings
            </Button>
          )
        });
        return;
      }
    }
    
    
    // Skip validation entirely for "Save Changes" button
    if (!isSavingDraft) {
      // Full validation only for publishing or creating new course
      const requiredFields = ['title', 'description', 'category', 'difficulty', 'duration', 'price', 'instructorBio', 'originalityDisclaimer'];
      
      // For hosted courses, validate curriculum
      if (formData.courseType === 'hosted') {
        if (formData.curriculum.length === 0) {
          toast({
            title: "Lessons required",
            description: "Please add at least one lesson for hosted courses.",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Better validation: check if field is actually empty (not just falsy)
      // Handle Select component values and strings properly
      const missingFields = requiredFields.filter(field => {
        const value = formData[field as keyof typeof formData];
        
        // Handle price specially (allow 0, but not empty string)
        if (field === 'price') {
          // Price can be 0, so only check for undefined, null, or empty string
          if (typeof value === 'number' && value === 0) return false; // 0 is valid
          if (typeof value === 'string' && value === '0') return false; // '0' is valid
          return value === undefined || value === null || value === '';
        }
        
        // Handle boolean (originalityDisclaimer) - must be explicitly true
        if (field === 'originalityDisclaimer') {
          return value !== true;
        }
        
        // Handle string fields (trim whitespace and check if empty)
        // Convert to string first in case it's a number or other type
        if (typeof value === 'string' || (value !== null && value !== undefined)) {
          const stringValue = String(value).trim();
          // Empty string after trimming means missing
          return stringValue === '';
        }
        
        // Handle arrays
        if (Array.isArray(value)) {
          return (value as any[]).length === 0;
        }
        
        // Handle null/undefined
        return value === undefined || value === null;
      });
      
      if (missingFields.length > 0) {
        toast({
          title: "Missing Information",
          description: `Please fill in all required fields. Missing: ${missingFields.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Validate originality disclaimer
      if (!formData.originalityDisclaimer) {
        toast({
          title: "Originality Confirmation Required",
          description: "Please confirm that this is your own original work and that AI has not been used.",
          variant: "destructive",
        });
        return;
      }
    } else {
      console.log('✅ Skipping validation for draft save');
    }

    // For editing, thumbnail is optional if preview exists
    if (!isEditing && !thumbnailFile) {
      toast({
        title: "Thumbnail Required",
        description: "Please upload a course thumbnail image.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // For editing mode, fetch existing course data first
      let existingCourse: any = null;
      if (isEditing && editingCourseId) {
        try {
          existingCourse = await getCourse(editingCourseId);
        } catch (error) {
          console.error('Error fetching existing course:', error);
        }
      }

      // Upload thumbnail (only if new file provided) - Use Cloudflare Images (NO Firebase Storage)
      let thumbnailUrl: string | undefined;
      if (thumbnailFile) {
        // Validate file size before upload (Cloudflare Images limit: 20MB)
        const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB in bytes
        if (thumbnailFile.size > MAX_IMAGE_SIZE) {
          toast({
            title: "File Too Large",
            description: `Thumbnail image is too large (${(thumbnailFile.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 20MB. Please compress the image or use a smaller file.`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        try {
          const { uploadMedia } = await import('@/lib/media-upload-v2');
          const thumbnailResult = await uploadMedia(thumbnailFile, 'image', user.id);
          thumbnailUrl = thumbnailResult.url;
        } catch (error: any) {
          console.error('Error uploading thumbnail:', error);
          const errorMessage = error.message || 'Unknown error';
          const isSizeError = errorMessage.includes('size limit') || errorMessage.includes('too large') || errorMessage.includes('413');
          
          toast({
            title: isSizeError ? "Thumbnail Too Large" : "Thumbnail Upload Failed",
            description: isSizeError 
              ? `Your thumbnail image is too large (${thumbnailFile ? `${(thumbnailFile.size / 1024 / 1024).toFixed(1)}MB` : 'over 20MB'}). Maximum size is 20MB. Please compress the image or use a smaller file.`
              : (errorMessage || `Failed to upload thumbnail. Please ensure the image is under 20MB and try again.`),
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      } else if (isEditing && thumbnailPreview) {
        // Keep existing thumbnail if no new one uploaded
        thumbnailUrl = thumbnailPreview;
      }

      // Upload optional trailer - Use Cloudflare Stream (NO Firebase Storage)
      let trailerUrl: string | undefined;
      if (trailerFile) {
        // Note: Cloudflare Stream doesn't have a strict size limit, but very large files may timeout
        // We'll let the upload proceed and handle errors from the API
        try {
          const { uploadMedia } = await import('@/lib/media-upload-v2');
          const trailerResult = await uploadMedia(trailerFile, 'video', user.id);
          trailerUrl = trailerResult.url;
        } catch (error: any) {
          console.error('Error uploading trailer:', error);
          toast({
            title: "Trailer Upload Failed",
            description: error.message || "Failed to upload trailer video. Please try again or use a smaller file.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      } else if (isEditing && existingCourse?.previewVideoUrl && trailerPreviewUrl) {
        // Editing mode: keep existing trailer if:
        // 1. Course had a previewVideoUrl originally
        // 2. trailerPreviewUrl still exists (user didn't remove it)
        // This preserves the existing trailer when editing other fields
        trailerUrl = trailerPreviewUrl;
      }
      // If trailerPreviewUrl is null/undefined (user clicked Remove), trailerUrl stays undefined (trailer will be removed)

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
        credentials: '',
        specialties: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validate course link requirements
      if (formData.courseType === 'affiliate') {
        if (!formData.externalUrl.trim()) {
          toast({
            title: "External URL Required",
            description: "Please provide the external URL where your course is hosted.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        if (!formData.hostingPlatform) {
          toast({
            title: "Platform Required",
            description: "Please select the platform where your course is hosted.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Create course data
      const courseData: any = {
        title: formData.title,
        description: formData.description,
        instructor: instructorData,
        thumbnail: thumbnailUrl,
        ...(trailerUrl ? { previewVideoUrl: trailerUrl } : {}),
        price: parseFloat(formData.price) || 0,
        currency: formData.currency || 'USD',
        category: formData.category,
        supplyList: formData.supplyList,
        difficulty: formData.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
        duration: formData.duration,
        format: 'Self-Paced' as const,
        lessons: formData.courseType === 'hosted' ? formData.curriculum.length : 0,
        tags: formData.tags,
        skills: [],
        curriculum: formData.courseType === 'hosted' ? [{
          week: 1, // Required by type, but not displayed
          title: 'Lessons',
          description: '',
          lessons: formData.curriculum.map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            type: lesson.type,
            duration: lesson.duration,
            videoUrl: lesson.videoUrl,
            content: lesson.content,
            order: lesson.order,
            isPreview: lesson.isPreview
          }))
        }] : [],
        courseType: formData.courseType,
        ...(formData.courseType === 'affiliate' && formData.externalUrl.trim() ? { externalUrl: formData.externalUrl.trim() } : {}),
        ...(formData.courseType === 'affiliate' && formData.hostingPlatform ? { hostingPlatform: formData.hostingPlatform } : {}),
        updatedAt: new Date(),
      };

      if (isEditing && editingCourseId && existingCourse) {
        // Update existing course - ALWAYS use formData values first, fallback to existingCourse only if formData is missing
        // This ensures user edits are saved
        const updateData: any = {
          // ALWAYS use formData values - these are what the user entered/edited
          title: formData.title !== undefined && formData.title !== null && formData.title !== '' 
            ? formData.title 
            : existingCourse.title,
          description: formData.description !== undefined && formData.description !== null && formData.description !== '' 
            ? formData.description 
            : existingCourse.description,
          category: formData.category || existingCourse.category,
          difficulty: formData.difficulty || existingCourse.difficulty,
          duration: formData.duration || existingCourse.duration,
          price: formData.price !== undefined && formData.price !== null && formData.price !== '' 
            ? parseFloat(formData.price) 
            : existingCourse.price || 0,
          currency: formData.currency || existingCourse.currency || 'USD',
          tags: formData.tags && formData.tags.length > 0 ? formData.tags : (existingCourse.tags || []),
          supplyList: formData.supplyList && formData.supplyList.length > 0 ? formData.supplyList : (existingCourse.supplyList || []),
          courseType: formData.courseType || existingCourse.courseType || 'hosted',
          // Update instructor bio if provided
          instructor: {
            ...existingCourse.instructor,
            bio: formData.instructorBio !== undefined && formData.instructorBio !== null && formData.instructorBio !== '' 
              ? formData.instructorBio 
              : (existingCourse.instructor?.bio || ''),
          },
          // Preserve existing stats and metadata (these don't come from form)
          students: existingCourse.students || 0,
          rating: existingCourse.rating || 0,
          reviewCount: existingCourse.reviewCount || 0,
          isOnSale: existingCourse.isOnSale || false,
          isNew: existingCourse.isNew || false,
          isFeatured: existingCourse.isFeatured || false,
          // No admin approval needed - courses are immediately published when submitted
          status: 'approved' as const,
          // CRITICAL: 
          // - When isSaveChangesOnly=true ("Save Changes" button), ALWAYS preserve existing isPublished state - NEVER change it
          // - When skipValidation=true AND NOT isSaveChangesOnly (Save Draft), ALWAYS set isPublished to false ONLY if course was never published
          // - When isPublishing=true (publishing from publish step), set to true
          // - NEVER allow a published course to be saved as a draft
          isPublished: isSaveChangesOnly 
            ? (existingCourse.isPublished || false) // "Save Changes" ALWAYS preserves published state - never changes it
            : (existingCourse.isPublished ? existingCourse.isPublished : (skipValidation ? false : (isPublishing ? true : (existingCourse.isPublished || false)))), // If course is published, preserve it. If draft, allow draft save.
          reviews: existingCourse.reviews || [],
          discussions: existingCourse.discussions || [],
          enrollmentCount: existingCourse.enrollmentCount || 0,
          completionRate: existingCourse.completionRate || 0,
          createdAt: existingCourse.createdAt || new Date(),
          updatedAt: new Date(), // Always update the updatedAt timestamp
        };
        
        // Update thumbnail if provided
        if (thumbnailUrl) {
          updateData.thumbnail = thumbnailUrl;
        } else if (existingCourse.thumbnail) {
          updateData.thumbnail = existingCourse.thumbnail;
        }
        
        // Update preview video if provided
        if (trailerUrl !== undefined) {
          if (trailerUrl) {
            updateData.previewVideoUrl = trailerUrl;
          } else {
            // If trailerUrl is explicitly null/empty, remove it
            updateData.previewVideoUrl = null;
          }
        } else if (existingCourse.previewVideoUrl) {
          updateData.previewVideoUrl = existingCourse.previewVideoUrl;
        }
        
        // Update curriculum for hosted courses
        if (formData.courseType === 'hosted' && formData.curriculum && formData.curriculum.length > 0) {
          updateData.lessons = formData.curriculum.length;
          updateData.curriculum = [{
            week: 1,
            title: 'Lessons',
            description: '',
            lessons: formData.curriculum.map(lesson => ({
              id: lesson.id,
              title: lesson.title,
              description: lesson.description,
              type: lesson.type,
              duration: lesson.duration,
              videoUrl: lesson.videoUrl,
              content: lesson.content,
              order: lesson.order,
              isPreview: lesson.isPreview
            }))
          }];
        }
        
        // Handle affiliate course fields
        if (formData.courseType === 'affiliate') {
          if (formData.externalUrl) {
            updateData.externalUrl = formData.externalUrl.trim();
          }
          if (formData.hostingPlatform) {
            updateData.hostingPlatform = formData.hostingPlatform;
          }
        }
        
          // Set publishedAt when publishing (if not already set), or preserve existing if already published
          if (isPublishing) {
            // When publishing, set publishedAt to now if not already set
            updateData.publishedAt = existingCourse.publishedAt || new Date();
          } else if (existingCourse.publishedAt !== undefined) {
            // When saving draft, preserve existing publishedAt if it exists
            updateData.publishedAt = existingCourse.publishedAt;
          }

        console.log('📝 Updating course:', editingCourseId);
        console.log('📝 Form data:', {
          title: formData.title,
          description: formData.description,
          category: formData.category,
        });
        console.log('📝 Update data being sent:', {
          title: updateData.title,
          description: updateData.description,
          category: updateData.category,
        });
        
        await updateCourse(editingCourseId, updateData);
        
        console.log('✅ Course update completed', { isPublishing, isPublished: updateData.isPublished });

        // Determine correct message - check if course is actually published
        // existingCourse is available here since we fetched it earlier
        const courseIsPublished = existingCourse?.isPublished ?? updateData.isPublished ?? formData.isPublished;
        const isActuallyDraft = !courseIsPublished;
        const isUpdatingPublished = courseIsPublished && !isPublishing;
        
        // For "Save Changes" (isSaveChangesOnly=true), always show "Changes Saved" regardless of published status
        const toastTitle = isSaveChangesOnly 
          ? "Changes Saved"
          : (isSavingDraft && isActuallyDraft 
            ? "Draft Saved" 
            : isPublishing 
              ? "Course Published" 
              : isUpdatingPublished
                ? "Changes Saved"
                : "Course Updated");
        
        const toastDescription = isSaveChangesOnly
          ? "Your changes have been saved."
          : (isSavingDraft && isActuallyDraft
            ? "Your draft has been saved. You can continue editing later." 
            : isPublishing 
              ? "Your course has been published and is now live!" 
              : isUpdatingPublished
                ? "Your changes have been saved. The course remains published."
                : "Your course has been updated successfully.");
        
        toast({
          title: toastTitle,
          description: toastDescription,
        });

        // Only reload drafts list if we're NOT just saving changes (Save Changes button)
        // "Save Changes" should NOT add course back to drafts - it's just updating amendments
        if (!isSaveChangesOnly) {
          await loadDrafts();
        }

        // Only redirect if shouldRedirect parameter is true (final submit, not intermediate save)
        // "Save Changes" never redirects (shouldRedirect=false)
        if (shouldRedirect && shouldRedirectAfterSave) {
          router.push(`/learn/${editingCourseId}`);
        }
      } else {
        // Create new course
        const newCourseData = {
          ...courseData,
          students: 0,
          lessons: formData.courseType === 'hosted' ? formData.curriculum.length : 0,
          rating: 0,
          reviewCount: 0,
          isOnSale: false,
          isNew: true,
          isFeatured: false,
          // No admin approval needed - courses are immediately published when submitted
          status: 'approved' as const,
          // CRITICAL: When saving draft (skipValidation=true), ALWAYS set isPublished to false
          // When publishing (activeStep='publish' AND not skipping validation), set to true
          isPublished: skipValidation ? false : (activeStep === 'publish' ? true : false),
          ...(isPublishing && !isSavingDraft ? { publishedAt: new Date() } : {}), // Add publishedAt when published (not draft)
          reviews: [],
          discussions: [],
          enrollmentCount: 0,
          completionRate: 0,
          createdAt: new Date(),
        };

        await createCourse(newCourseData);

        // Reload drafts after creating (only if it's a draft)
        if (skipValidation || !isPublishing) {
          // Delay to ensure Firestore has processed the write
          setTimeout(async () => {
            await loadDrafts();
          }, 1500);
        }

        toast({
          title: isSavingDraft ? "Draft Saved" : (isPublishing ? "Course Published" : "Course Created"),
          description: isSavingDraft 
            ? "Your course has been saved as a draft. You can continue editing and publish it when ready. Find it in the 'Saved Drafts' section above." 
            : isPublishing
              ? "Your course has been published and is now live!"
              : "Your course has been created. Publish it from the Publish step when ready.",
        });

        // Reload drafts after creating (only if it's a draft)
        if (skipValidation || !isPublishing) {
          setTimeout(async () => {
            await loadDrafts();
          }, 1500);
        }
      }

      // Clear draft data after successful submission (only for new courses)
      if (!isEditing) {
        try {
          localStorage.removeItem('soma-course-draft');
          if (user) {
            const draftRef = doc(db, 'courseDrafts', user.id);
            await setDoc(draftRef, { formData: null }, { merge: true });
          }
        } catch {        }
      }

      // Only redirect if creating new course AND not saving as draft, not when editing
      // When saving draft, user stays on page to continue editing
      if (!isEditing && !isSavingDraft) {
        router.push('/profile');
      }

    } catch (error: any) {
      console.error('Error submitting course:', error);
      
      // Check if error is related to file size and identify which file
      const errorMessage = error?.message || '';
      const isSizeError = errorMessage.includes('size limit') || errorMessage.includes('too large') || errorMessage.includes('413') || errorMessage.includes('Payload Too Large') || errorMessage.includes('exceeded');
      
      let title = "Submission Failed";
      let description = "Failed to submit course. Please try again.";
      
      if (isSizeError) {
        // Determine which file is too large based on error message and context
        if (errorMessage.includes('image') || errorMessage.includes('thumbnail') || thumbnailFile) {
          title = "Thumbnail Too Large";
          const fileSize = thumbnailFile ? `${(thumbnailFile.size / 1024 / 1024).toFixed(1)}MB` : 'over 20MB';
          description = `Your thumbnail image is too large (${fileSize}). Maximum size is 20MB. Please compress the image or use a smaller file.`;
        } else if (errorMessage.includes('video') || errorMessage.includes('trailer') || trailerFile) {
          title = "Trailer Too Large";
          const fileSize = trailerFile ? `${(trailerFile.size / 1024 / 1024).toFixed(1)}MB` : 'too large';
          description = `Your trailer video is too large (${fileSize}). Please compress the video or use a smaller file.`;
        } else {
          title = "File Too Large";
          description = errorMessage || "One of your files is too large. Please check thumbnail (max 20MB) and trailer file sizes.";
        }
      } else if (errorMessage) {
        description = errorMessage;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      // Reset redirect flag for next save
      setShouldRedirectAfterSave(true);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-5xl">
      <Button variant="outline" onClick={() => router.back()} className="mb-4 sm:mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">Back</span>
      </Button>

      {/* Stripe Connection Warning */}
      {stripeStatus && !stripeStatus.isComplete && (
        <Alert className="mb-6 border-amber-500 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-500">Stripe Connection Required</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              You must connect your Stripe account before you can submit a course. 
              This is required to receive payments for course sales.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/settings?tab=business')}
              className="mt-2"
            >
              Connect Stripe Account
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Saved Drafts Section - Always visible and prominent */}
      <Card className="mb-6 border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Saved Drafts
                {myDrafts.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {myDrafts.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {myDrafts.length > 0 
                  ? "Your unpublished courses. Click to continue editing."
                  : "You don't have any saved drafts yet. Create a new course and save it as a draft."
                }
              </CardDescription>
            </div>
            {myDrafts.length > 0 && (
              <Button
                variant="outline"
                onClick={loadDrafts}
                disabled={loadingDrafts}
                size="sm"
              >
                {loadingDrafts ? "Refreshing..." : "Refresh"}
              </Button>
            )}
          </div>
        </CardHeader>
        {myDrafts.length > 0 ? (
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="group relative overflow-hidden rounded-lg border-2 hover:border-primary transition-all hover:shadow-lg"
                >
                  <button
                    onClick={() => router.push(`/learn/submit?edit=${draft.id}`)}
                    className="w-full text-left"
                  >
                    <div className="aspect-video bg-muted relative">
                      {draft.thumbnail ? (
                        <img 
                          src={draft.thumbnail} 
                          alt={draft.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-xs font-semibold">
                          Draft
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors mb-2">
                        {draft.title || 'Untitled Course'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Last updated {new Date(draft.updatedAt?.toDate?.() || draft.updatedAt || draft.createdAt?.toDate?.() || draft.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                  {!draft.isPublished && !draft.publishedAt && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        
                        // CRITICAL: Triple-check that this course was NEVER published before allowing deletion
                        try {
                          const courseData = await getCourse(draft.id);
                          
                          // Check 1: Is it currently published?
                          if (courseData?.isPublished) {
                            toast({
                              title: "Cannot Delete Published Course",
                              description: "This course is currently published. Please unpublish it first before deleting.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Check 2: Was it ever published? (has publishedAt date)
                          if (courseData?.publishedAt) {
                            toast({
                              title: "Cannot Delete Previously Published Course",
                              description: "This course was previously published. To prevent accidental deletion of published content, please contact support if you need to delete it.",
                              variant: "destructive",
                            });
                            return;
                          }
                        } catch (error) {
                          console.error('Error checking course status:', error);
                          toast({
                            title: "Error",
                            description: "Unable to verify course status. Deletion cancelled for safety.",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        if (confirm(`Are you sure you want to permanently delete "${draft.title || 'Untitled Course'}"? This action cannot be undone.`)) {
                          try {
                            // FINAL check before deletion - fetch fresh data
                            const courseData = await getCourse(draft.id);
                            
                            // Final verification: Is it published or was it ever published?
                            if (courseData?.isPublished || courseData?.publishedAt) {
                              toast({
                                title: "Deletion Blocked",
                                description: "This course cannot be deleted because it is or was published. This prevents accidental deletion of published content.",
                                variant: "destructive",
                              });
                              return;
                            }
                            
                            await deleteCourse(draft.id);
                            await loadDrafts(); // Refresh the drafts list
                            toast({
                              title: "Draft Deleted",
                              description: "The draft has been permanently deleted.",
                            });
                          } catch (error) {
                            console.error('Error deleting draft:', error);
                            toast({
                              title: "Deletion Failed",
                              description: "Failed to delete the draft. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No saved drafts yet.</p>
              <p className="text-sm mt-2">Start creating a course below and save it as a draft.</p>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-6">
        {/* Sidebar Steps */}
        <div className="md:col-span-2 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isEditing ? 'Edit Course' : 'Create Course'}</CardTitle>
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
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  disabled={isSubmitting || !user || (isEditing && formData.isPublished)}
                  onClick={(e) => {
                    e.preventDefault();
                    // CRITICAL: Prevent saving published courses as drafts
                    if (isEditing && formData.isPublished) {
                      toast({
                        title: "Cannot Save Draft",
                        description: "Published courses cannot be saved as drafts. Use 'Save Changes' to update published courses.",
                        variant: "destructive",
                      });
                      return;
                    }
                    // Save draft: Set redirect to false and call handleSubmit with skipValidation
                    setShouldRedirectAfterSave(false);
                    const syntheticEvent = {
                      preventDefault: () => {},
                      currentTarget: e.currentTarget.closest('form') || e.currentTarget,
                      target: e.target,
                    } as React.FormEvent<HTMLFormElement>;
                    handleSubmit(syntheticEvent, true, false, false); // skipValidation = true, shouldRedirect = false, isSaveChangesOnly = false (this IS a draft save)
                  }}
                >
                  <Save className="h-4 w-4 mr-2" /> 
                  {isSubmitting ? 'Saving Draft...' : 'Save Draft'}
                </Button>
                {isEditing && formData.isPublished && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Published courses cannot be saved as drafts. Use "Save Changes" instead.
                  </p>
                )}
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
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-6">
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
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what students will learn in this course"
                  rows={6}
                  required
                />
              </div>

              {/* Course Type Selection */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label>Course Hosting Type *</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose how your course will be delivered to students.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="course-type-affiliate"
                      name="course-type"
                      value="affiliate"
                      checked={formData.courseType === 'affiliate'}
                      onChange={(e) => {
                        handleInputChange('courseType', e.target.value as 'hosted' | 'affiliate');
                        if (e.target.value === 'hosted') {
                          handleInputChange('externalUrl', '');
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="course-type-affiliate" className="font-normal cursor-pointer flex-1">
                      <div>
                        <div className="font-medium">Course link</div>
                        <div className="text-xs text-muted-foreground">
                          Your course is hosted elsewhere (YouTube, Teachable, your website, etc.). 
                          Students will be redirected to your external URL after payment.
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="course-type-hosted"
                      name="course-type"
                      value="hosted"
                      checked={formData.courseType === 'hosted'}
                      onChange={(e) => {
                        handleInputChange('courseType', e.target.value as 'hosted' | 'affiliate');
                        if (e.target.value === 'hosted') {
                          handleInputChange('externalUrl', '');
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="course-type-hosted" className="font-normal cursor-pointer flex-1">
                      <div>
                        <div className="font-medium">Hosted Course (On Platform)</div>
                        <div className="text-xs text-muted-foreground">
                          Your course will be hosted directly on Gouache. You&apos;ll upload videos and content in the curriculum step.
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
                
                {/* External URL Input for Course Links */}
                {formData.courseType === 'affiliate' && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hostingPlatform">Course Platform *</Label>
                      <Select 
                        value={formData.hostingPlatform} 
                        onValueChange={(value) => handleInputChange('hostingPlatform', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="teachable">Teachable</SelectItem>
                          <SelectItem value="thinkific">Thinkific</SelectItem>
                          <SelectItem value="udemy">Udemy</SelectItem>
                          <SelectItem value="skillshare">Skillshare</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="vimeo">Vimeo</SelectItem>
                          <SelectItem value="patreon">Patreon</SelectItem>
                          <SelectItem value="custom">Custom Website</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select the platform where your course is hosted. This helps us provide better guidance.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="externalUrl">Course Link *</Label>
                      <Input
                        id="externalUrl"
                        type="url"
                        value={formData.externalUrl}
                        onChange={(e) => handleInputChange('externalUrl', e.target.value)}
                        placeholder={
                          formData.hostingPlatform === 'teachable' 
                            ? "https://your-school.teachable.com/p/course-name"
                            : formData.hostingPlatform === 'thinkific'
                            ? "https://your-school.thinkific.com/courses/course-name"
                            : formData.hostingPlatform === 'youtube'
                            ? "https://youtube.com/playlist?list=..."
                            : "https://your-course-platform.com/course-name"
                        }
                        required
                      />
                      <div className="text-xs text-muted-foreground space-y-1">
                        {formData.hostingPlatform === 'teachable' && (
                          <p>💡 <strong>Tip:</strong> Use your Teachable enrollment link (found in course settings → Enrollment Links) for automatic enrollment.</p>
                        )}
                        {formData.hostingPlatform === 'thinkific' && (
                          <p>💡 <strong>Tip:</strong> Use your Thinkific enrollment link or affiliate link for best results.</p>
                        )}
                        {formData.hostingPlatform === 'youtube' && (
                          <p>⚠️ <strong>Note:</strong> YouTube links are public. Consider using a private platform for paid courses.</p>
                        )}
                        {formData.hostingPlatform === 'custom' && (
                          <p>💡 <strong>Tip:</strong> Ensure your link automatically grants access after payment, or provide access codes if needed.</p>
                        )}
                        <p className="mt-2">Students will be redirected to this URL after successful payment.</p>
                      </div>
                    </div>
                  </div>
                )}
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
                            PNG, JPG up to 20MB
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
                  <Select 
                    value={formData.category || undefined} 
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {COURSE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty *</Label>
                  <Select 
                    value={formData.difficulty || undefined} 
                    onValueChange={(value) => handleInputChange('difficulty', value)}
                  >
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
              </div>
            </div>
                  </>
                )}

                {activeStep === 'curriculum' && (
                  <div className="space-y-4">
                    {formData.courseType === 'affiliate' ? (
                      <div className="p-6 border rounded-lg bg-muted/30 text-center">
                        <p className="text-muted-foreground">
                          Curriculum building is not required for course links. 
                          Your course content is hosted externally at the URL you provided.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          You can skip this step and proceed to pricing.
                        </p>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold">Curriculum Builder</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Add lessons to your course. Upload videos and add optional notes.
                        </p>

                        {/* Add Lesson Form */}
                        <div className="mb-6 p-4 border rounded-lg bg-muted/30 space-y-4">
                          <div className="space-y-2">
                            <Label>Lesson Title *</Label>
                            <Input
                              placeholder="Enter lesson title"
                              value={lessonFormData.title}
                              onChange={(e) => setLessonFormData(prev => ({ ...prev, title: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Video File *</Label>
                            <Input
                              type="file"
                              accept="video/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0] || null;
                                if (file) {
                                  try {
                                    const duration = await getVideoDuration(file);
                                    setLessonFormData(prev => ({
                                      ...prev,
                                      videoFile: file,
                                      duration: duration
                                    }));
                                  } catch (error) {
                                    console.error('Error extracting video duration:', error);
                                    setLessonFormData(prev => ({
                                      ...prev,
                                      videoFile: file,
                                      duration: ''
                                    }));
                                  }
                                } else {
                                  setLessonFormData(prev => ({
                                    ...prev,
                                    videoFile: null,
                                    duration: ''
                                  }));
                                }
                              }}
                              className="text-sm"
                            />
                            {lessonFormData.videoFile && (
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>Selected: {lessonFormData.videoFile.name}</p>
                                {lessonFormData.duration && (
                                  <p className="text-primary font-medium">Duration: {lessonFormData.duration}</p>
                                )}
                          </div>
                            )}
                        </div>
                          <div className="space-y-2">
                            <Label>Notes (Optional)</Label>
                            <Textarea
                              placeholder="Add notes or additional information that will display alongside the video"
                              value={lessonFormData.notes}
                              onChange={(e) => setLessonFormData(prev => ({ ...prev, notes: e.target.value }))}
                              rows={4}
                            />
                            <p className="text-xs text-muted-foreground">
                              These notes will be displayed alongside the video in the course player.
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={addLesson}
                            size="sm"
                            disabled={uploadingVideo || !lessonFormData.title.trim()}
                          >
                            {uploadingVideo ? (
                              <>Uploading...</>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Lesson
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Lessons List */}
                        <div className="space-y-2">
                          {formData.curriculum.length === 0 && (
                            <div className="p-6 border rounded-lg text-center text-muted-foreground">
                              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No lessons added yet. Add your first lesson above.</p>
                            </div>
                          )}
                          {formData.curriculum
                            .sort((a, b) => a.order - b.order)
                            .map((lesson) => (
                              <div
                            key={lesson.id}
                                className="flex items-center justify-between rounded-md border p-3"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{lesson.title}</span>
                                      {lesson.isPreview && (
                                        <Badge variant="secondary" className="text-xs">Preview</Badge>
                                      )}
                            </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      {lesson.duration && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {lesson.duration}
                                        </span>
                                      )}
                                      {lesson.videoUrl && (
                                        <span className="text-xs text-green-600">✓ Video uploaded</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLesson(lesson.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                            </Button>
                              </div>
                            ))}
                        </div>
                      </>
                    )}

                    {/* Supply List Section */}
                    <div className="mt-8 pt-8 border-t">
                      <h3 className="text-lg font-semibold mb-4">Supply List</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add supplies students will need for this course. Include affiliate links to earn commissions.
                      </p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <Input 
                            placeholder="Item name (e.g., Paint Brush)" 
                            value={newSupplyItem} 
                            onChange={(e) => setNewSupplyItem(e.target.value)}
                          />
                          <Input 
                            placeholder="Brand name (e.g., Winsor & Newton)" 
                            value={newSupplyBrand} 
                            onChange={(e) => setNewSupplyBrand(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Affiliate link (optional)" 
                              value={newSupplyAffiliateLink} 
                              onChange={(e) => setNewSupplyAffiliateLink(e.target.value)}
                              type="url"
                            />
                            <Button type="button" onClick={addSupplyItem} size="sm">
                              <Plus className="h-4 w-4"/>
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {formData.supplyList.length === 0 && (
                            <p className="text-sm text-muted-foreground">No supplies added yet.</p>
                          )}
                          <ul className="space-y-2">
                            {formData.supplyList.map(supply => (
                              <li
                                key={supply.id}
                                className="flex items-center justify-between rounded-md border p-3"
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{supply.item}</div>
                                  <div className="text-sm text-muted-foreground">{supply.brand}</div>
                                  {supply.affiliateLink && (
                                    <a 
                                      href={supply.affiliateLink} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline"
                                    >
                                      View Product →
                                    </a>
                                  )}
                                </div>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => removeSupplyItem(supply.id)}
                                >
                                  <Trash2 className="h-4 w-4"/>
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 'media' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Trailer</h3>
                    <div className="space-y-2">
                      <Label>Optional Trailer Video</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center relative">
                        <input type="file" accept="video/*" id="trailer-upload" className="hidden" onChange={handleTrailerUpload} />
                        {trailerPreviewUrl ? (
                          <div className="space-y-3">
                            <div className="relative inline-block">
                              <video className="mx-auto w-full max-w-md rounded-lg" src={trailerPreviewUrl} controls />
                            </div>
                            <div className="flex items-center justify-center">
                              <Button type="button" variant="outline" size="sm" onClick={handleRemoveTrailer}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Trailer
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Remove the trailer to upload a new one</p>
                          </div>
                        ) : (
                          <label htmlFor="trailer-upload" className="cursor-pointer block">
                            <div className="space-y-2">
                              <Video className="h-12 w-12 mx-auto text-muted-foreground" />
                              <p className="text-sm">Upload an optional trailer video</p>
                              <p className="text-xs text-muted-foreground">Up to 4 hours duration, any file size</p>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 'pricing' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Pricing & Offers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency *</Label>
                        <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="CAD">CAD (C$)</SelectItem>
                            <SelectItem value="AUD">AUD (A$)</SelectItem>
                            <SelectItem value="JPY">JPY (¥)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">Price *</Label>
                        <Input 
                          id="price" 
                          type="number" 
                          step="0.01" 
                          min="0"
                          value={formData.price} 
                          onChange={(e)=>handleInputChange('price', e.target.value)} 
                          placeholder="0.00" 
                          required 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 'discoverability' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Discoverability</h3>
                    <p className="text-sm text-muted-foreground">Help students find your course by optimizing search and adding relevant tags.</p>
                    
                    {/* Tags Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">Course Tags</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={generateAITags}
                          disabled={isGeneratingTags || (!formData.description.trim() && !tagKeywords.trim())}
                        >
                          {isGeneratingTags ? 'Generating...' : 'Generate AI Tags'}
                        </Button>
                      </div>

                      {/* Keywords Field for Tag Generation */}
                      <div className="space-y-2">
                        <Label htmlFor="tag-keywords" className="text-sm">Keywords for Tag Generation (Optional)</Label>
                        <Input
                          id="tag-keywords"
                          value={tagKeywords}
                          onChange={(e) => setTagKeywords(e.target.value)}
                          placeholder="Enter keywords separated by commas (e.g., oil painting, techniques, beginner)"
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Add specific keywords to help generate more relevant tags for your course.
                        </p>
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
                    <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                      <input 
                        id="originality-disclaimer" 
                        type="checkbox" 
                        checked={formData.originalityDisclaimer} 
                        onChange={(e)=>handleInputChange('originalityDisclaimer', e.target.checked)}
                        required
                        className="mt-1"
                      />
                      <Label htmlFor="originality-disclaimer" className="flex-1 cursor-pointer">
                        I confirm that this is my own original work and that AI has not been used to create the content of this course.
                      </Label>
                </div>
            </div>
            )}

            {/* Skills Section - Tags moved to Discoverability step */}
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

              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-6 border-t">
                <div className="flex gap-2">
                {steps.findIndex(s => s.id === activeStep) > 0 && (
                  <Button 
                        type="button"
                    variant="outline" 
                    onClick={() => {
                      const currentIndex = steps.findIndex(s => s.id === activeStep);
                      if (currentIndex > 0) {
                        setActiveStep(steps[currentIndex - 1].id);
                      }
                    }}
                    className="w-full sm:w-auto"
                  >
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {/* Save Changes button - only show when editing */}
                {isEditing && activeStep !== 'publish' && (
                  <Button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Set flag and call handleSubmit with skipValidation=true, shouldRedirect=false, isSaveChangesOnly=true
                      // "Save Changes" should ONLY save amendments, NOT create draft, NOT redirect
                      setShouldRedirectAfterSave(false);
                      
                      // Create synthetic form event
                      const syntheticEvent = {
                        preventDefault: () => {},
                        currentTarget: e.currentTarget.closest('form') || e.currentTarget,
                        target: e.target,
                      } as unknown as React.FormEvent<HTMLFormElement>;
                      
                      // Call handleSubmit with skipValidation=true (skip validation), shouldRedirect=false (don't redirect), 
                      // isSaveChangesOnly=true (just save amendments, don't treat as draft save)
                      handleSubmit(syntheticEvent, true, false, true);
                    }}
                    disabled={isSubmitting}
                    variant="outline"
                    className="w-full sm:w-auto"
                    size="lg"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
                
                {activeStep !== 'publish' ? (
                  <Button 
                    type="button" 
                    onClick={(e) => {
                      // CRITICAL: Prevent ALL default behaviors and event bubbling
                      e.preventDefault();
                      e.stopPropagation();
                      
                      const currentIndex = steps.findIndex(s => s.id === activeStep);
                      if (currentIndex < steps.length - 1) {
                        // Basic validation before moving to next step
                        if (activeStep === 'basics') {
                          // Validate using current formData state ONLY (don't touch DOM, don't modify state)
                          const title = (formData.title || '').toString().trim();
                          const description = (formData.description || '').toString().trim();
                          const category = (formData.category || '').toString().trim();
                          const difficulty = (formData.difficulty || '').toString().trim();
                          const duration = (formData.duration || '').toString().trim();
                          const instructorBio = (formData.instructorBio || '').toString().trim();
                          
                          // Build list of missing fields
                          const missingFields: string[] = [];
                          if (!title) missingFields.push('Title');
                          if (!description) missingFields.push('Description');
                          if (!category) missingFields.push('Category');
                          if (!difficulty) missingFields.push('Difficulty');
                          if (!duration) missingFields.push('Duration');
                          if (!instructorBio) missingFields.push('Instructor Bio');
                          
                          // Only show error if fields are actually missing - DO NOT MODIFY STATE
                          if (missingFields.length > 0) {
                            toast({
                              title: "Missing Information",
                              description: `Please fill in all required fields in the Basics section. Missing: ${missingFields.join(', ')}`,
                              variant: "destructive",
                            });
                            return;
                          }
                        }
                        if (activeStep === 'curriculum' && formData.courseType === 'hosted') {
                          if (formData.curriculum.length === 0) {
                            toast({
                              title: "Lessons Required",
                              description: "Please add at least one lesson for hosted courses.",
                              variant: "destructive",
                            });
                            return;
                          }
                        }
                        if (activeStep === 'pricing') {
                          if (!formData.price) {
                            toast({
                              title: "Price Required",
                              description: "Please enter a price for your course.",
                              variant: "destructive",
                            });
                            return;
                          }
                        }
                        if (activeStep === 'discoverability' && formData.courseType === 'affiliate') {
                          if (!formData.externalUrl || !formData.hostingPlatform) {
                            toast({
                              title: "Course Link Required",
                              description: "Please provide the external URL and hosting platform for course links.",
                              variant: "destructive",
                            });
                            return;
                          }
                        }
                        setActiveStep(steps[currentIndex + 1].id);
                      }
                    }}
                    className="gradient-button w-full sm:w-auto"
                    size="lg"
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    type="submit"
                    onClick={() => setShouldRedirectAfterSave(true)}
                    disabled={isSubmitting} 
                    className="gradient-button w-full sm:w-auto" 
                    size="lg"
                  >
                    {isSubmitting 
                      ? (isEditing && activeStep === 'publish' ? 'Publishing...' : isEditing ? 'Updating...' : 'Submitting...') 
                      : (isEditing && activeStep === 'publish' ? 'Publish' : isEditing ? 'Update Course' : 'Submit Course')}
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

export default function CourseSubmissionPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-5xl">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <CourseSubmissionPageContent />
    </Suspense>
  );
}
