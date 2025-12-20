'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Send, AlertCircle, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface ErrorReport {
  message: string;
  stack?: string;
  route: string;
  timestamp: string;
  userAgent: string;
  userContext?: string;
}

export function HueChatbot() {
  const { user } = useAuth();
  const router = useRouter();
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
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Load user preference for Hue visibility
  useEffect(() => {
    if (!user?.id) return;

    const userRef = doc(db, 'userProfiles', user.id);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const enabled = userData.preferences?.hueEnabled !== false; // Default to true
        setHueEnabled(enabled);
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Initialize position on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updatePosition = () => {
        if (isMobile) {
          // Mobile: position well above nav bar and browser controls
          // Account for: app nav bar (~60px) + browser nav bar (~80px) + padding
          const browserNavHeight = 80; // Browser navigation bar height
          const appNavHeight = 60; // App navigation bar height
          const padding = 20; // Extra padding for safety
          const totalOffset = browserNavHeight + appNavHeight + padding;
          
          setPosition({
            x: window.innerWidth - 60, // 60px from right edge
            y: window.innerHeight - totalOffset // Well above all navigation bars
          });
        } else {
          // Desktop: bottom-right corner
          setPosition({
            x: window.innerWidth - 80,
            y: window.innerHeight - 80
          });
        }
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    }
  }, [isMobile]);

  // Global error handler - ALWAYS ACTIVE even when hidden
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error || event;
      const route = window.location.pathname;
      const timestamp = new Date().toISOString();
      const userAgent = navigator.userAgent;

      const report: ErrorReport = {
        message: error?.message || event.message || 'Unknown error',
        stack: error?.stack || event.filename || 'No stack trace available',
        route,
        timestamp,
        userAgent,
      };

      setErrorReport(report);
      setHasError(true);
      setIsExpanded(true);
      // Force show Hue when error detected
      setHueEnabled(true);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const route = window.location.pathname;
      const timestamp = new Date().toISOString();
      const userAgent = navigator.userAgent;

      const report: ErrorReport = {
        message: error?.message || String(error) || 'Unhandled promise rejection',
        stack: error?.stack || 'No stack trace available',
        route,
        timestamp,
        userAgent,
      };

      setErrorReport(report);
      setHasError(true);
      setIsExpanded(true);
      // Force show Hue when error detected
      setHueEnabled(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
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
        // On mobile, ensure Hue stays above navigation bars
        const orbSize = isMobile ? 48 : 64;
        const maxX = window.innerWidth - orbSize;
        const minX = 0;
        let maxY, minY;
        
        if (isMobile) {
          // Mobile: prevent going below navigation bars
          const browserNavHeight = 80;
          const appNavHeight = 60;
          const padding = 20;
          maxY = window.innerHeight - browserNavHeight - appNavHeight - padding;
          minY = 0;
        } else {
          maxY = window.innerHeight - orbSize;
          minY = 0;
        }
        
        setPosition({
          x: Math.max(minX, Math.min(maxX, newX)),
          y: Math.max(minY, Math.min(maxY, newY))
        });
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
        // On mobile, ensure Hue stays above navigation bars
        const orbSize = isMobile ? 48 : 64;
        const maxX = window.innerWidth - orbSize;
        const minX = 0;
        let maxY, minY;
        
        if (isMobile) {
          // Mobile: prevent going below navigation bars
          const browserNavHeight = 80;
          const appNavHeight = 60;
          const padding = 20;
          maxY = window.innerHeight - browserNavHeight - appNavHeight - padding;
          minY = 0;
        } else {
          maxY = window.innerHeight - orbSize;
          minY = 0;
        }
        
        setPosition({
          x: Math.max(minX, Math.min(maxX, newX)),
          y: Math.max(minY, Math.min(maxY, newY))
        });
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
          setHasError(false);
          setErrorReport(null);
          setUserContext('');
          setIsSubmitted(false);
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

      if (response.ok) {
        const data = await response.json();
        setAnswer(data.answer || 'I apologize, but I couldn\'t generate an answer. Please try rephrasing your question.');
      } else {
        setAnswer('I apologize, but I encountered an error. Please try again or check the Settings page for help.');
      }
    } catch (error) {
      console.error('Error asking question:', error);
      setAnswer('I apologize, but I encountered an error. Please try again or check the Settings page for help.');
    } finally {
      setIsAsking(false);
    }
  };

  const handleHideHue = async () => {
    if (!user?.id) {
      toast({
        title: 'Not signed in',
        description: 'Please sign in to change Hue settings.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const userRef = doc(db, 'userProfiles', user.id);
      const userDoc = await getDoc(userRef);
      const currentData = userDoc.data() || {};
      
      await updateDoc(userRef, {
        preferences: {
          ...currentData.preferences,
          hueEnabled: false
        }
      });

      setHueEnabled(false);
      setIsExpanded(false);
      
      toast({
        title: 'Hue hidden',
        description: 'Hue can be reactivated in general settings.',
      });
    } catch (error) {
      console.error('Error hiding Hue:', error);
      toast({
        title: 'Error',
        description: 'Failed to hide Hue. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Count words (split by whitespace and filter empty strings)
  const wordCount = userContext.trim() ? userContext.trim().split(/\s+/).filter(Boolean).length : 0;
  const maxWords = 100;
  const isOverLimit = wordCount > maxWords;

  // Typewriter effect for placeholder
  useEffect(() => {
    if (!isExpanded || hasError) return;
    
    const fullPlaceholder = "Ask me anything about the platform... (e.g., 'How do I sell artwork?', 'Where is my profile?', 'How do I create a course?')";
    setPlaceholderText('');
    setShowGreeting(true);
    
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
        })
      }}
    >
      {/* Draggable Orb */}
      <div
        ref={orbRef}
        className={cn(
          "relative pointer-events-auto cursor-grab active:cursor-grabbing transition-all duration-300 touch-none",
          isExpanded ? "w-0 h-0 opacity-0" : isMobile ? "w-12 h-12" : "w-16 h-16",
          hasError && !isExpanded && "animate-pulse scale-110"
        )}
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 pr-8">
                <div className={cn(
                  "w-10 h-10 rounded-full story-gradient-border flex items-center justify-center"
                )}>
                  <div className="w-full h-full rounded-full bg-background" />
                </div>
                <span>Hey, I'm Hue</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                {!hasError && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHideHue}
                    className="text-xs"
                  >
                    <EyeOff className="h-4 w-4 mr-1" />
                    Hide Hue
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setIsExpanded(false);
                    if (!hasError) {
                      setErrorReport(null);
                      setUserContext('');
                    }
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
                {/* Greeting or Answer Display */}
                {showGreeting && !displayedAnswer ? (
                  <div className="text-center py-2 min-h-[60px] flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Have an issue? Here's a tissue... I'm here to help with any questions or issues, let me know if you need any assistance
                    </p>
                  </div>
                ) : displayedAnswer ? (
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
                        setShowGreeting(true);
                      }
                    }}
                    placeholder={placeholderText}
                    className="min-h-[80px] resize-none"
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
