'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { db } from '@/lib/firebase';
import { storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, Image as ImageIcon, Video, AlertCircle } from 'lucide-react';
import { AdCampaign } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  placement: z.enum(['news', 'discover', 'learn']),
  clickUrl: z.string().url('Please enter a valid URL'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  uncappedBudget: z.boolean().default(false),
  budget: z.string().optional(),
  dailyBudget: z.string().optional(),
  costPerImpression: z.string().min(1, 'Cost per impression is required'),
  costPerClick: z.string().min(1, 'Cost per click is required'),
  currency: z.string().min(1, 'Currency is required'),
}).refine((data) => {
  // Either uncappedBudget is true OR budget is provided
  return data.uncappedBudget || (data.budget && parseFloat(data.budget) > 0);
}, {
  message: "Either enable uncapped budget or provide a total budget",
  path: ["budget"],
});

interface PartnerCampaignFormProps {
  partnerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PartnerCampaignForm({ partnerId, onSuccess, onCancel }: PartnerCampaignFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      placement: 'news',
      clickUrl: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      uncappedBudget: false,
      budget: '',
      dailyBudget: '',
      costPerImpression: '',
      costPerClick: '',
      currency: 'usd',
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (mediaType === 'image') {
      // Validate image
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file.',
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      // Validate video
      if (!file.type.startsWith('video/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a video file.',
          variant: 'destructive',
        });
        return;
      }

      // Check video duration (max 60 seconds)
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        if (duration > 60) {
          toast({
            title: 'Video too long',
            description: 'Videos must be 60 seconds or less.',
            variant: 'destructive',
          });
          return;
        }
        setVideoFile(file);
        const url = URL.createObjectURL(file);
        setVideoPreview(url);
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const removeMedia = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setImageFile(null);
    setVideoFile(null);
    setImagePreview(null);
    setVideoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Validate pricing is provided
    if (!values.costPerImpression || parseFloat(values.costPerImpression) <= 0) {
      toast({
        title: 'Pricing required',
        description: 'Please enter a cost per 1,000 impressions (CPM).',
        variant: 'destructive',
      });
      return;
    }

    if (!values.costPerClick || parseFloat(values.costPerClick) <= 0) {
      toast({
        title: 'Pricing required',
        description: 'Please enter a cost per click (CPC).',
        variant: 'destructive',
      });
      return;
    }

    if (mediaType === 'image' && !imageFile) {
      toast({
        title: 'Image required',
        description: 'Please upload an image for your campaign.',
        variant: 'destructive',
      });
      return;
    }

    if (mediaType === 'video' && !videoFile) {
      toast({
        title: 'Video required',
        description: 'Please upload a video for your campaign.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;
      let videoDuration: number | undefined;

      // Upload image
      if (imageFile) {
        const imageRef = ref(storage, `ad-campaigns/${partnerId}/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Upload video
      if (videoFile) {
        const videoRef = ref(storage, `ad-campaigns/${partnerId}/${Date.now()}_${videoFile.name}`);
        await uploadBytes(videoRef, videoFile);
        videoUrl = await getDownloadURL(videoRef);

        // Get video duration
        const video = document.createElement('video');
        video.preload = 'metadata';
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            videoDuration = video.duration;
            resolve(null);
          };
          video.onerror = reject;
          video.src = URL.createObjectURL(videoFile);
        });
      }

      // Parse budget values (convert to cents)
      const budget = values.uncappedBudget ? null : (values.budget ? Math.round(parseFloat(values.budget) * 100) : undefined);
      const dailyBudget = values.dailyBudget ? Math.round(parseFloat(values.dailyBudget) * 100) : undefined;
      const costPerImpression = values.costPerImpression ? Math.round((parseFloat(values.costPerImpression) / 1000) * 100) : undefined; // CPM to cost per impression in cents
      const costPerClick = values.costPerClick ? Math.round(parseFloat(values.costPerClick) * 100) : undefined;

      // Create campaign
      const campaignData: Omit<AdCampaign, 'id'> = {
        partnerId,
        title: values.title,
        placement: values.placement,
        mediaType,
        imageUrl,
        videoUrl,
        videoDuration,
        clickUrl: values.clickUrl,
        startDate: new Date(values.startDate),
        endDate: values.endDate ? new Date(values.endDate) : undefined,
        isActive: true,
        clicks: 0,
        impressions: 0,
        budget: budget || null,
        dailyBudget,
        spent: 0,
        dailySpent: 0,
        lastSpentReset: new Date(),
        uncappedBudget: values.uncappedBudget || false,
        costPerImpression,
        costPerClick,
        currency: values.currency || 'usd',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, 'adCampaigns'), {
        ...campaignData,
        startDate: serverTimestamp(),
        endDate: values.endDate ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Campaign Created',
        description: 'Your advertising campaign has been created successfully.',
      });

      // Cleanup
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (videoPreview) URL.revokeObjectURL(videoPreview);

      onSuccess();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to create campaign. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign Title *</FormLabel>
                <FormControl>
                  <Input placeholder="Summer Art Sale" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Optional description for your campaign" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="placement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placement *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select placement" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="discover">Discover (Artwork Feed)</SelectItem>
                    <SelectItem value="learn">Learn Section</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Media Type *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mediaType === 'image' ? 'default' : 'outline'}
                onClick={() => {
                  setMediaType('image');
                  removeMedia();
                }}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Image
              </Button>
              <Button
                type="button"
                variant={mediaType === 'video' ? 'default' : 'outline'}
                onClick={() => {
                  setMediaType('video');
                  removeMedia();
                }}
              >
                <Video className="mr-2 h-4 w-4" />
                Video (max 60s)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Upload {mediaType === 'image' ? 'Image' : 'Video'} *</Label>
            {!imagePreview && !videoPreview ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="media-upload"
                />
                <label htmlFor="media-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload {mediaType === 'image' ? 'an image' : 'a video (max 60 seconds)'}
                  </p>
                </label>
              </div>
            ) : (
              <div className="relative">
                {imagePreview && (
                  <div className="relative w-full h-64 rounded-lg overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeMedia}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {videoPreview && (
                  <div className="relative w-full rounded-lg overflow-hidden">
                    <video src={videoPreview} controls className="w-full max-h-96" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeMedia}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <FormField
            control={form.control}
            name="clickUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Click URL *</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Budget Section */}
          <div className="border-t pt-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Budget & Pricing *</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Set pricing and budget limits for your campaign.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'usd'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="usd">USD ($)</SelectItem>
                        <SelectItem value="gbp">GBP (£)</SelectItem>
                        <SelectItem value="eur">EUR (€)</SelectItem>
                        <SelectItem value="cad">CAD (C$)</SelectItem>
                        <SelectItem value="aud">AUD (A$)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="costPerImpression"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Per 1,000 Impressions (CPM) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Cost per 1,000 ad views
                    </p>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costPerClick"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Per Click (CPC) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Cost when user clicks ad
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dailyBudget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Budget (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Maximum spend per day
                    </p>
                  </FormItem>
                )}
              />
            </div>

            {/* Uncapped Budget Option */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="uncappedBudget"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setShowUncappedDialog(true);
                          } else {
                            field.onChange(false);
                          }
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        Enable uncapped budget
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Ads will run continuously until manually paused or a budget is added
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {!uncappedBudget && (
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Budget *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="0.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Campaign will stop when budget is reached
                      </p>
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Uncapped Budget Disclaimer Dialog */}
            <AlertDialog open={showUncappedDialog} onOpenChange={setShowUncappedDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Uncapped Budget Warning
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      By enabling an uncapped budget, your campaign will continue to spend money on impressions and clicks until you manually pause it or add a budget limit.
                    </p>
                    <p className="font-semibold text-foreground">
                      Important:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Ads will display continuously without spending limits</li>
                      <li>You will be charged for every impression and click</li>
                      <li>You can add a budget limit at any time to cap spending</li>
                      <li>You can pause the campaign manually to stop spending</li>
                    </ul>
                    <p className="text-sm mt-3">
                      Are you sure you want to proceed with an uncapped budget?
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => {
                    form.setValue('uncappedBudget', false);
                    setShowUncappedDialog(false);
                  }}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    form.setValue('uncappedBudget', true);
                    setShowUncappedDialog(false);
                  }}>
                    I Understand, Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Campaign
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
