'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React rendering errors (like error #300)
 * Wraps image rendering to prevent crashes from invalid URLs or failed image loads
 */
export class ImageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error('ImageErrorBoundary caught error:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return this.props.fallback || (
        <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted flex items-center justify-center z-10">
          <div className="text-muted-foreground text-xs text-center px-2">Image failed to load</div>
        </div>
      );
    }

    return this.props.children;
  }
}
