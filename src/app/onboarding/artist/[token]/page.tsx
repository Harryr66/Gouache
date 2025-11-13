'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/auth-provider';
import { toast } from '@/hooks/use-toast';
import { ArtistInvite } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const STEPS = ['Welcome', 'Profile basics', 'Artist details', 'Review & launch'];

interface FormState {
  displayName: string;
  handle: string;
  bio: string;
  artistStatement: string;
  location: string;
  website: string;
  instagram: string;
  x: string;
  tiktok: string;
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

  const [formData, setFormData] = useState<FormState>({
    displayName: '',
    handle: '',
    bio: '',
    artistStatement: '',
    location: '',
    website: '',
    instagram: '',
    x: '',
    tiktok: ''
  });

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
      bio: user.bio || previous.bio,
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

    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1);
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

    setIsSubmitting(true);

    try {
      const profileRef = doc(db, 'userProfiles', user.id);
      await setDoc(
        profileRef,
        {
          name: formData.displayName.trim(),
          displayName: formData.displayName.trim(),
          handle: formData.handle.trim(),
          bio: formData.bio.trim(),
          artistStatement: formData.artistStatement.trim() || null,
          location: formData.location.trim() || null,
          website: formData.website.trim() || null,
          socialLinks: {
            instagram: formData.instagram.trim() || null,
            x: formData.x.trim() || null,
            tiktok: formData.tiktok.trim() || null
          },
          accountRole: 'artist',
          isProfessional: true,
          artistInviteToken: invite.token,
          artistOnboarding: {
            completed: true,
            version: 1,
            completedAt: serverTimestamp()
          },
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

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
          <p className="text-sm text-muted-foreground">Step {currentStep + 1} of {STEPS.length} • {currentStepLabel}</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Need help?</p>
          <p>Email <a href="mailto:hello@gouachediscovery.com" className="underline">hello@gouachediscovery.com</a></p>
        </div>
      </div>

      <div className="relative mb-8 h-2 rounded-full bg-muted">
        <span className="absolute inset-y-0 left-0 rounded-full bg-foreground transition-all" style={{ width: `${stepProgress}%` }} />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/50">
          <CardTitle>{currentStepLabel}</CardTitle>
          <CardDescription>
            {currentStep === 0 && 'Welcome to Gouache! We’ll capture a few essentials to launch your artist presence.'}
            {currentStep === 1 && 'Tell us how you want your name and handle to appear across Gouache.'}
            {currentStep === 2 && 'Share a snapshot of your practice so collectors and fans know what you create.'}
            {currentStep === 3 && 'Review everything at a glance before publishing your artist profile.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStep === 0 && (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Gouache connects emerging artists with collectors, curators, and creative collaborators. We’ll walk you
                through the essentials now—plan for about five minutes.
              </p>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">What you’ll need</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    <li>Your preferred artist name and public handle.</li>
                    <li>A short introduction or artist statement.</li>
                    <li>Links you want to share, like portfolio or social profiles.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">After onboarding</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    <li>Upload hero imagery and portfolio pieces.</li>
                    <li>Publish upcoming events and releases.</li>
                    <li>Unlock Gouache discovery features and artist analytics.</li>
                  </ul>
                </div>
              </div>
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
                <label className="text-sm font-medium text-foreground" htmlFor="bio">Short bio (optional)</label>
                <Textarea
                  id="bio"
                  placeholder="Abstract expressionist painter exploring emotion through colour..."
                  value={formData.bio}
                  onChange={(event) => setFormData((previous) => ({ ...previous, bio: event.target.value }))}
                  rows={5}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="grid gap-6">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="artistStatement">Artist statement</label>
                <Textarea
                  id="artistStatement"
                  placeholder="Share what drives your practice, recurring themes, or the mediums you work with."
                  value={formData.artistStatement}
                  onChange={(event) => setFormData((previous) => ({ ...previous, artistStatement: event.target.value }))}
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

          {currentStep === 3 && (
            <div className="space-y-5">
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
                <h3 className="text-sm font-semibold text-foreground">Practice overview</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {formData.artistStatement || 'Add an artist statement later if you prefer.'}
                </p>
              </div>
              <Separator />
              <div className="grid gap-2 text-sm text-muted-foreground">
                <p>Location: <span className="text-foreground">{formData.location || '—'}</span></p>
                <p>Website: <span className="text-foreground">{formData.website || '—'}</span></p>
                <p>Instagram: <span className="text-foreground">{formData.instagram || '—'}</span></p>
                <p>X / Twitter: <span className="text-foreground">{formData.x || '—'}</span></p>
                <p>TikTok: <span className="text-foreground">{formData.tiktok || '—'}</span></p>
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
