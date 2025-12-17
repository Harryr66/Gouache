'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { ThemeLoading } from '@/components/theme-loading';

import { db, storage, auth } from '@/lib/firebase';
import { useAuth } from '@/providers/auth-provider';
import { toast } from '@/hooks/use-toast';
import { ArtistInvite } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { StripeIntegrationWizard } from '@/components/stripe-integration-wizard';

const STEPS = [
  'Account',
  'Welcome',
  'Personal details',
  'Portfolio',
  'Events',
  'Products & Books',
  'Courses',
  'Payment Setup',
  'Review & launch'
];

// Extract email address from "Name <email@domain.com>" or "email@domain.com" format
const getSupportEmail = (): string => {
  const fromEmail = process.env.NEXT_PUBLIC_ARTIST_INVITE_FROM_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  if (!fromEmail) return 'Invite@gouache.art';
  
  // Extract email from "Name <email@domain.com>" format
  const match = fromEmail.match(/<(.+?)>/) || fromEmail.match(/([\w.-]+@[\w.-]+\.\w+)/);
  return match ? match[1] : fromEmail;
};

interface FormState {
  displayName: string;
  handle: string;
  email: string;
  bio: string;
  location: string;
  website: string;
  aboutInstructor: string;
  instagram: string;
  tiktok: string;
  x: string;
}

interface PortfolioImage {
  url: string;
  storagePath: string;
}

interface EventDraft {
  title: string;
  date: string;
  city: string;
  country: string;
  description: string;
  imageUrl?: string | null;
  imageStoragePath?: string | null;
}

interface ListingDraft {
  title: string;
  description: string;
  price?: string;
  url?: string;
  imageUrl?: string | null;
  imageStoragePath?: string | null;
}

interface CourseDraft {
  title: string;
  description: string;
  url?: string;
  price?: string;
  imageUrl?: string | null;
  imageStoragePath?: string | null;
}

interface ShowcaseLocationDraft {
  name: string;
  city?: string;
  country?: string;
  venue?: string;
  website?: string;
  notes?: string;
  imageUrl?: string | null;
  imageStoragePath?: string | null;
}

