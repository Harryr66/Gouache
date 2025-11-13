'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';

import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/providers/auth-provider';
import { toast } from '@/hooks/use-toast';
import { ArtistInvite } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const STEPS = [
  'Welcome',
  'Personal details',
  'Portfolio',
  'Events',
  'Products & Books',
  'Courses',
  'Review & launch'
];

interface FormState {
  displayName: string;
  handle: string;
  bio: string;
  location: string;
  website: string;
  instagram: string;
  x: string;
  tiktok: string;
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
}

interface ListingDraft {
  title: string;
  description: string;
  price?: string;
  url?: string;
}

interface CourseDraft {
  title: string;
  description: string;
  url?: string;
  price?: string;
}

export default function ArtistOnboardingPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const { user, loading: authLoading, refreshUser } = useAuth();

  const [invite, setInvite] = useState<ArtistInvite | null>(null);
  const [inviteStatus, setInviteStatus] = useState<'loading' | 'ready' | 'invalid' | 'completed'>('loading');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    displayName: '',
    handle: '',
    bio: '',
    location: '',
    website: '',
    instagram: '',
    x: '',
    tiktok: ''
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
    if (!user || !invite) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      displayName: user.displayName || previous.displayName,
      handle: user.username || previous.handle,
      bio: previous.bio,
      location: user.location || previous.location,
      website: user.website || previous.website,
      instagram: user.socialLinks?.instagram || previous.instagram,
      x: user.socialLinks?.x || previous.x,
      tiktok: user.socialLinks?.tiktok || previous.tiktok
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
    if (currentStep === 0) {
      setCurrentStep(1);
      return;
    }

    if (currentStep === 1) {
      if (!formData.displayName.trim() || !formData.handle.trim()) {
        toast({
          title: 'Add your name and handle',
          description: 'We need both a display name and handle before moving on.',
          variant: 'destructive'
        });
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1);
    }
  };

  const handleSkipStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((step) => step + 1);
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

  const handleAddEvent = () => {
    if (!pendingEvent.title.trim() && !pendingEvent.date && !pendingEvent.city.trim() && !pendingEvent.country.trim()) {
      toast({
        title: 'Nothing to add',
        description: 'Fill in at least one event field or skip this step.',
        variant: 'destructive'
      });
      return;
    }
    setEvents((prev) => [...prev, pendingEvent]);
    setPendingEvent({ title: '', date: '', city: '', country: '', description: '' });
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
    setProducts((prev) => [...prev, pendingProduct]);
    setPendingProduct({ title: '', description: '', price: '', url: '' });
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
    setCourses((prev) => [...prev, pendingCourse]);
    setPendingCourse({ title: '', description: '', url: '', price: '' });
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

    if (!formData.displayName.trim() || !formData.handle.trim()) {
      toast({
        title: 'Add your name and handle',
        description: 'We need both a display name and handle before publishing your profile.',
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
          bio: formData.bio.trim() || null,
          location: formData.location.trim() || null,
          website: formData.website.trim() || null,
          socialLinks: {
            instagram: formData.instagram.trim() || null,
            x: formData.x.trim() || null,
            tiktok: formData.tiktok.trim() || null
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
            description: event.description || null
          })),
          products: products.map((product) => ({
            title: product.title || null,
            description: product.description || null,
            price: product.price || null,
            url: product.url || null
          })),
          courses: courses.map((course) => ({
            title: course.title || null,
            description: course.description || null,
            url: course.url || null,
            price: course.price || null
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

  if (inviteStatus === 'loading' || authLoading) {
    return (
      <div className="container max-w-3xl py-16">
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Preparing your artist onboarding experience…</p>
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

  if (!user) {
    return (
      <div className="container max-w-2xl py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Sign in to continue</CardTitle>
            <CardDescription>
              This invite is reserved for <span className="font-medium text-foreground">{invite.email}</span>. Sign in or
              create an account using that email, then refresh this page to resume onboarding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="gradient" onClick={() => window.open('/login', '_blank')}
              className="w-full">
              Open login in a new tab
            </Button>
            <p className="text-xs text-muted-foreground">
              After you sign in, return to this tab and refresh to continue your onboarding steps.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inviteEmailMatchesUser) {
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
    <div className="container max-w-4xl py-12">
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
          <p>Email <a href="mailto:invite@gouachediscovery.com" className="underline">invite@gouachediscovery.com</a></p>
        </div>
      </div>

      <div className="relative mb-8 h-2 rounded-full bg-muted">
        <span className="absolute inset-y-0 left-0 rounded-full bg-foreground transition-all" style={{ width: `${stepProgress}%` }} />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/50">
          <CardTitle>{currentStepLabel}</CardTitle>
          <CardDescription>
            {currentStep === 0 && 'Welcome to Gouache! Let’s launch your profile in just a few quick steps.'}
            {currentStep === 1 && 'Tell us how you want your personal details to appear across Gouache.'}
            {currentStep === 2 && 'Upload highlight pieces for your portfolio. You can skip this now and add more later.'}
            {currentStep === 3 && 'Share any upcoming events. This step is optional and can be skipped.'}
            {currentStep === 4 && 'List products or books you sell. Optional—skip if not relevant right now.'}
            {currentStep === 5 && 'Share any courses you currently offer. Optional—skip if not available.'}
            {currentStep === 6 && 'Review everything at a glance before publishing your artist profile.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStep === 0 && (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Thanks for joining Gouache. We’ll gather the essentials to get your profile live. Each step is quick,
                and you can skip anything you’re not ready to share yet.
              </p>
              <p className="font-medium text-foreground">Select continue to get started.</p>
            </div>
          )}

          {currentStep === 1 && (
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
                <label className="text-sm font-medium text-foreground" htmlFor="website">Website or portfolio</label>
                <Input
                  id="website"
                  placeholder="https://"
                  value={formData.website}
                  onChange={(event) => setFormData((previous) => ({ ...previous, website: event.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="instagram">Instagram</label>
                  <Input
                    id="instagram"
                    placeholder="@username"
                    value={formData.instagram}
                    onChange={(event) => setFormData((previous) => ({ ...previous, instagram: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="xHandle">X / Twitter</label>
                  <Input
                    id="xHandle"
                    placeholder="@username"
                    value={formData.x}
                    onChange={(event) => setFormData((previous) => ({ ...previous, x: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="tiktok">TikTok</label>
                  <Input
                    id="tiktok"
                    placeholder="@username"
                    value={formData.tiktok}
                    onChange={(event) => setFormData((previous) => ({ ...previous, tiktok: event.target.value }))}
                  />
                </div>
              </div>
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

          {currentStep === 3 && (
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
                  <Input
                    placeholder="City / Venue city"
                    value={pendingEvent.city}
                    onChange={(event) =>
                      setPendingEvent((prev) => ({ ...prev, city: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Country"
                    value={pendingEvent.country}
                    onChange={(event) =>
                      setPendingEvent((prev) => ({ ...prev, country: event.target.value }))
                    }
                  />
                  <Textarea
                    placeholder="Event description (optional)"
                    className="sm:col-span-2"
                    value={pendingEvent.description}
                    onChange={(event) =>
                      setPendingEvent((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
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
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {event.title || 'Untitled event'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[event.city, event.country].filter(Boolean).join(', ') || 'Location TBD'}
                          </p>
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
                          onClick={() => setEvents((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Products & Books</h3>
                <p className="text-sm text-muted-foreground">
                  List any products, prints, or books subscribers can purchase. Optional—skip if you don’t have any yet.
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
                          onClick={() => setProducts((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                          onClick={() => setCourses((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 6 && (
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
              <p className="text-xs text-muted-foreground">
                By clicking “Publish my profile” you agree to Gouache’s community guidelines and confirm you’re ready to
                be discovered by the Gouache community.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button variant="ghost" onClick={handlePreviousStep}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {currentStep >= 2 && currentStep < STEPS.length - 1 && (
            <Button variant="outline" onClick={handleSkipStep}>
              Skip this step
            </Button>
          )}
          {currentStep < STEPS.length - 1 && (
            <Button variant="gradient" onClick={handleNextStep}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {currentStep === STEPS.length - 1 && (
            <Button variant="gradient" onClick={handleCompleteOnboarding} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing…
                </>
              ) : (
                'Publish my profile'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
