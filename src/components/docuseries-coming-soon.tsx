'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lock, Clock, Play, Star, Users, Calendar } from 'lucide-react';
import { useTheme } from 'next-themes';

interface DocuseriesComingSoonProps {
  onUnlock?: () => void;
}

export function DocuseriesComingSoon({ onUnlock }: DocuseriesComingSoonProps) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const { theme, resolvedTheme } = useTheme();

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Admin password - in production, this should be more secure
    const adminPassword = 'GOUACHE2024Admin';
    
    if (password === adminPassword) {
      setIsAuthenticated(true);
      setError('');
      if (onUnlock) {
        onUnlock();
      }
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  if (isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium mb-4">
            <Lock className="h-4 w-4" />
            Admin Access Granted
          </div>
          <h2 className="text-2xl font-bold mb-2">Docuseries Content</h2>
          <p className="text-muted-foreground">
            You now have access to the docuseries section. Content will be available here.
          </p>
        </div>
        
        {/* Placeholder for future docuseries content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Coming Soon
              </CardTitle>
              <CardDescription>
                Docuseries content will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Clock className="h-12 w-12 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Docuseries Coming Soon</CardTitle>
          <CardDescription className="text-base">
            This section is currently under development and will be available soon.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Preview of what's coming */}
          <div className="space-y-4">
            <div className="text-center">
              <Badge variant="secondary" className="mb-3">
                <Calendar className="h-3 w-3 mr-1" />
                Launching Soon
              </Badge>
              <h3 className="font-semibold mb-2">What to Expect</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Play className="h-4 w-4 text-purple-500" />
                <span>Art Documentaries</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Star className="h-4 w-4 text-purple-500" />
                <span>Artist Spotlights</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Users className="h-4 w-4 text-purple-500" />
                <span>Community Stories</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 text-purple-500" />
                <span>Behind the Scenes</span>
              </div>
            </div>
          </div>

          {/* Admin Access Form */}
          <div className="border-t pt-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <Label htmlFor="admin-password" className="text-sm font-medium">
                  Admin Access
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter admin password to preview content
                </p>
              </div>
              
              <div className="space-y-2">
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-center"
                />
                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                variant="gradient"
              >
                <Lock className="h-4 w-4 mr-2" />
                Access Preview
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>
              Stay tuned for the official launch of our docuseries content!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