export default function ArtistOnboardingPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const { user, loading: authLoading, refreshUser } = useAuth();

  const [invite, setInvite] = useState<ArtistInvite | null>(null);
  const [inviteStatus, setInviteStatus] = useState<'loading' | 'ready' | 'invalid' | 'completed'>('loading');
  const [inviteError, setInviteError] = useState<string | null>(null);
  // Start at step 0 (Account) if no user, otherwise start at step 1 (Welcome)
  const [currentStep, setCurrentStep] = useState(() => {
    // This will be set properly after auth loads
    return 0;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    displayName: '',
    handle: '',
    email: '',
    bio: '',
    location: '',
    website: '',
    aboutInstructor: '',
    instagram: '',
    tiktok: '',
    x: ''
  });
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [pendingEvent, setPendingEvent] = useState<EventDraft>({
    title: '',
    date: '',
    city: '',
    country: '',
    description: ''
  });
  const [events, setEvents] = useState<EventDraft[]>([]);
  const [pendingProduct, setPendingProduct] = useState<ListingDraft>({
    title: '',
    description: '',
    price: '',
    url: ''
  });
  const [products, setProducts] = useState<ListingDraft[]>([]);
  const [pendingCourse, setPendingCourse] = useState<CourseDraft>({
    title: '',
    description: '',
    url: '',
    price: ''
  });
  const [courses, setCourses] = useState<CourseDraft[]>([]);
  const [isUploadingEventImage, setIsUploadingEventImage] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [isUploadingCourseImage, setIsUploadingCourseImage] = useState(false);
  const [pendingShowcase, setPendingShowcase] = useState<ShowcaseLocationDraft>({
    name: '',
    venue: '',
    city: '',
    country: '',
    website: '',
    notes: '',
    imageUrl: undefined,
    imageStoragePath: undefined
  });
  const [showcaseLocations, setShowcaseLocations] = useState<ShowcaseLocationDraft[]>([]);
  const [isUploadingShowcaseImage, setIsUploadingShowcaseImage] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authHandle, setAuthHandle] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [waitingForAuth, setWaitingForAuth] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setInviteError('Missing invite token.');
        setInviteStatus('invalid');
        return;
      }

      try {
        const inviteRef = doc(db, 'artistInvites', token);
        const snapshot = await getDoc(inviteRef);

        if (!snapshot.exists()) {
          setInviteError('This invite link is invalid or has been removed.');
          setInviteStatus('invalid');
          return;
        }

        const data = snapshot.data();
        const normalizedInvite: ArtistInvite = {
          id: snapshot.id,
          email: data.email,
          name: data.name,
          token: data.token || snapshot.id,
          status: data.status,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          createdBy: data.createdBy,
          createdByName: data.createdByName,
          lastSentAt: data.lastSentAt?.toDate?.(),
          redeemedAt: data.redeemedAt?.toDate?.(),
          redeemedBy: data.redeemedBy,
          lastAccessedAt: data.lastAccessedAt?.toDate?.(),
          lastError: data.lastError || undefined,
          revokedAt: data.revokedAt?.toDate?.(),
          message: data.message ?? null
        };

        if (normalizedInvite.status === 'revoked') {
          setInviteError('This invite has been revoked by the Gouache team.');
          setInviteStatus('invalid');
          return;
        }

        if (normalizedInvite.status === 'expired') {
          setInviteError('This invite has expired. Please request a new link from the Gouache team.');
          setInviteStatus('invalid');
          return;
        }

        if (normalizedInvite.status === 'redeemed') {
          setInvite(normalizedInvite);
          setInviteStatus('completed');
          return;
        }

        setInvite(normalizedInvite);
        setInviteStatus('ready');

        await updateDoc(inviteRef, {
          lastAccessedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Failed to load invite:', error);
        setInviteError('We were unable to load your invite. Please contact support if the issue persists.');
        setInviteStatus('invalid');
      }
    };

    fetchInvite();
  }, [token]);

  useEffect(() => {
    if (invite?.email) {
      setAuthEmail(invite.email);
    }
  }, [invite]);

  // When user becomes available after account creation, refresh their data and move to next step
  useEffect(() => {
    if (user && waitingForAuth) {
      setWaitingForAuth(false);
      refreshUser().catch(console.error);
      // Automatically move to welcome step after account creation
      if (currentStep === 0) {
        setCurrentStep(1);
      }
    }
  }, [user, waitingForAuth, refreshUser, currentStep]);

  // Set initial step based on user state
  useEffect(() => {
    if (user && invite && currentStep === 0) {
      // If user is logged in and we're on the account step, move to welcome
      setCurrentStep(1);
    } else if (!user && invite && currentStep > 0) {
      // If user logs out, go back to account step
      setCurrentStep(0);
    }
  }, [user, invite, currentStep]);

  useEffect(() => {
    if (!user || !invite) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      displayName: user.displayName || previous.displayName,
      handle: user.username || previous.handle,
      bio: previous.bio,
      location: user.location || previous.location,
      website: user.website || previous.website
    }));
  }, [user, invite]);

  const inviteEmailMatchesUser = useMemo(() => {
    if (!user || !invite) {
      return false;
    }
    return user.email?.toLowerCase() === invite.email?.toLowerCase();
  }, [invite, user]);

  const currentStepLabel = STEPS[currentStep] ?? 'Welcome';

  const handleNextStep = () => {
    // Step 0 is account creation - handled separately
    if (currentStep === 0) {
      // Should not reach here if no user, but just in case
      if (!user) {
        toast({
          title: 'Account required',
          description: 'Please create your account first.',
          variant: 'destructive'
        });
        return;
      }
      setCurrentStep(1);
      return;
    }

    // Step 1 is Welcome/Personal details - validate required fields (NOT skippable)
    if (currentStep === 1) {
      if (!formData.displayName.trim() || !formData.handle.trim() || !formData.email.trim()) {
        toast({
          title: 'Complete required fields',
          description: 'We need your name, handle, and email address before moving on.',
          variant: 'destructive'
        });
        return;
      }
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        toast({
          title: 'Invalid email',
          description: 'Please enter a valid email address.',
          variant: 'destructive'
        });
        return;
      }
      setCurrentStep(2);
      return;
    }

    // Step 2 is Portfolio - required (NOT skippable)
    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }

    // All other steps (3, 4, 5, 6, 7) are optional and can be skipped
    // Step 8 (Review & launch) is required and handled separately
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1);
    }
  };


  const handlePortfolioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;
    setIsUploadingPortfolio(true);

    try {
      const uploads: PortfolioImage[] = [];
      for (const file of Array.from(files)) {
        const storagePath = `onboarding/${user.id}/portfolio/${Date.now()}-${file.name}`;
        const imageRef = ref(storage, storagePath);
        await uploadBytes(imageRef, file);
        const url = await getDownloadURL(imageRef);
        uploads.push({ url, storagePath });
      }
      setPortfolioImages((prev) => [...prev, ...uploads]);
      toast({
        title: 'Portfolio updated',
        description: `${uploads.length} image${uploads.length > 1 ? 's' : ''} uploaded.`
      });
    } catch (error) {
      console.error('Failed to upload portfolio', error);
      toast({
        title: 'Upload failed',
        description: 'We could not upload your images. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingPortfolio(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemovePortfolioImage = async (index: number) => {
    const image = portfolioImages[index];
    setPortfolioImages((prev) => prev.filter((_, i) => i !== index));
    try {
      if (image?.storagePath) {
        await deleteObject(ref(storage, image.storagePath));
      }
    } catch (error) {
      console.warn('Failed to delete image from storage', error);
    }
  };

  const uploadSingleImage = async (file: File, folder: string) => {
    const fileName = file.name.replace(/\s+/g, '-').toLowerCase();
    const storagePath = `${folder}/${Date.now()}_${fileName}`;
    const imageRef = ref(storage, storagePath);
    await uploadBytes(imageRef, file);
    const url = await getDownloadURL(imageRef);
    return { url, storagePath };
  };

  const handlePendingEventImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsUploadingEventImage(true);
    try {
      if (pendingEvent.imageStoragePath) {
        await deleteObject(ref(storage, pendingEvent.imageStoragePath));
      }
      const { url, storagePath } = await uploadSingleImage(file, 'events');
      setPendingEvent((prev) => ({ ...prev, imageUrl: url, imageStoragePath: storagePath }));
      toast({
        title: 'Event image added',
        description: 'We’ll use this as the thumbnail for your event.'
      });
    } catch (error) {
      console.error('Failed to upload event image', error);
      toast({
        title: 'Upload failed',
        description: 'We could not upload that image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingEventImage(false);
      event.target.value = '';
    }
  };

  const clearPendingEventImage = async () => {
    if (pendingEvent.imageStoragePath) {
      try {
        await deleteObject(ref(storage, pendingEvent.imageStoragePath));
      } catch (error) {
        console.warn('Failed to delete pending event image', error);
      }
    }
    setPendingEvent((prev) => ({ ...prev, imageUrl: undefined, imageStoragePath: undefined }));
  };

  const handlePendingProductImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsUploadingProductImage(true);
    try {
      if (pendingProduct.imageStoragePath) {
        await deleteObject(ref(storage, pendingProduct.imageStoragePath));
      }
      const { url, storagePath } = await uploadSingleImage(file, 'products');
      setPendingProduct((prev) => ({ ...prev, imageUrl: url, imageStoragePath: storagePath }));
      toast({
        title: 'Product image added',
        description: 'We’ll feature this image alongside your listing.'
      });
    } catch (error) {
      console.error('Failed to upload product image', error);
      toast({
        title: 'Upload failed',
        description: 'We could not upload that image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingProductImage(false);
      event.target.value = '';
    }
  };

  const clearPendingProductImage = async () => {
    if (pendingProduct.imageStoragePath) {
      try {
        await deleteObject(ref(storage, pendingProduct.imageStoragePath));
      } catch (error) {
        console.warn('Failed to delete pending product image', error);
      }
    }
    setPendingProduct((prev) => ({ ...prev, imageUrl: undefined, imageStoragePath: undefined }));
  };

  const handlePendingCourseImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsUploadingCourseImage(true);
    try {
      if (pendingCourse.imageStoragePath) {
        await deleteObject(ref(storage, pendingCourse.imageStoragePath));
      }
      const { url, storagePath } = await uploadSingleImage(file, 'courses');
      setPendingCourse((prev) => ({ ...prev, imageUrl: url, imageStoragePath: storagePath }));
      toast({
        title: 'Course image added',
        description: 'We’ll use this as the course thumbnail.'
      });
    } catch (error) {
      console.error('Failed to upload course image', error);
      toast({
        title: 'Upload failed',
        description: 'We could not upload that image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingCourseImage(false);
      event.target.value = '';
    }
  };

  const clearPendingCourseImage = async () => {
    if (pendingCourse.imageStoragePath) {
      try {
        await deleteObject(ref(storage, pendingCourse.imageStoragePath));
      } catch (error) {
        console.warn('Failed to delete pending course image', error);
      }
    }
    setPendingCourse((prev) => ({ ...prev, imageUrl: undefined, imageStoragePath: undefined }));
  };

  const handlePendingShowcaseImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingShowcaseImage(true);
    try {
      if (pendingShowcase.imageStoragePath) {
        await deleteObject(ref(storage, pendingShowcase.imageStoragePath));
      }
      const { url, storagePath } = await uploadSingleImage(file, 'showcases');
      setPendingShowcase((prev) => ({ ...prev, imageUrl: url, imageStoragePath: storagePath }));
      toast({
        title: 'Showcase image added',
        description: 'This will appear alongside the gallery listing.'
      });
    } catch (error) {
      console.error('Failed to upload showcase image', error);
      toast({
        title: 'Upload failed',
        description: 'We could not upload that image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingShowcaseImage(false);
      event.target.value = '';
    }
  };

  const clearPendingShowcaseImage = async () => {
    if (pendingShowcase.imageStoragePath) {
      try {
        await deleteObject(ref(storage, pendingShowcase.imageStoragePath));
      } catch (error) {
        console.warn('Failed to delete pending showcase image', error);
      }
    }
    setPendingShowcase((prev) => ({ ...prev, imageUrl: undefined, imageStoragePath: undefined }));
  };

  const handleAddShowcaseLocation = () => {
    if (!pendingShowcase.name.trim() && !pendingShowcase.city?.trim() && !pendingShowcase.country?.trim()) {
      toast({
        title: 'Nothing to add',
        description: 'Provide at least the gallery name or location, or skip this step.',
        variant: 'destructive'
      });
      return;
    }
    const showcaseToAdd: ShowcaseLocationDraft = { ...pendingShowcase };
    setShowcaseLocations((prev) => [...prev, showcaseToAdd]);
    setPendingShowcase({ name: '', city: '', country: '', notes: '' });
    toast({
      title: 'Location added',
      description: 'This gallery will be shown under “Where to see my work”.'
    });
  };

  const handleRemoveShowcaseLocation = async (index: number) => {
    const location = showcaseLocations[index];
    setShowcaseLocations((prev) => prev.filter((_, i) => i !== index));
    if (location?.imageStoragePath) {
      try {
        await deleteObject(ref(storage, location.imageStoragePath));
      } catch (error) {
        console.warn('Failed to delete showcase image from storage', error);
      }
    }
  };

  const handleRemoveEvent = async (index: number) => {
    const eventToRemove = events[index];
    setEvents((prev) => prev.filter((_, i) => i !== index));
    if (eventToRemove?.imageStoragePath) {
      try {
        await deleteObject(ref(storage, eventToRemove.imageStoragePath));
      } catch (error) {
        console.warn('Failed to delete event image from storage', error);
      }
    }
  };

  const handleRemoveProduct = async (index: number) => {
    const productToRemove = products[index];
    setProducts((prev) => prev.filter((_, i) => i !== index));
    if (productToRemove?.imageStoragePath) {
      try {
        await deleteObject(ref(storage, productToRemove.imageStoragePath));
      } catch (error) {
        console.warn('Failed to delete product image from storage', error);
      }
    }
  };

  const handleRemoveCourse = async (index: number) => {
    const courseToRemove = courses[index];
    setCourses((prev) => prev.filter((_, i) => i !== index));
    if (courseToRemove?.imageStoragePath) {
      try {
        await deleteObject(ref(storage, courseToRemove.imageStoragePath));
      } catch (error) {
        console.warn('Failed to delete course image from storage', error);
      }
    }
  };

  const handleAddEvent = () => {
    if (!pendingEvent.title.trim() && !pendingEvent.date && !pendingEvent.city.trim() && !pendingEvent.country.trim()) {
      toast({
        title: 'Nothing to add',
        description: 'Fill in at least one event field or skip this step.',
        variant: 'destructive'
      });
      return;
    }
    const eventToAdd: EventDraft = { ...pendingEvent };
    setEvents((prev) => [...prev, eventToAdd]);
    setPendingEvent({ title: '', date: '', city: '', country: '', description: '', imageUrl: undefined, imageStoragePath: undefined });
    toast({
      title: 'Event added',
      description: 'Your event has been saved to the onboarding summary.'
    });
  };

  const handleAddProduct = () => {
    if (!pendingProduct.title.trim() && !pendingProduct.description.trim()) {
      toast({
        title: 'Nothing to add',
        description: 'Provide at least a title or description, or skip this step.',
        variant: 'destructive'
      });
      return;
    }
    const productToAdd: ListingDraft = { ...pendingProduct };
    setProducts((prev) => [...prev, productToAdd]);
    setPendingProduct({ title: '', description: '', price: '', url: '', imageUrl: undefined, imageStoragePath: undefined });
    toast({
      title: 'Product added',
      description: 'We’ll feature this in your shop once you publish.'
    });
  };

  const handleAddCourse = () => {
    if (!pendingCourse.title.trim() && !pendingCourse.description.trim()) {
      toast({
        title: 'Nothing to add',
        description: 'Provide at least a title or description, or skip this step.',
        variant: 'destructive'
      });
      return;
    }
    const courseToAdd: CourseDraft = { ...pendingCourse };
    setCourses((prev) => [...prev, courseToAdd]);
    setPendingCourse({ title: '', description: '', url: '', price: '', imageUrl: undefined, imageStoragePath: undefined });
    toast({
      title: 'Course added',
      description: 'Your course will appear with the chosen thumbnail.'
    });
  };

  const handleCreateAccount = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please enter your email and password.',
        variant: 'destructive'
      });
      return;
    }

    if (!authName.trim() || !authHandle.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please enter your name and handle.',
        variant: 'destructive'
      });
      return;
    }

    if (authEmail.toLowerCase() !== invite?.email?.toLowerCase()) {
      toast({
        title: 'Email mismatch',
        description: `This invite is for ${invite?.email}. Please use that email address.`,
        variant: 'destructive'
      });
      return;
    }

    setIsAuthLoading(true);

    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        authEmail.trim(),
        authPassword
      );

      const user = userCredential.user;

      // Update user profile with display name
      await updateProfile(user, {
        displayName: authName.trim(),
      });

      // Create user document in Firestore
      try {
        await setDoc(doc(db, 'userProfiles', user.uid), {
          id: user.uid,
          name: authName.trim(),
          displayName: authName.trim(),
          handle: authHandle.trim(),
          username: authHandle.trim(),
          email: authEmail.trim(),
          avatarUrl: user.photoURL || undefined,
          bio: '',
          location: '',
          website: '',
          followerCount: 0,
          followingCount: 0,
          isProfessional: false,
          createdAt: serverTimestamp(),
        });

        // Store handle mapping
        await setDoc(
          doc(db, 'handles', authHandle.trim()),
          { userId: user.uid },
          { merge: true }
        );
      } catch (firestoreError) {
        console.warn('Firestore save failed:', firestoreError);
      }

      toast({
        title: 'Account created!',
        description: 'Welcome to Gouache! Continuing with onboarding...',
      });

      // Set flag to wait for auth state update
      setWaitingForAuth(true);
      
      // The onAuthStateChanged listener will automatically update the user state
      // Once user is available, we'll automatically move to the next step
    } catch (error: any) {
      console.error('Account creation error:', error);
      
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
        setAuthMode('signin');
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      }

      toast({
        title: 'Account creation failed',
        description: errorMessage,
        variant: 'destructive'
      });
      setWaitingForAuth(false);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please enter your email and password.',
        variant: 'destructive'
      });
      return;
    }

    if (authEmail.toLowerCase() !== invite?.email?.toLowerCase()) {
      toast({
        title: 'Email mismatch',
        description: `This invite is for ${invite?.email}. Please sign in with that email address.`,
        variant: 'destructive'
      });
      return;
    }

    setIsAuthLoading(true);

    try {
      await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      
      toast({
        title: 'Signed in!',
        description: 'Continuing with onboarding...',
      });

      // Set flag to wait for auth state update
      setWaitingForAuth(true);
      
      // The onAuthStateChanged listener will automatically update the user state
      // Once user is available, we'll automatically move to the next step
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      let errorMessage = 'Failed to sign in. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please create an account instead.';
        setAuthMode('signup');
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      }

      toast({
        title: 'Sign in failed',
        description: errorMessage,
        variant: 'destructive'
      });
      setWaitingForAuth(false);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in with the email address that received this invite.',
        variant: 'destructive'
      });
      return;
    }

    if (!invite) {
      toast({
        title: 'Invite missing',
        description: 'We could not locate the invite. Refresh and try again.',
        variant: 'destructive'
      });
      return;
    }

    if (!inviteEmailMatchesUser) {
      toast({
        title: 'Email mismatch',
        description: 'This link was not issued to the account you are currently signed in with.',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.displayName.trim() || !formData.handle.trim() || !formData.email.trim()) {
      toast({
        title: 'Complete required fields',
        description: 'We need your name, handle, and email address before publishing your profile.',
        variant: 'destructive'
      });
      setCurrentStep(1);
      return;
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);

    try {
      const profileRef = doc(db, 'userProfiles', user.id);
      await setDoc(
        profileRef,
        {
          name: formData.displayName.trim(),
          displayName: formData.displayName.trim(),
          handle: formData.handle.trim(),
          email: formData.email.trim(),
          bio: formData.bio.trim() || null,
          location: formData.location.trim() || null,
          website: formData.website.trim() || null,
          aboutInstructor: formData.aboutInstructor.trim() || null,
          socialLinks: {
            ...(formData.instagram.trim() ? { instagram: formData.instagram.trim() } : {}),
            ...(formData.x.trim() ? { x: formData.x.trim() } : {}),
            ...(formData.tiktok.trim() ? { tiktok: formData.tiktok.trim() } : {}),
            ...(formData.website.trim() ? { website: formData.website.trim() } : {})
          },
          accountRole: 'artist',
          isProfessional: true,
          tipJarEnabled: true,
          suggestionsEnabled: true,
          hideCard: false,
          artistInviteToken: invite.token,
          artistOnboarding: {
            completed: true,
            version: 1,
            completedAt: serverTimestamp()
          },
          portfolioImages: portfolioImages.map((image) => image.url),
          events: events.map((event) => ({
            title: event.title || null,
            date: event.date || null,
            city: event.city || null,
            country: event.country || null,
            description: event.description || null,
            imageUrl: event.imageUrl || null
          })),
          products: products.map((product) => ({
            title: product.title || null,
            description: product.description || null,
            price: product.price || null,
            url: product.url || null,
            imageUrl: product.imageUrl || null
          })),
          courses: courses.map((course) => ({
            title: course.title || null,
            description: course.description || null,
            url: course.url || null,
            price: course.price || null,
            imageUrl: course.imageUrl || null
          })),
          showcaseLocations: showcaseLocations.map((location) => ({
            name: location.name || null,
            venue: location.venue || null,
            city: location.city || null,
            country: location.country || null,
            website: location.website || null,
            notes: location.notes || null,
            imageUrl: location.imageUrl || null
          })),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      if (formData.handle.trim() && formData.handle.trim() !== user.username) {
        await setDoc(
          doc(db, 'handles', formData.handle.trim()),
          { userId: user.id },
          { merge: true }
        );
      }

      await updateDoc(doc(db, 'artistInvites', invite.id), {
        status: 'redeemed',
        redeemedAt: serverTimestamp(),
        redeemedBy: user.id,
        lastAccessedAt: serverTimestamp()
      });

      await refreshUser();

      setInviteStatus('completed');
      toast({
        title: 'Welcome to Gouache!',
        description: 'Your artist profile has been created. Finish setting it up from your dashboard.'
      });
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast({
        title: 'Unable to finish onboarding',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (inviteStatus === 'loading' || authLoading || waitingForAuth) {
    return (
      <div className="container max-w-3xl py-16">
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ThemeLoading size="lg" text="" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteStatus === 'invalid' || !invite) {
    return (
      <div className="container max-w-2xl py-16">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Invitation issue
            </CardTitle>
            <CardDescription className="text-destructive/80">
              {inviteError || 'We could not validate this artist invitation.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Double-check that you copied the entire link from your email. If the problem continues, contact the
              Gouache team so we can issue a new invite.
            </p>
            <Button variant="outline" onClick={() => router.push('/')}>Return home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && !inviteEmailMatchesUser) {
    return (
      <div className="container max-w-2xl py-16">
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader>
            <CardTitle className="text-amber-900">This invite belongs to another email</CardTitle>
            <CardDescription className="text-amber-800">
              You are signed in as {user.email}, but this invite was issued to {invite.email}. Sign in with the invited
              email or ask the Gouache team to send a new link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.open('/login', '_blank')} className="w-full">
              Switch accounts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteStatus === 'completed') {
    return (
      <div className="container max-w-2xl py-16">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="h-5 w-5" /> Artist profile ready
            </CardTitle>
            <CardDescription className="text-emerald-800">
              Thanks for joining Gouache! Your artist dashboard is ready whenever you are.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-emerald-900/80">
            <p>
              Next, visit your profile to upload hero imagery, add portfolio pieces, and publish your first updates. We
              can’t wait to showcase your work.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="gradient" className="flex-1" onClick={() => router.push('/profile')}>
                Go to my profile
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => router.push('/discover')}>
                Explore Gouache
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stepProgress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container max-w-4xl py-12 text-slate-900">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2">Invite for {invite.email}</Badge>
          <h1 className="text-3xl font-semibold tracking-tight">Artist onboarding</h1>
          <p className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length} • {currentStepLabel}
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Need help?</p>
          <p>
            Email{' '}
            <a href={`mailto:${getSupportEmail()}`} className="underline">
              {getSupportEmail()}
            </a>
          </p>
        </div>
      </div>

        <div className="relative mb-8 h-2 rounded-full bg-slate-200">
          <span className="absolute inset-y-0 left-0 rounded-full bg-slate-900 transition-all" style={{ width: `${stepProgress}%` }} />
      </div>

        <Card className="shadow-lg border border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-200 bg-white px-6 py-6">
            <CardTitle className="text-2xl font-semibold text-slate-900">{currentStepLabel}</CardTitle>
            <CardDescription className="text-slate-600">
            {currentStep === 0 && 'Create your artist account to begin. This invite is reserved for your email address.'}
            {currentStep === 1 && "Welcome to Gouache! Let's set up your profile. Name and handle are required."}
            {currentStep === 2 && 'Upload highlight pieces for your portfolio. You can add images now or update your profile later.'}
            {currentStep === 4 && 'Share any upcoming events. This step is optional—you can skip it and add events later from your profile.'}
            {currentStep === 5 && 'List products or books you sell. This step is optional—you can skip it and add products later from your profile.'}
            {currentStep === 6 && 'Share any courses you currently offer. This step is optional—you can skip it and add courses later from your profile.'}
            {currentStep === 7 && 'Connect your Stripe account to accept payments. You can skip this and set it up later from your profile settings.'}
            {currentStep === 8 && 'Review everything at a glance before publishing your artist profile.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 py-8 text-slate-700">
          {currentStep === 0 && !user && (
            <div className="space-y-6">
              <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'signup' | 'signin')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signup">Create Account</TabsTrigger>
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signup" className="space-y-4 mt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="signup-email">Email</label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        disabled={isAuthLoading || !!invite?.email}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        {invite?.email ? 'This email is from your invite and cannot be changed.' : 'This must match the email address that received this invite.'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="signup-name">Full Name</label>
                      <Input
                        id="signup-name"
                        placeholder="Elena Vance"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        disabled={isAuthLoading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="signup-handle">Username</label>
                      <Input
                        id="signup-handle"
                        placeholder="elena_vance"
                        value={authHandle}
                        onChange={(e) => setAuthHandle(e.target.value)}
                        disabled={isAuthLoading}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        You can change this later. Letters, numbers, and underscores only.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="signup-password">Password</label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        disabled={isAuthLoading}
                        required
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="signin" className="space-y-4 mt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="signin-email">Email</label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        disabled={isAuthLoading || !!invite?.email}
                        required
                      />
                      {invite?.email && (
                        <p className="text-xs text-muted-foreground">
                          This email is from your invite and cannot be changed.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="signin-password">Password</label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        disabled={isAuthLoading}
                        required
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {currentStep === 1 && (
            <>
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="displayName">Artist name</label>
                  <Input
                    id="displayName"
                    placeholder="Elena Vance"
                    value={formData.displayName}
                    onChange={(event) => setFormData((previous) => ({ ...previous, displayName: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="handle">Public handle</label>
                  <Input
                    id="handle"
                    placeholder="elena_vance"
                    value={formData.handle}
                    onChange={(event) => setFormData((previous) => ({ ...previous, handle: event.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">We recommend something short and memorable. You can change it later.</p>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="email">Email Address *</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(event) => setFormData((previous) => ({ ...previous, email: event.target.value }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Required for customer inquiries and course access links.</p>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="bio">Short bio</label>
                  <Textarea
                    id="bio"
                    placeholder="Share what drives your practice, recurring themes, or the mediums you work with."
                    value={formData.bio}
                    onChange={(event) => setFormData((previous) => ({ ...previous, bio: event.target.value }))}
                    rows={6}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="location">Primary location</label>
                  <Input
                    id="location"
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={(event) => setFormData((previous) => ({ ...previous, location: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="website">Website (optional)</label>
                  <Input
                    id="website"
                    placeholder="https://yourwebsite.com"
                    value={formData.website}
                    onChange={(event) => setFormData((previous) => ({ ...previous, website: event.target.value }))}
                  />
                </div>
              </div>

              {/* About the Instructor Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold text-foreground">About the Instructor</h3>
                <p className="text-sm text-muted-foreground">This information will appear on your course pages. All fields are optional.</p>
                
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="aboutInstructor">Short Description (optional, max 2 sentences)</label>
                  <Textarea
                    id="aboutInstructor"
                    placeholder="Write a brief description about yourself as an instructor..."
                    value={formData.aboutInstructor}
                    onChange={(event) => {
                      const value = event.target.value;
                      // Limit to 2 sentences
                      const sentences = value.split(/[.!?]+/).filter(s => s.trim().length > 0);
                      if (sentences.length <= 2) {
                        setFormData((previous) => ({ ...previous, aboutInstructor: value }));
                      }
                    }}
                    rows={3}
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.aboutInstructor.split(/[.!?]+/).filter(s => s.trim().length > 0).length}/2 sentences
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="instagram">Instagram (optional)</label>
                    <Input
                      id="instagram"
                      placeholder="@username or URL"
                      value={formData.instagram}
                      onChange={(event) => setFormData((previous) => ({ ...previous, instagram: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="x">X / Twitter (optional)</label>
                    <Input
                      id="x"
                      placeholder="@username or URL"
                      value={formData.x}
                      onChange={(event) => setFormData((previous) => ({ ...previous, x: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="tiktok">TikTok (optional)</label>
                    <Input
                      id="tiktok"
                      placeholder="@username or URL"
                      value={formData.tiktok}
                      onChange={(event) => setFormData((previous) => ({ ...previous, tiktok: event.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {currentStep === 0 && user && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-slate-800">
              <h2 className="text-xl font-semibold text-slate-900">Welcome</h2>
              <p className="leading-relaxed">
                We&apos;ll capture the essentials to launch your artist profile. Each step is quick, and you can skip anything you&apos;re not ready to share.
              </p>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  Upload up to 10 highlight images. You can add more later from your dashboard.
                </p>
                <div className="mt-4 flex flex-col gap-4">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePortfolioUpload}
                    disabled={isUploadingPortfolio}
                  />
                  {isUploadingPortfolio && (
                    <p className="text-xs text-muted-foreground">Uploading images...</p>
                  )}
                  {portfolioImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {portfolioImages.map((image, index) => (
                        <div key={image.storagePath} className="relative group">
                          <img
                            src={image.url}
                            alt={`Portfolio ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemovePortfolioImage(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Event details</h3>
                <p className="text-sm text-muted-foreground">
                  Add events you have planned. This step is optional—skip if you don’t have anything coming up.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Event name"
                    value={pendingEvent.title}
                    onChange={(event) =>
                      setPendingEvent((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                  <Input
                    type="date"
                    value={pendingEvent.date}
                    onChange={(event) =>
                      setPendingEvent((prev) => ({ ...prev, date: event.target.value }))
                    }
                  />
                  {/* Location fields removed per UX request */}
                  <Textarea
                    placeholder="Event description (optional)"
                    className="sm:col-span-2"
                    value={pendingEvent.description}
                    onChange={(event) =>
                      setPendingEvent((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                  <div className="sm:col-span-2 space-y-2">
                    <p className="text-xs font-medium text-foreground">Event image (optional)</p>
                    {pendingEvent.imageUrl ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={pendingEvent.imageUrl}
                          alt="Event preview"
                          className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                        />
                        <Button variant="ghost" size="sm" onClick={() => void clearPendingEventImage()}>
                          Remove image
                        </Button>
                      </div>
                    ) : (
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingEventImage}
                        onChange={handlePendingEventImageChange}
                      />
                    )}
                    {isUploadingEventImage && (
                      <p className="text-xs text-muted-foreground">Uploading image…</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleAddEvent}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add event
                  </Button>
                </div>
              </div>
              {events.length > 0 && (
                <div className="space-y-3">
                  {events.map((event, index) => (
                    <div key={`${event.title}-${index}`} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        {event.imageUrl && (
                          <img
                            src={event.imageUrl}
                            alt={event.title || 'Event image'}
                            className="h-16 w-16 rounded-md border border-slate-200 object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-sm text-foreground">
                                {event.title || 'Untitled event'}
                              </p>
                              {/* Location removed */}
                              <p className="text-xs text-muted-foreground">
                                {event.date || 'Date TBD'}
                              </p>
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-2">{event.description}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleRemoveEvent(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Where to see my work</h3>
                <p className="text-sm text-muted-foreground">
                  List galleries or spaces that are currently showing your work. These entries stay visible on your profile.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Gallery or space name"
                  value={pendingShowcase.name}
                  onChange={(event) =>
                    setPendingShowcase((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
                <Input
                  placeholder="Venue (optional)"
                  value={pendingShowcase.venue}
                  onChange={(event) =>
                    setPendingShowcase((prev) => ({ ...prev, venue: event.target.value }))
                  }
                />
                <Input
                  placeholder="City"
                  value={pendingShowcase.city}
                  onChange={(event) =>
                    setPendingShowcase((prev) => ({ ...prev, city: event.target.value }))
                  }
                />
                <Input
                  placeholder="Country"
                  value={pendingShowcase.country}
                  onChange={(event) =>
                    setPendingShowcase((prev) => ({ ...prev, country: event.target.value }))
                  }
                />
                <Input
                  placeholder="Website or listing URL (optional)"
                  value={pendingShowcase.website}
                  onChange={(event) =>
                    setPendingShowcase((prev) => ({ ...prev, website: event.target.value }))
                  }
                />
                <Textarea
                  placeholder="Notes (optional)"
                  className="sm:col-span-2"
                  value={pendingShowcase.notes}
                  onChange={(event) =>
                    setPendingShowcase((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  rows={3}
                />
                <div className="sm:col-span-2 space-y-2">
                  <p className="text-xs font-medium text-foreground">Gallery image (optional)</p>
                  {pendingShowcase.imageUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={pendingShowcase.imageUrl}
                        alt="Gallery preview"
                        className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                      />
                      <Button variant="ghost" size="sm" onClick={() => void clearPendingShowcaseImage()}>
                        Remove image
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingShowcaseImage}
                      onChange={handlePendingShowcaseImageChange}
                    />
                  )}
                  {isUploadingShowcaseImage && (
                    <p className="text-xs text-muted-foreground">Uploading image…</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleAddShowcaseLocation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add location
                </Button>
              </div>
              {showcaseLocations.length > 0 && (
                <div className="space-y-3">
                  {showcaseLocations.map((location, index) => (
                    <div key={`${location.name}-${index}`} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        {location.imageUrl && (
                          <img
                            src={location.imageUrl}
                            alt={location.name || 'Gallery image'}
                            className="h-16 w-16 rounded-md border border-slate-200 object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-semibold text-sm text-foreground">
                                {location.name || 'Gallery'}
                              </p>
                              {(location.city || location.country) && (
                                <p className="text-xs text-muted-foreground">
                                  {[location.city, location.country].filter(Boolean).join(', ')}
                                </p>
                              )}
                              {location.website && (
                                <p className="text-xs text-muted-foreground break-all">{location.website}</p>
                              )}
                              {location.notes && (
                                <p className="text-xs text-muted-foreground">{location.notes}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleRemoveShowcaseLocation(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Products & Books</h3>
                <p className="text-sm text-muted-foreground">
                  List any products, prints, or books subscribers can purchase. This step is optional—you can skip it and add products later from your profile.
                </p>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Title"
                  value={pendingProduct.title}
                  onChange={(event) =>
                    setPendingProduct((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
                <Textarea
                  placeholder="Description"
                  value={pendingProduct.description}
                  onChange={(event) =>
                    setPendingProduct((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={3}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Price (optional)"
                    value={pendingProduct.price}
                    onChange={(event) =>
                      setPendingProduct((prev) => ({ ...prev, price: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Product URL (optional)"
                    value={pendingProduct.url}
                    onChange={(event) =>
                      setPendingProduct((prev) => ({ ...prev, url: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Product image (optional)</p>
                  {pendingProduct.imageUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={pendingProduct.imageUrl}
                        alt="Product preview"
                        className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                      />
                      <Button variant="ghost" size="sm" onClick={() => void clearPendingProductImage()}>
                        Remove image
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingProductImage}
                      onChange={handlePendingProductImageChange}
                    />
                  )}
                  {isUploadingProductImage && (
                    <p className="text-xs text-muted-foreground">Uploading image…</p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleAddProduct}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add product
                  </Button>
                </div>
              </div>
              {products.length > 0 && (
                <div className="space-y-3">
                  {products.map((product, index) => (
                    <div key={`${product.title}-${index}`} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.title || 'Product image'}
                            className="h-16 w-16 rounded-md border border-slate-200 object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-sm text-foreground">
                                {product.title || 'Untitled product'}
                              </p>
                              {product.price && (
                                <p className="text-xs text-muted-foreground">Price: {product.price}</p>
                              )}
                              {product.description && (
                                <p className="text-xs text-muted-foreground mt-2">{product.description}</p>
                              )}
                              {product.url && (
                                <p className="text-xs text-muted-foreground mt-1 break-all">{product.url}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleRemoveProduct(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Courses</h3>
                <p className="text-sm text-muted-foreground">
                  Add any courses or workshops you currently offer. Optional—skip if you don’t have any courses yet.
                </p>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Course title"
                  value={pendingCourse.title}
                  onChange={(event) =>
                    setPendingCourse((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
                <Textarea
                  placeholder="Course description"
                  value={pendingCourse.description}
                  onChange={(event) =>
                    setPendingCourse((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={3}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Course URL (optional)"
                    value={pendingCourse.url}
                    onChange={(event) =>
                      setPendingCourse((prev) => ({ ...prev, url: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Price (optional)"
                    value={pendingCourse.price}
                    onChange={(event) =>
                      setPendingCourse((prev) => ({ ...prev, price: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Course image (optional)</p>
                  {pendingCourse.imageUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={pendingCourse.imageUrl}
                        alt="Course preview"
                        className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                      />
                      <Button variant="ghost" size="sm" onClick={() => void clearPendingCourseImage()}>
                        Remove image
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingCourseImage}
                      onChange={handlePendingCourseImageChange}
                    />
                  )}
                  {isUploadingCourseImage && (
                    <p className="text-xs text-muted-foreground">Uploading image…</p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleAddCourse}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add course
                  </Button>
                </div>
              </div>
              {courses.length > 0 && (
                <div className="space-y-3">
                  {courses.map((course, index) => (
                    <div key={`${course.title}-${index}`} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        {course.imageUrl && (
                          <img
                            src={course.imageUrl}
                            alt={course.title || 'Course image'}
                            className="h-16 w-16 rounded-md border border-slate-200 object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-sm text-foreground">
                                {course.title || 'Untitled course'}
                              </p>
                              {course.price && (
                                <p className="text-xs text-muted-foreground">Price: {course.price}</p>
                              )}
                              {course.description && (
                                <p className="text-xs text-muted-foreground mt-2">{course.description}</p>
                              )}
                              {course.url && (
                                <p className="text-xs text-muted-foreground mt-1 break-all">{course.url}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleRemoveCourse(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Payment Setup</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your Stripe account to start accepting payments for your artwork, prints, books, and courses. 
                    You'll receive 100% of sales directly to your Stripe account. You can skip this step and set it up later from your profile settings.
                  </p>
                </div>
                <StripeIntegrationWizard />
              </div>
            </div>
          )}

          {currentStep === 8 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Artist profile</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Name: <span className="text-foreground">{formData.displayName || '—'}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Handle: <span className="text-foreground">{formData.handle || '—'}</span>
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  Bio: <span className="text-foreground">{formData.bio || 'Add this later in your profile settings.'}</span>
                </p>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Portfolio</h3>
                {portfolioImages.length > 0 ? (
                  <p className="text-sm text-muted-foreground">{portfolioImages.length} images uploaded</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No images uploaded yet</p>
                )}
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Events</h3>
                {events.length > 0 ? (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {events.map((event, index) => (
                      <p key={`event-${index}`}>
                        <Check className="inline h-3 w-3 mr-2 text-primary" />
                        {event.title || 'Untitled event'}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No events added</p>
                )}
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Products & Books</h3>
                {products.length > 0 ? (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {products.map((product, index) => (
                      <p key={`product-${index}`}>
                        <Check className="inline h-3 w-3 mr-2 text-primary" />
                        {product.title || 'Untitled product'}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No products added</p>
                )}
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Where to See My Work</h3>
                {showcaseLocations.length > 0 ? (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {showcaseLocations.map((location, index) => (
                      <p key={`showcase-${index}`}>
                        <Check className="inline h-3 w-3 mr-2 text-primary" />
                        {location.name || 'Gallery'}{location.city ? ` — ${location.city}` : ''}{location.country ? `, ${location.country}` : ''}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No galleries listed yet</p>
                )}
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Courses</h3>
                {courses.length > 0 ? (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {courses.map((course, index) => (
                      <p key={`course-${index}`}>
                        <Check className="inline h-3 w-3 mr-2 text-primary" />
                        {course.title || 'Untitled course'}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No courses added</p>
                )}
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Payment Setup</h3>
                {user?.stripeAccountId && user?.stripeOnboardingStatus === 'complete' && 
                 user?.stripeChargesEnabled && user?.stripePayoutsEnabled ? (
                  <p className="text-sm text-muted-foreground">
                    <Check className="inline h-3 w-3 mr-2 text-primary" />
                    Stripe account connected
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Not set up yet. You can add this later from your profile settings.
                  </p>
                )}
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                By clicking “Publish my profile” you agree to Gouache’s community guidelines and confirm you’re ready to
                be discovered by the Gouache community.
              </p>
            </div>
          )}
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {currentStep > 0 && (
              <Button variant="ghost" onClick={handlePreviousStep} className="justify-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            {currentStep === 0 && !user && (
              <Button
                variant="gradient"
                onClick={authMode === 'signup' ? handleCreateAccount : handleSignIn}
                disabled={isAuthLoading}
                className="justify-center"
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {authMode === 'signup' ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    {authMode === 'signup' ? 'Create Account & Continue' : 'Sign In & Continue'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
            {currentStep === 0 && user && (
              <Button variant="gradient" onClick={handleNextStep} className="justify-center">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {currentStep > 0 && currentStep < STEPS.length - 1 && (
              <div className="flex gap-2">
                {/* Skip buttons for optional steps: Events (4), Products & Books (5), Courses (6), Payment Setup (7) */}
                {/* Note: Step 1 (Personal details), Step 2 (Portfolio), and Step 8 (Review) are required and not skippable */}
                {(currentStep === 4 || currentStep === 5 || currentStep === 6 || currentStep === 7) && (
                  <Button variant="outline" onClick={handleNextStep} className="justify-center">
                    Skip for now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <Button variant="gradient" onClick={handleNextStep} className="justify-center">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
            {currentStep === STEPS.length - 1 && (
              <Button
                variant="gradient"
                onClick={handleCompleteOnboarding}
                disabled={isSubmitting}
                className="justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing…
                  </>
                ) : (
                  'Publish my profile'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
