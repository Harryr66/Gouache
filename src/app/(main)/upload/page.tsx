'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Image, Package, Calendar, ArrowLeft } from 'lucide-react';
import { UploadForm } from '@/components/upload-form';
import { ThemeLoading } from '@/components/theme-loading';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function UploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<'portfolio' | 'product' | 'event' | null>('portfolio');
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const previousUserRef = useRef<User | null>(null);
  const [hasApprovedArtistRequest, setHasApprovedArtistRequest] = useState(false);

  // Listen for approved artist request as fallback when isProfessional flag is missing
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artistRequests'),
      where('userId', '==', user.id),
      where('status', '==', 'approved')
    );
    const unsub = onSnapshot(q, (snap) => {
      setHasApprovedArtistRequest(!snap.empty);
    });
    return () => unsub();
  }, [user?.id]);

  // Wait for Firestore data to load after initial auth
  // The auth provider sets loading=false immediately but loads Firestore data asynchronously
  // We track when user object changes significantly to detect when Firestore data has loaded
  useEffect(() => {
    if (loading) {
      setIsCheckingUser(true);
      setInitialLoadComplete(false);
      previousUserRef.current = null;
      return;
    }
    
    if (!user) {
      setIsCheckingUser(false);
      setInitialLoadComplete(false);
      previousUserRef.current = null;
      return;
    }

    // Check if this is the first time we're seeing this user
    const isFirstLoad = previousUserRef.current === null;
    
    if (isFirstLoad) {
      // First load - set a minimum wait time to allow Firestore to load
      previousUserRef.current = user;
      const timer = setTimeout(() => {
        // After minimum wait, check if isProfessional has been explicitly set
        // If it's still undefined, wait a bit more
        if (user.isProfessional === undefined && !user.updatedAt) {
          // Still loading Firestore data, wait more
          setTimeout(() => {
            setInitialLoadComplete(true);
            setIsCheckingUser(false);
          }, 1000);
        } else {
          setInitialLoadComplete(true);
          setIsCheckingUser(false);
        }
      }, 2000); // 2 second minimum wait
      return () => clearTimeout(timer);
    }
    
    // User object has changed - check if it's been updated with Firestore data
    if (previousUserRef.current) {
      const userChanged = previousUserRef.current.id !== user.id || 
                         previousUserRef.current.isProfessional !== user.isProfessional ||
                         previousUserRef.current.updatedAt?.getTime() !== user.updatedAt?.getTime() ||
                         (user.portfolio && user.portfolio.length !== (previousUserRef.current.portfolio?.length || 0));
      
      if (userChanged) {
        // User object has been updated (likely with Firestore data)
        previousUserRef.current = user;
        setInitialLoadComplete(true);
        setIsCheckingUser(false);
      } else if (initialLoadComplete) {
        // Already completed initial load, no need to keep checking
        setIsCheckingUser(false);
      }
    }
  }, [loading, user, initialLoadComplete]);

  // Show loading animation while auth is loading, user data is not yet available, or we're checking user status
  // Also show loading if isProfessional hasn't been explicitly loaded yet (could be undefined)
  const isProfessionalLoaded = user?.isProfessional !== undefined || user?.updatedAt !== undefined || hasApprovedArtistRequest;
  
  if (loading || !user || isCheckingUser || !isProfessionalLoaded) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <ThemeLoading size="lg" text="" />
      </div>
    );
  }

  // Check if user is a professional artist
  // At this point, isProfessional should be explicitly true or false (not undefined)
  const isProfessional = user.isProfessional === true || hasApprovedArtistRequest;

  if (!isProfessional) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="p-8 text-center">
          <CardContent>
            <h2 className="text-2xl font-bold mb-4">Professional Artist Account Required</h2>
            <p className="text-muted-foreground mb-6">
              You need a verified professional artist account to upload content.
            </p>
            <Button
              onClick={() => router.push('/profile/edit')}
              variant="gradient"
              className="mb-2"
            >
              Request Artist Account
            </Button>
            <div>
              <Button onClick={() => router.push('/profile?artistRequest=pending')} variant="outline">
                I already applied – check status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If a type is selected, show the appropriate form
  // Default to portfolio upload (fully functional)
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-4xl md:text-5xl font-semibold mb-2">
          Upload Artwork
        </h1>
        <p className="text-muted-foreground text-lg">
          Add a new piece to your portfolio to showcase your work.
        </p>
      </header>
      <UploadForm />
    </div>
  );
}
