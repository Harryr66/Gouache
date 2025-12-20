'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Send, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorReport {
  message: string;
  stack?: string;
  route: string;
  timestamp: string;
  userAgent: string;
  userContext?: string;
}

export function HueChatbot() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorReport, setErrorReport] = useState<ErrorReport | null>(null);
  const [userContext, setUserContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const orbRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize position on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Position in bottom-right corner with some padding
      const updatePosition = () => {
        setPosition({
          x: window.innerWidth - 80,
          y: window.innerHeight - 80
        });
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    }
  }, []);

  // Global error handler
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
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isExpanded) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !isExpanded) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Keep within viewport bounds
        const maxX = window.innerWidth - 64;
        const maxY = window.innerHeight - 64;
        const minX = 0;
        const minY = 0;
        
        setPosition({
          x: Math.max(minX, Math.min(maxX, newX)),
          y: Math.max(minY, Math.min(maxY, newY))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, isExpanded]);

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

  // Count words (split by whitespace and filter empty strings)
  const wordCount = userContext.trim() ? userContext.trim().split(/\s+/).filter(Boolean).length : 0;
  const maxWords = 100;
  const isOverLimit = wordCount > maxWords;

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
          "relative pointer-events-auto cursor-grab active:cursor-grabbing transition-all duration-300",
          isExpanded ? "w-0 h-0 opacity-0" : "w-16 h-16",
          hasError && !isExpanded && "animate-pulse scale-110"
        )}
        onMouseDown={handleMouseDown}
        onClick={() => !isDragging && setIsExpanded(true)}
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
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
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
            <CardTitle className="flex items-center gap-2 pr-8">
              <div className={cn(
                "w-10 h-10 rounded-full",
                hasError ? "bg-gradient-to-br from-red-500 to-pink-500" : "bg-gradient-to-br from-blue-500 to-purple-500"
              )} />
              <span>Hey, I'm Hue</span>
            </CardTitle>
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
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  I'm here to help if something goes wrong!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
