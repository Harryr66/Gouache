'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Send, AlertCircle, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { setHueErrorHandler } from '@/lib/hue-error-reporter';

interface ErrorReport {
  message: string;
  stack?: string;
  route: string;
  timestamp: string;
  userAgent: string;
  userContext?: string;
  errorType?: string;
  errorCode?: string;
}

export function HueChatbot() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Only show Hue for authenticated users (not anonymous/guests)
  // Check if user exists and has an email (not anonymous)
  const isAuthenticated = user?.id && user?.email && user.email !== '';
  
  // Don't render Hue UI if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorReport, setErrorReport] = useState<ErrorReport | null>(null);
  const [userContext, setUserContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [hueEnabled, setHueEnabled] = useState(true);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');
  const [displayedAnswer, setDisplayedAnswer] = useState('');
  const [showGreeting, setShowGreeting] = useState(true);
  const orbRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasExpandedRef = useRef(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Reset conversation state when closing Hue
  const resetConversation = () => {
    setQuestion('');
    setAnswer('');
    setDisplayedAnswer('');
    setPlaceholderText('');
    setIsAsking(false);
    setIsSubmitted(false);
    setShowGreeting(true);
  };

  // Reset all Hue state including errors
  const resetAllState = () => {
    resetConversation();
    setHasError(false);
    setErrorReport(null);
    setUserContext('');
  };

  // Load user preference for Hue visibility
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadHuePreference = () => {
      // For guests (no user.id), use localStorage
      if (!user?.id) {
        const savedPreference = localStorage.getItem('hue-enabled');
        if (savedPreference !== null) {
          setHueEnabled(savedPreference === 'true');
        } else {
          // Default to true for guests
          setHueEnabled(true);
        }
        return;
      }

      // For authenticated users, use Firestore
      const userRef = doc(db, 'userProfiles', user.id);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const enabled = userData.preferences?.hueEnabled !== false; // Default to true
          setHueEnabled(enabled);
        }
      });

      return unsubscribe;
    };

    const unsubscribe = loadHuePreference();

    // Listen for localStorage changes (for guests)
    if (!user?.id) {
      const handleStorageChange = (e: StorageEvent | Event) => {
        if (e instanceof StorageEvent && e.key === 'hue-enabled') {
          setHueEnabled(e.newValue === 'true');
        } else if (e.type === 'hue-preference-changed') {
          // Custom event from settings page
          const savedPreference = localStorage.getItem('hue-enabled');
          if (savedPreference !== null) {
            setHueEnabled(savedPreference === 'true');
          }
        }
      };

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('hue-preference-changed', handleStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('hue-preference-changed', handleStorageChange);
        if (unsubscribe) unsubscribe();
      };
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

  // Load saved position from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPosition = localStorage.getItem('hue-position');
      if (savedPosition) {
          try {
            const { x, y } = JSON.parse(savedPosition);
            // Validate saved position is still within viewport
            const orbSize = 48; // Fixed smaller size for both mobile and desktop
            const padding = isMobile ? 8 : 16;
            // Use document.documentElement.clientWidth for accurate viewport width (excludes scrollbar)
            const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
            const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
            
            // Define header heights
            const headerHeight = isMobile ? 56 : 64; // h-14 (56px) for mobile, h-16 (64px) for desktop
            const minY = headerHeight + 8; // 8px padding below header
            
            // Define bottom constraints
            const browserNavHeight = isMobile ? 80 : 0;
            const appNavHeight = isMobile ? 60 : 0;
            const bottomPadding = isMobile ? 10 : 16; // Reduced from 20 to 10 for mobile to allow lower position
            const maxY = Math.max(0, viewportHeight - browserNavHeight - appNavHeight - bottomPadding);
            
            const maxX = Math.max(0, viewportWidth - orbSize - padding);
            
            if (x >= 0 && x <= maxX && y >= minY && y <= maxY) {
              setPosition({ x, y });
              return; // Use saved position
            }
          } catch (e) {
            console.warn('Failed to parse saved Hue position:', e);
          }
      }
      
      // No valid saved position, use default
      const updatePosition = () => {
        const orbSize = 48; // Fixed smaller size for both mobile and desktop
        // Use document.documentElement.clientWidth for accurate viewport width (excludes scrollbar)
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
        
        // Define header heights
        const headerHeight = isMobile ? 56 : 64; // h-14 (56px) for mobile, h-16 (64px) for desktop
        const minY = headerHeight + 8; // 8px padding below header
        
        if (isMobile) {
          // Mobile: position above nav bar and browser controls, but allow lower position
          const browserNavHeight = 80; // Browser navigation bar height
          const appNavHeight = 60; // App navigation bar height
          const bottomPadding = 10; // Reduced from 20 to allow Hue to come lower
          const maxY = Math.max(0, viewportHeight - browserNavHeight - appNavHeight - bottomPadding);
          
          const defaultPos = {
            x: Math.max(0, viewportWidth - orbSize - 8), // Ensure never negative, 8px from right edge
            y: Math.max(minY, Math.min(maxY, viewportHeight * 0.7)) // Position in lower 30% of viewport, but within constraints
          };
          setPosition(defaultPos);
          // Save default position
          localStorage.setItem('hue-position', JSON.stringify(defaultPos));
        } else {
          // Desktop: bottom-right corner (using same smaller size)
          const bottomPadding = 16;
          const maxY = Math.max(0, viewportHeight - bottomPadding);
          
          const defaultPos = {
            x: Math.max(0, viewportWidth - orbSize - 16), // Position orb 16px from right edge, ensure never negative
            y: Math.max(minY, Math.min(maxY, viewportHeight - 80))
          };
          setPosition(defaultPos);
          // Save default position
          localStorage.setItem('hue-position', JSON.stringify(defaultPos));
        }
      };
      updatePosition();
      
      // Only update on resize if no saved position exists
      const handleResize = () => {
        const saved = localStorage.getItem('hue-position');
        if (!saved) {
          updatePosition();
        }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobile]);

  // Global error handler function - catches ALL errors
  const handleErrorReport = (error: Error | any, context?: string, errorType?: string, errorCode?: string) => {
    const route = window.location.pathname;
    const timestamp = new Date().toISOString();
    const userAgent = navigator.userAgent;

    // Build comprehensive error message
    let errorMessage = error?.message || String(error) || 'Unknown error';
    if (error?.code) {
      errorMessage = `[${error.code}] ${errorMessage}`;
    }
    if (context) {
      errorMessage = `${errorMessage} (Context: ${context})`;
    }

    const report: ErrorReport = {
      message: errorMessage,
      stack: error?.stack || 'No stack trace available',
      route,
      timestamp,
      userAgent,
      errorType: errorType || 'JavaScript Error',
      errorCode: errorCode || error?.code,
    };

    console.error('Hue detected error:', report);

    setErrorReport(report);
    setHasError(true);
    setIsExpanded(true);
    // Clear any previous user context to ensure fresh input
    setUserContext('');
    // Force show Hue when error detected
    setHueEnabled(true);
  };

  // Set global error handler so it can be called from anywhere
  useEffect(() => {
    setHueErrorHandler(handleErrorReport);
    return () => {
      setHueErrorHandler(null);
    };
  }, []);

  // Global error handler - ALWAYS ACTIVE even when hidden
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error || event;
      handleErrorReport(error, undefined, 'JavaScript Error');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      handleErrorReport(error, undefined, 'Unhandled Promise Rejection');
    };

    // Intercept fetch errors - only catch actual errors, not intentional non-200 responses
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Only report 5xx server errors as actual errors (4xx are usually intentional)
        if (response.status >= 500) {
          const error = new Error(`Server Error ${response.status}: ${response.statusText}`);
          (error as any).code = `HTTP_${response.status}`;
          (error as any).status = response.status;
          handleErrorReport(error, `API call to ${args[0]}`, 'Server Error', `HTTP_${response.status}`);
        }
        
        return response;
      } catch (error: any) {
        // Network errors, CORS errors, timeout, etc.
        // Only report if it's not a user-initiated abort
        if (error?.name !== 'AbortError') {
          handleErrorReport(error, `API call to ${args[0]}`, 'Network Error', error?.code || error?.name);
        }
        throw error; // Re-throw to maintain original behavior
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.fetch = originalFetch; // Restore original fetch
    };
  }, []);

  // Handle mouse dragging (desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isExpanded) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // Handle touch dragging (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isExpanded && e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    }
  };


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !isExpanded) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Keep within viewport bounds
        // Fixed smaller size for both mobile and desktop
        const orbSize = 48; // Fixed size
        const padding = isMobile ? 8 : 16; // Padding from right edge
        // Use document.documentElement.clientWidth for accurate viewport width (excludes scrollbar)
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
        const maxX = Math.max(0, viewportWidth - orbSize - padding);
        const minX = 0;
        
        // Define header heights
        const headerHeight = isMobile ? 56 : 64; // h-14 (56px) for mobile, h-16 (64px) for desktop
        const minY = headerHeight + 8; // 8px padding below header to prevent overlap
        
        let maxY;
        if (isMobile) {
          // Mobile: prevent going below navigation bars, but allow lower position
          const browserNavHeight = 80;
          const appNavHeight = 60;
          const bottomPadding = 10; // Reduced from 20 to allow Hue to come lower
          maxY = Math.max(0, viewportHeight - browserNavHeight - appNavHeight - bottomPadding);
        } else {
          const bottomPadding = 16;
          maxY = Math.max(0, viewportHeight - bottomPadding);
        }
        
        const newPosition = {
          x: Math.max(minX, Math.min(maxX, newX)),
          y: Math.max(minY, Math.min(maxY, newY))
        };
        setPosition(newPosition);
        // Save position in real-time during drag
        localStorage.setItem('hue-position', JSON.stringify(newPosition));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMoveGlobal = (e: TouchEvent) => {
      if (isDragging && touchStart && e.touches.length === 1 && !isExpanded) {
        e.preventDefault();
        const touch = e.touches[0];
        const newX = touch.clientX - dragStart.x;
        const newY = touch.clientY - dragStart.y;
        
        // Keep within viewport bounds
        // Fixed smaller size for both mobile and desktop
        const orbSize = 48; // Fixed size
        const padding = isMobile ? 8 : 16; // Padding from right edge
        // Use document.documentElement.clientWidth for accurate viewport width (excludes scrollbar)
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
        const maxX = Math.max(0, viewportWidth - orbSize - padding);
        const minX = 0;
        
        // Define header heights
        const headerHeight = isMobile ? 56 : 64; // h-14 (56px) for mobile, h-16 (64px) for desktop
        const minY = headerHeight + 8; // 8px padding below header to prevent overlap
        
        let maxY;
        if (isMobile) {
          // Mobile: prevent going below navigation bars, but allow lower position
          const browserNavHeight = 80;
          const appNavHeight = 60;
          const bottomPadding = 10; // Reduced from 20 to allow Hue to come lower
          maxY = Math.max(0, viewportHeight - browserNavHeight - appNavHeight - bottomPadding);
        } else {
          const bottomPadding = 16;
          maxY = Math.max(0, viewportHeight - bottomPadding);
        }
        
        const newPosition = {
          x: Math.max(minX, Math.min(maxX, newX)),
          y: Math.max(minY, Math.min(maxY, newY))
        };
        setPosition(newPosition);
        // Save position in real-time during drag
        localStorage.setItem('hue-position', JSON.stringify(newPosition));
      }
    };

    const handleTouchEndGlobal = () => {
      setIsDragging(false);
      setTouchStart(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false });
      window.addEventListener('touchend', handleTouchEndGlobal);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMoveGlobal);
      window.removeEventListener('touchend', handleTouchEndGlobal);
    };
  }, [isDragging, dragStart, isExpanded, isMobile, touchStart]);

  const handleSend = async () => {
    if (!errorReport || !userContext.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/hue/report-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...errorReport,
          userContext: userContext.trim().substring(0, 500), // Cap at 500 chars
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setTimeout(() => {
          setIsExpanded(false);
          resetAllState(); // Reset all state after error report is submitted
        }, 3000);
      } else {
        console.error('Failed to submit error report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || isAsking) return;

    setIsAsking(true);
    setAnswer('');
    try {
      const response = await fetch('/api/hue/ask-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          route: window.location.pathname,
        }),
      });

      console.log('API response status:', response.status);
      const responseText = await response.text();
      console.log('API response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse API response as JSON:', responseText);
        setAnswer('I apologize, but I received an invalid response from the server. Please check Vercel logs for details.');
        return;
      }
      
      if (response.ok) {
        if (data.error) {
          console.error('API returned error:', data.error, data.details);
          setAnswer(`I apologize, but I encountered an error: ${data.error}. ${data.details ? `Details: ${data.details}` : 'Please check that the GOOGLE_GENAI_API_KEY is set in your environment variables.'}`);
        } else {
          setAnswer(data.answer || 'I apologize, but I couldn\'t generate an answer. Please try rephrasing your question.');
        }
      } else {
        console.error('API request failed:', response.status, data);
        setAnswer(`I apologize, but I encountered an error (${response.status}). ${data.error || data.details || 'Please check that the GOOGLE_GENAI_API_KEY is set in Vercel environment variables and redeploy.'}`);
      }
    } catch (error: any) {
      console.error('Error asking question:', error);
      
      // Report error to Hue for critical issues
      if (error?.message?.includes('Network') || error?.code === 'NETWORK_ERROR' || !error?.message) {
        handleErrorReport(error, 'Asking Hue a question', 'Hue Q&A Error', error?.code);
      }
      
      setAnswer(`I apologize, but I encountered an error: ${error.message || 'Network error'}. Please check that the GOOGLE_GENAI_API_KEY is configured in your Vercel environment variables.`);
    } finally {
      setIsAsking(false);
    }
  };

  const handleHideHue = async () => {
    // For guests (no user.id), use localStorage
    if (!user?.id) {
      try {
        localStorage.setItem('hue-enabled', 'false');
        setHueEnabled(false);
        setIsExpanded(false);
        resetAllState(); // Reset all state when hiding
        
        // Dispatch event to notify other components (though not needed here, for consistency)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('hue-preference-changed'));
        }
        
        toast({
          title: 'Hue hidden',
          description: 'Hue can be reactivated in general settings.',
        });
        return;
      } catch (error: any) {
        console.error('Error saving Hue preference to localStorage:', error);
        toast({
          title: 'Error',
          description: 'Failed to save preference. Please try again.',
          variant: 'destructive'
        });
        return;
      }
    }

    // For authenticated users, use Firestore
    try {
      const userRef = doc(db, 'userProfiles', user.id);
      const userDoc = await getDoc(userRef);
      
      // Get existing preferences or create empty object
      const currentData = userDoc.exists() ? (userDoc.data() || {}) : {};
      const existingPreferences = currentData.preferences || {};
      
      // Merge preferences safely - this preserves all nested preference objects
      const updatedPreferences = {
        ...existingPreferences,
        hueEnabled: false
      };
      
      // Use setDoc with merge: true to only update the preferences field
      // This ensures we don't overwrite other document fields
      await setDoc(userRef, {
        preferences: updatedPreferences
      }, { merge: true });

      // Update local state immediately for better UX
      setHueEnabled(false);
      setIsExpanded(false);
      resetAllState(); // Reset all state when hiding
      
      toast({
        title: 'Hue hidden',
        description: 'Hue can be reactivated in general settings.',
      });
    } catch (error: any) {
      console.error('Error hiding Hue:', error);
      
      // Log detailed error information
      const errorDetails = {
        message: error?.message || String(error),
        code: error?.code,
        stack: error?.stack,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        route: window.location.pathname,
        errorName: error?.name
      };
      
      console.error('Hue hide error details:', errorDetails);
      
      // Always report errors to Hue for debugging
      handleErrorReport(
        error, 
        'Attempting to hide Hue by clicking the hide button', 
        'Hue Settings Error', 
        error?.code || error?.name
      );
      
      // Show user-friendly error message
      let errorMessage = 'Failed to hide Hue. Please try again.';
      if (error?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account permissions.';
      } else if (error?.code === 'unavailable') {
        errorMessage = 'Service unavailable. Please check your connection and try again.';
      } else if (error?.code === 'failed-precondition') {
        errorMessage = 'Operation failed. Please refresh the page and try again.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // Count words (split by whitespace and filter empty strings)
  const wordCount = userContext.trim() ? userContext.trim().split(/\s+/).filter(Boolean).length : 0;
  const maxWords = 100;
  const isOverLimit = wordCount > maxWords;

  // Reset all state when Hue is closed (only when transitioning from expanded to collapsed)
  useEffect(() => {
    if (wasExpandedRef.current && !isExpanded) {
      // Reset all state when transitioning from expanded to collapsed
      // This ensures a fresh start when Hue is reopened
      resetAllState();
    }
    wasExpandedRef.current = isExpanded;
  }, [isExpanded]);

  // Typewriter effect for placeholder text
  useEffect(() => {
    if (!isExpanded || hasError) return;
    
    const fullPlaceholder = "Have an issue? Here's a tissue... I'm here to help with questions or issues";
    setPlaceholderText('');
    setShowGreeting(false); // No separate greeting, it's in the placeholder
    
    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      if (currentIndex < fullPlaceholder.length) {
        setPlaceholderText(fullPlaceholder.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 30); // 30ms per character for smooth typing

    return () => clearInterval(typeInterval);
  }, [isExpanded, hasError]);

  // Typewriter effect for answer
  useEffect(() => {
    if (!answer) {
      setDisplayedAnswer('');
      return;
    }

    setDisplayedAnswer('');
    setShowGreeting(false);
    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      if (currentIndex < answer.length) {
        setDisplayedAnswer(answer.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 20); // 20ms per character for answer typing

    return () => clearInterval(typeInterval);
  }, [answer]);

  // Don't render if disabled (unless error detected)
  if (!hueEnabled && !hasError) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-[9999] pointer-events-none"
      style={{
        ...(isExpanded ? {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        } : {
          left: `${position.x}px`,
          top: `${position.y}px`,
          // Fixed positioning to prevent jolts
          position: 'fixed',
          willChange: 'transform',
        })
      }}
    >
      {/* Draggable Orb */}
      <div
        ref={orbRef}
        className={cn(
          "relative pointer-events-auto cursor-grab active:cursor-grabbing",
          isExpanded ? "w-0 h-0 opacity-0" : "w-12 h-12", // Fixed smaller size for both mobile and desktop
          hasError && !isExpanded && "animate-pulse"
        )}
        style={{
          // Prevent pinch zoom when dragging Hue
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          // Fixed size to prevent fluctuation
          width: isExpanded ? 0 : '48px',
          height: isExpanded ? 0 : '48px',
          minWidth: isExpanded ? 0 : '48px',
          minHeight: isExpanded ? 0 : '48px',
          maxWidth: isExpanded ? 0 : '48px',
          maxHeight: isExpanded ? 0 : '48px',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={(e) => {
          if (!isDragging) {
            e.preventDefault();
            setIsExpanded(true);
          }
        }}
      >
        <div className={cn(
          "w-full h-full rounded-full flex items-center justify-center story-gradient-border",
          hasError ? "animate-pulse" : "hue-orb-idle"
        )}>
          <div className="w-full h-full rounded-full bg-background" />
        </div>
      </div>

      {/* Expanded Error Report Card */}
      {isExpanded && (
        <Card className={cn(
          "pointer-events-auto w-[90vw] max-w-md shadow-2xl border-2 transition-all duration-300",
          hasError ? "border-red-500/50" : "border-primary/50"
        )}>
          <CardHeader className="relative">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 flex-1 min-w-0">
                <div className={cn(
                  "w-8 h-8 rounded-full story-gradient-border flex items-center justify-center flex-shrink-0"
                )}>
                  <div className="w-full h-full rounded-full bg-background" />
                </div>
                <span className="text-base whitespace-nowrap">Hey, I'm Hue</span>
              </CardTitle>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!hasError && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleHideHue}
                    className="h-6 w-6"
                    title="Hide Hue"
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setIsExpanded(false);
                    // Always reset all state when closing, including error states
                    resetAllState();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSubmitted ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Thanks! I've sent this to the dev team. They'll fix it soon.
                </p>
              </div>
            ) : hasError && errorReport ? (
              <>
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Looks like something's broken
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {errorReport.message}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-2">
                    Tell me what you were trying to do—I'll get someone to fix it.
                  </p>
                  <Textarea
                    value={userContext}
                    onChange={(e) => {
                      const text = e.target.value;
                      // Limit to approximately 100 words (roughly 500 characters)
                      const words = text.trim().split(/\s+/).filter(Boolean);
                      if (words.length <= maxWords) {
                        setUserContext(text);
                      } else {
                        // Truncate to last valid word
                        const truncated = words.slice(0, maxWords).join(' ');
                        setUserContext(truncated);
                      }
                    }}
                    placeholder="I was trying to..."
                    className={cn(
                      "min-h-[100px] resize-none",
                      isOverLimit && "border-destructive"
                    )}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className={cn(
                      "text-xs",
                      isOverLimit ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {wordCount} / {maxWords} words
                    </p>
                    {isOverLimit && (
                      <p className="text-xs text-destructive font-medium">
                        Please keep it under {maxWords} words
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!userContext.trim() || isOverLimit || isSubmitting}
                  className="w-full gradient-button"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Sending...' : 'Send Report'}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                {/* Answer Display */}
                {displayedAnswer ? (
                  <div className="p-3 bg-muted/50 border border-border rounded-lg min-h-[60px]">
                    <p className="text-sm whitespace-pre-wrap">
                      {displayedAnswer}
                      {displayedAnswer.length < answer.length && (
                        <span className="animate-pulse">|</span>
                      )}
                    </p>
                  </div>
                ) : null}
                
                {/* Question Input */}
                <div className="space-y-2">
                  <Textarea
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value);
                      // Clear answer when typing a new question
                      if (answer) {
                        setAnswer('');
                        setDisplayedAnswer('');
                      }
                    }}
                    placeholder={placeholderText || "Have an issue? Here's a tissue... I'm here to help with questions or issues"}
                    className="min-h-[80px] resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && question.trim()) {
                        e.preventDefault();
                        handleAskQuestion();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAskQuestion}
                    disabled={!question.trim() || isAsking}
                    className="w-full gradient-button"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isAsking ? 'Thinking...' : 'Ask Question'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
