'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Mail, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  Info,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NewsletterIntegrationWizardProps {
  onComplete?: () => void;
}

export function NewsletterIntegrationWizard({ onComplete }: NewsletterIntegrationWizardProps) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<{
    provider?: 'convertkit' | 'mailchimp' | 'substack' | 'custom' | null;
    formId?: string;
    connectedAt?: Date;
    subscriberCount?: number;
  }>({});
  
  const [formData, setFormData] = useState({
    provider: 'convertkit' as 'convertkit' | 'mailchimp' | 'substack' | 'custom',
    apiKey: '',
    formId: '',
    newsletterLink: '', // For custom provider
  });

  useEffect(() => {
    if (user) {
      loadNewsletterStatus();
    }
  }, [user]);

  const loadNewsletterStatus = async () => {
    if (!user) return;
    
    setCheckingStatus(true);
    try {
      const userDoc = await getDoc(doc(db, 'userProfiles', user.id));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setNewsletterStatus({
          provider: data.newsletterProvider || null,
          formId: data.newsletterFormId || undefined,
          connectedAt: data.newsletterConnectedAt?.toDate?.() || undefined,
          subscriberCount: data.newsletterSubscriberCount || undefined,
        });
        
        // Pre-fill form if connected
        if (data.newsletterProvider) {
          setFormData(prev => ({
            ...prev,
            provider: data.newsletterProvider || 'convertkit',
            formId: data.newsletterFormId || '',
            newsletterLink: data.newsletterLink || '',
          }));
        }
      }
    } catch (error) {
      console.error('Error loading newsletter status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleTestConnection = async () => {
    if (!user) {
      toast({
        title: "Not signed in",
        description: "Please sign in to test your newsletter connection.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.apiKey || !formData.formId) {
      toast({
        title: "Missing information",
        description: "Please enter both API key and Form ID.",
        variant: "destructive"
      });
      return;
    }

    setTestingConnection(true);
    try {
      const response = await fetch('/api/newsletter/integrations/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: formData.provider,
          apiKey: formData.apiKey,
          formId: formData.formId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Connection test failed');
      }

      const data = await response.json();
      toast({
        title: "Connection successful!",
        description: data.message || "Your newsletter integration is working correctly.",
      });
    } catch (error: any) {
      console.error('Error testing connection:', error);
      toast({
        title: "Connection test failed",
        description: error.message || "Could not connect to your newsletter provider. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleConnect = async () => {
    if (!user) {
      toast({
        title: "Not signed in",
        description: "Please sign in to connect your newsletter.",
        variant: "destructive"
      });
      return;
    }

    // For custom provider, just save the URL
    if (formData.provider === 'custom') {
      if (!formData.newsletterLink) {
        toast({
          title: "URL required",
          description: "Please enter your newsletter signup URL.",
          variant: "destructive"
        });
        return;
      }

      setLoading(true);
      try {
        await updateDoc(doc(db, 'userProfiles', user.id), {
          newsletterProvider: 'custom',
          newsletterLink: formData.newsletterLink,
          newsletterConnectedAt: new Date(),
        });
        
        await refreshUser();
        await loadNewsletterStatus();
        
        toast({
          title: "Newsletter connected!",
          description: "Your newsletter link has been saved.",
        });
        
        if (onComplete) {
          onComplete();
        }
      } catch (error: any) {
        console.error('Error connecting newsletter:', error);
        toast({
          title: "Connection failed",
          description: error.message || "Failed to save newsletter link. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // For API-based providers, require API key and form ID
    if (!formData.apiKey || !formData.formId) {
      toast({
        title: "Missing information",
        description: "Please enter both API key and Form ID.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/newsletter/integrations/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: formData.provider,
          apiKey: formData.apiKey,
          formId: formData.formId,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to connect newsletter');
      }

      const data = await response.json();
      
      // API route already updates Firestore, just refresh
      await refreshUser();
      await loadNewsletterStatus();
      
      toast({
        title: "Newsletter connected!",
        description: "Your newsletter integration is now active. Visitors can subscribe directly from your profile.",
      });
      
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('Error connecting newsletter:', error);
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect newsletter. Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to disconnect your newsletter integration? Visitors will no longer be able to subscribe from your profile.')) {
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'userProfiles', user.id), {
        newsletterProvider: null,
        newsletterApiKey: null,
        newsletterFormId: null,
        newsletterConnectedAt: null,
        newsletterSubscriberCount: null,
        newsletterLink: null, // Clear old newsletter link too
      });
      
      await refreshUser();
      await loadNewsletterStatus();
      
      // Reset form
      setFormData({
        provider: 'convertkit',
        apiKey: '',
        formId: '',
        newsletterLink: '',
      });
      
      toast({
        title: "Newsletter disconnected",
        description: "Your newsletter integration has been removed.",
      });
    } catch (error: any) {
      console.error('Error disconnecting newsletter:', error);
      toast({
        title: "Disconnect failed",
        description: "Could not disconnect newsletter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!newsletterStatus.provider) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Connected</Badge>;
  };

  const getProgress = () => {
    if (!newsletterStatus.provider) return 0;
    return 100;
  };

  if (checkingStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Newsletter Integration
            </CardTitle>
            <CardDescription>
              Connect your newsletter provider to allow visitors to subscribe directly from your profile
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={getProgress()} className="h-2" />
        
        {!newsletterStatus.provider ? (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Get Started</AlertTitle>
              <AlertDescription>
                Add a newsletter link to your profile. Choose a simple link or connect a provider for direct subscriptions.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Newsletter Option</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value as any }))}
                >
                  <SelectTrigger id="provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Simple Link (Easiest)</SelectItem>
                    <SelectItem value="convertkit">ConvertKit (Direct Integration)</SelectItem>
                    <SelectItem value="mailchimp">Mailchimp (Direct Integration)</SelectItem>
                    <SelectItem value="substack">Substack (Direct Integration)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.provider === 'custom' 
                    ? 'Just add a link to your newsletter signup page or landing page.'
                    : 'Connect your provider to allow visitors to subscribe directly from your profile.'}
                </p>
              </div>

              {formData.provider === 'custom' ? (
                <div className="space-y-2">
                  <Label htmlFor="newsletterLink">Newsletter or Landing Page URL</Label>
                  <Input
                    id="newsletterLink"
                    type="url"
                    placeholder="https://example.com/newsletter or https://example.com/signup"
                    value={formData.newsletterLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, newsletterLink: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Add any URL to your newsletter signup page, landing page, or website. Visitors will be redirected when they click the newsletter link on your profile.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your API key"
                      value={formData.apiKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.provider === 'convertkit' && 'Find this in ConvertKit → Settings → Advanced → API Secret'}
                      {formData.provider === 'mailchimp' && 'Find this in Mailchimp → Account → Extras → API keys'}
                      {formData.provider === 'substack' && 'Find this in Substack → Settings → API'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="formId">
                      {formData.provider === 'convertkit' ? 'Form ID' : formData.provider === 'mailchimp' ? 'List ID' : 'Publication ID'}
                    </Label>
                    <Input
                      id="formId"
                      type="text"
                      placeholder={formData.provider === 'convertkit' ? '1234567' : formData.provider === 'mailchimp' ? 'abc123def456' : 'publication-id'}
                      value={formData.formId}
                      onChange={(e) => setFormData(prev => ({ ...prev, formId: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.provider === 'convertkit' && 'Find this in ConvertKit → Forms → Your Form → Settings'}
                      {formData.provider === 'mailchimp' && 'Find this in Mailchimp → Audience → Settings → Audience name and defaults'}
                      {formData.provider === 'substack' && 'Find this in your Substack publication URL'}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testingConnection || !formData.apiKey || !formData.formId}
                    className="w-full"
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Info className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            <Button 
              onClick={handleConnect} 
              disabled={loading || (formData.provider !== 'custom' && (!formData.apiKey || !formData.formId)) || (formData.provider === 'custom' && !formData.newsletterLink)}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Connect Newsletter
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-500">Newsletter Connected</AlertTitle>
              <AlertDescription>
                Your newsletter integration is active. Visitors can subscribe directly from your profile.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Provider</div>
                <div className="font-semibold capitalize">
                  {newsletterStatus.provider}
                </div>
              </div>
              {newsletterStatus.formId && (
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">
                    {newsletterStatus.provider === 'convertkit' ? 'Form ID' : newsletterStatus.provider === 'mailchimp' ? 'List ID' : 'Publication ID'}
                  </div>
                  <div className="font-mono text-xs">
                    {newsletterStatus.formId}
                  </div>
                </div>
              )}
            </div>

            {newsletterStatus.subscriberCount !== undefined && (
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Subscribers</div>
                <div className="text-2xl font-bold">
                  {newsletterStatus.subscriberCount.toLocaleString()}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={loading}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Disconnect Newsletter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

