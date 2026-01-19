'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { db } from '@/lib/firebase';
import { storage } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, Image as ImageIcon, Video, AlertCircle, Eye, MousePointerClick } from 'lucide-react';
import { AdCampaign } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  placement: z.enum(['news', 'discover', 'learn']), // Legacy field for backwards compatibility
  placements: z.array(z.enum(['discover-tiles', 'news-tiles', 'news-banner', 'learn-tiles', 'learn-banner'])).min(1, 'Select at least one placement'),
  adFormat: z.enum(['square', 'portrait', 'large', 'banner']),
  clickUrl: z.string().url('Please enter a valid URL'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  uncappedBudget: z.boolean().default(false),
  budget: z.string().optional(),
  dailyBudget: z.string().optional(),
  billingModel: z.enum(['cpm', 'cpc']),
  costPerImpression: z.string().optional(),
  costPerClick: z.string().optional(),
  currency: z.string().min(1, 'Currency is required'),
}).refine((data) => {
  // Either uncappedBudget is true OR budget is provided
  return data.uncappedBudget || (data.budget && parseFloat(data.budget) > 0);
}, {
  message: "Either enable uncapped budget or provide a total budget",
  path: ["budget"],
}).refine((data) => {
  // If CPM, cost per impression must be provided
  if (data.billingModel === 'cpm') {
    return data.costPerImpression && parseFloat(data.costPerImpression) > 0;
  }
  return true;
}, {
  message: "Cost per 1,000 impressions is required for awareness campaigns",
  path: ["costPerImpression"],
}).refine((data) => {
  // If CPC, cost per click must be provided
  if (data.billingModel === 'cpc') {
    return data.costPerClick && parseFloat(data.costPerClick) > 0;
  }
  return true;
}, {
  message: "Cost per click is required for click campaigns",
  path: ["costPerClick"],
}).refine((data) => {
  // Banner format can only be used with banner placements
  if (data.adFormat === 'banner') {
    return data.placements.some(p => p.includes('banner'));
  }
  return true;
}, {
  message: "Banner format requires at least one banner placement (news-banner or learn-banner)",
  path: ["adFormat"],
}).refine((data) => {
  // Banner placements require banner format
  const hasBannerPlacement = data.placements.some(p => p.includes('banner'));
  if (hasBannerPlacement) {
    return data.adFormat === 'banner';
  }
  return true;
}, {
  message: "Banner placements require banner format",
  path: ["placements"],
}).refine((data) => {
  // Can't mix tile and banner placements - they require different formats
  const hasTilePlacement = data.placements.some(p => p.includes('tiles'));
  const hasBannerPlacement = data.placements.some(p => p.includes('banner'));
  
  if (hasTilePlacement && hasBannerPlacement) {
    return false;
  }
  return true;
}, {
  message: "Cannot mix tile and banner placements - they require different formats. Create separate campaigns.",
  path: ["placements"],
}).refine((data) => {
  // Tile placements require non-banner formats
  const hasTilePlacement = data.placements.some(p => p.includes('tiles'));
  if (hasTilePlacement) {
    return data.adFormat !== 'banner';
  }
  return true;
}, {
  message: "Tile placements require square, portrait, or large format",
  path: ["adFormat"],
});

interface PartnerCampaignFormProps {
  partnerId: string;
  existingCampaign?: AdCampaign | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PartnerCampaignForm({ partnerId, existingCampaign, onSuccess, onCancel }: PartnerCampaignFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video'>(existingCampaign?.mediaType || 'image');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(existingCampaign?.imageUrl || null);
  const [videoPreview, setVideoPreview] = useState<string | null>(existingCampaign?.videoUrl || null);
  const [showUncappedDialog, setShowUncappedDialog] = useState(false);
  const [maxWidthFormat, setMaxWidthFormat] = useState(existingCampaign?.maxWidthFormat || false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!existingCampaign;

  // Helper to format date for input
  const formatDateForInput = useCallback((date: Date | undefined) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  }, []);

  // Helper to convert cents to dollars for display
  const centsToDisplay = useCallback((cents: number | undefined) => {
    if (!cents) return '';
    return (cents / 100).toFixed(2);
  }, []);

  // CPM is stored as cost per impression in cents, display as cost per 1000
  const cpmCentsToDisplay = useCallback((centsPerImpression: number | undefined) => {
    if (!centsPerImpression) return '';
    return ((centsPerImpression * 1000) / 100).toFixed(2);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: existingCampaign?.title || '',
      placement: existingCampaign?.placement || 'news',
      placements: existingCampaign?.placements || [],
      adFormat: existingCampaign?.adFormat || 'portrait',
      clickUrl: existingCampaign?.clickUrl || '',
      startDate: formatDateForInput(existingCampaign?.startDate) || new Date().toISOString().split('T')[0],
      endDate: formatDateForInput(existingCampaign?.endDate) || '',
      uncappedBudget: existingCampaign?.uncappedBudget || false,
      budget: centsToDisplay(existingCampaign?.budget),
      dailyBudget: centsToDisplay(existingCampaign?.dailyBudget),
      billingModel: existingCampaign?.billingModel || 'cpc',
      costPerImpression: cpmCentsToDisplay(existingCampaign?.costPerImpression),
      costPerClick: centsToDisplay(existingCampaign?.costPerClick),
      currency: existingCampaign?.currency || 'usd',
    },
  });

  // Reset form when editing a different campaign
  useEffect(() => {
    if (existingCampaign) {
      form.reset({
        title: existingCampaign.title || '',
        placement: existingCampaign.placement || 'news',
        placements: existingCampaign.placements || [],
        adFormat: existingCampaign.adFormat || 'portrait',
        clickUrl: existingCampaign.clickUrl || '',
        startDate: formatDateForInput(existingCampaign.startDate) || new Date().toISOString().split('T')[0],
        endDate: formatDateForInput(existingCampaign.endDate) || '',
        uncappedBudget: existingCampaign.uncappedBudget || false,
        budget: centsToDisplay(existingCampaign.budget),
        dailyBudget: centsToDisplay(existingCampaign.dailyBudget),
        billingModel: existingCampaign.billingModel || 'cpc',
        costPerImpression: cpmCentsToDisplay(existingCampaign.costPerImpression),
        costPerClick: centsToDisplay(existingCampaign.costPerClick),
        currency: existingCampaign.currency || 'usd',
      });
      setMediaType(existingCampaign.mediaType || 'image');
      setImagePreview(existingCampaign.imageUrl || null);
      setVideoPreview(existingCampaign.videoUrl || null);
      setMaxWidthFormat(existingCampaign.maxWidthFormat || false);
    }
  }, [existingCampaign, form, formatDateForInput, centsToDisplay, cpmCentsToDisplay]);

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

      // Check video duration (max 60 seconds) and aspect ratio
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const duration = video.duration;
        const aspectRatio = video.videoWidth / video.videoHeight;
        setVideoAspectRatio(aspectRatio);
        
        if (duration > 15) {
          toast({
            title: 'Video too long',
            description: 'Videos must be 15 seconds or less.',
            variant: 'destructive',
          });
          window.URL.revokeObjectURL(video.src);
          return;
        }
        setVideoFile(file);
        const url = URL.createObjectURL(file);
        setVideoPreview(url);
        window.URL.revokeObjectURL(video.src);
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
    setVideoAspectRatio(null);
    setMaxWidthFormat(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Validate pricing based on billing model
    if (values.billingModel === 'cpm' && (!values.costPerImpression || parseFloat(values.costPerImpression) <= 0)) {
      toast({
        title: 'Pricing required',
        description: 'Please enter a cost per 1,000 impressions (CPM) for awareness campaigns.',
        variant: 'destructive',
      });
      return;
    }

    if (values.billingModel === 'cpc' && (!values.costPerClick || parseFloat(values.costPerClick) <= 0)) {
      toast({
        title: 'Pricing required',
        description: 'Please enter a cost per click (CPC) for click campaigns.',
        variant: 'destructive',
      });
      return;
    }

    // Only require new media upload if creating new campaign (not editing)
    // When editing, existing media is preserved if no new file uploaded
    if (mediaType === 'image' && !imageFile && !existingCampaign?.imageUrl) {
      toast({
        title: 'Image required',
        description: 'Please upload an image for your campaign.',
        variant: 'destructive',
      });
      return;
    }

    if (mediaType === 'video' && !videoFile && !existingCampaign?.videoUrl) {
      toast({
        title: 'Video required',
        description: 'Please upload a video for your campaign.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate max-width format: requires square (1:1) or landscape (16:9) aspect ratio
    if (maxWidthFormat && mediaType === 'video' && videoAspectRatio !== null) {
      const isSquare = Math.abs(videoAspectRatio - 1.0) < 0.1; // Allow small tolerance
      const isLandscape169 = Math.abs(videoAspectRatio - 16/9) < 0.1; // Allow small tolerance
      
      if (!isSquare && !isLandscape169) {
        toast({
          title: 'Invalid aspect ratio',
          description: 'Max-width format requires square (1:1) or landscape (16:9) aspect ratio.',
          variant: 'destructive',
        });
        return;
      }
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
      const budget = values.uncappedBudget ? undefined : (values.budget ? Math.round(parseFloat(values.budget) * 100) : undefined);
      const dailyBudget = values.dailyBudget ? Math.round(parseFloat(values.dailyBudget) * 100) : undefined;
      const costPerImpression = values.costPerImpression ? Math.round((parseFloat(values.costPerImpression) / 1000) * 100) : undefined; // CPM to cost per impression in cents
      const costPerClick = values.costPerClick ? Math.round(parseFloat(values.costPerClick) * 100) : undefined;

      // Use the user-selected startDate, not serverTimestamp, so the ad shows immediately
      const startDateValue = new Date(values.startDate);
      startDateValue.setHours(0, 0, 0, 0); // Start of day to ensure it shows today
      
      // Build campaign data - only include defined values (Firestore rejects undefined)
      const campaignData: Record<string, any> = {
        title: values.title,
        placement: values.placement,
        placements: values.placements,
        adFormat: values.adFormat,
        mediaType,
        clickUrl: values.clickUrl,
        maxWidthFormat: mediaType === 'video' ? maxWidthFormat : false,
        uncappedBudget: values.uncappedBudget || false,
        billingModel: values.billingModel,
        currency: values.currency || 'usd',
        startDate: startDateValue,
        updatedAt: serverTimestamp(),
      };

      // Only add optional fields if they have values
      if (imageUrl) campaignData.imageUrl = imageUrl;
      if (videoUrl) campaignData.videoUrl = videoUrl;
      if (videoDuration) campaignData.videoDuration = videoDuration;
      if (values.endDate) campaignData.endDate = new Date(values.endDate);
      if (budget) campaignData.budget = budget;
      if (dailyBudget) campaignData.dailyBudget = dailyBudget;
      if (costPerImpression) campaignData.costPerImpression = costPerImpression;
      if (costPerClick) campaignData.costPerClick = costPerClick;

      if (isEditing && existingCampaign) {
        // UPDATE existing campaign
        // Keep existing media if no new file uploaded
        if (!imageUrl && existingCampaign.imageUrl) campaignData.imageUrl = existingCampaign.imageUrl;
        if (!videoUrl && existingCampaign.videoUrl) campaignData.videoUrl = existingCampaign.videoUrl;
        if (!videoDuration && existingCampaign.videoDuration) campaignData.videoDuration = existingCampaign.videoDuration;
        
        await updateDoc(doc(db, 'adCampaigns', existingCampaign.id), campaignData);

        toast({
          title: 'Campaign Updated',
          description: 'Your advertising campaign has been updated successfully.',
        });
      } else {
        // CREATE new campaign
        campaignData.partnerId = partnerId;
        campaignData.isActive = true;
        campaignData.clicks = 0;
        campaignData.impressions = 0;
        campaignData.spent = 0;
        campaignData.dailySpent = 0;
        campaignData.lastSpentReset = serverTimestamp();
        campaignData.createdAt = serverTimestamp();

        await addDoc(collection(db, 'adCampaigns'), campaignData);

        toast({
          title: 'Campaign Created',
          description: 'Your advertising campaign has been created successfully.',
        });
      }

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
            name="placements"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ad Placements *</FormLabel>
                <p className="text-xs text-muted-foreground mb-3">
                  Select where your ad will appear. You can choose multiple locations.
                </p>
                <div className="space-y-3">
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={field.value?.includes('discover-tiles')}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          if (checked) {
                            field.onChange([...current, 'discover-tiles']);
                          } else {
                            field.onChange(current.filter((v: string) => v !== 'discover-tiles'));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium">Discover Feed - Tiles</p>
                        <p className="text-xs text-muted-foreground">Show in artwork grid</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Square: 1080×1080px • Portrait: 1080×1350px • Large: 1080×1920px
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={field.value?.includes('news-tiles')}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          if (checked) {
                            field.onChange([...current, 'news-tiles']);
                          } else {
                            field.onChange(current.filter((v: string) => v !== 'news-tiles'));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium">Newsroom - Article Tiles</p>
                        <p className="text-xs text-muted-foreground">Show between news articles</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Square: 1080×1080px • Portrait: 1080×1350px • Large: 1080×1920px
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={field.value?.includes('news-banner')}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          if (checked) {
                            field.onChange([...current, 'news-banner']);
                          } else {
                            field.onChange(current.filter((v: string) => v !== 'news-banner'));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium">Newsroom - Banner</p>
                        <p className="text-xs text-muted-foreground">Full-width banner below newsletter signup</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Banner: 1800×300px (6:1 ratio) • Image only
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={field.value?.includes('learn-tiles')}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          if (checked) {
                            field.onChange([...current, 'learn-tiles']);
                          } else {
                            field.onChange(current.filter((v: string) => v !== 'learn-tiles'));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium">Learn - Course Tiles</p>
                        <p className="text-xs text-muted-foreground">Show between courses</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Square: 1080×1080px • Portrait: 1080×1350px • Large: 1080×1920px
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={field.value?.includes('learn-banner')}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          if (checked) {
                            field.onChange([...current, 'learn-banner']);
                          } else {
                            field.onChange(current.filter((v: string) => v !== 'learn-banner'));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium">Learn - Banner</p>
                        <p className="text-xs text-muted-foreground">Full-width banner below "Gouache Learn" headline</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Banner: 1800×300px (6:1 ratio) • Image only
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="adFormat"
            render={({ field }) => {
              // Dynamically determine available formats based on selected placements
              const selectedPlacements = form.watch('placements') || [];
              const hasTilePlacement = selectedPlacements.some(p => p.includes('tiles'));
              const hasBannerPlacement = selectedPlacements.some(p => p.includes('banner'));
              
              // Show appropriate format options
              const showTileFormats = hasTilePlacement;
              const showBannerFormat = hasBannerPlacement;
              
              return (
                <FormItem>
                  <FormLabel>Ad Format *</FormLabel>
                  {selectedPlacements.length === 0 && (
                    <p className="text-sm text-amber-600 dark:text-amber-500">
                      Please select placements above to see available formats
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {showTileFormats && (
                      <>
                        <Card
                          className={`p-3 cursor-pointer transition-all ${field.value === 'square' ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                          onClick={() => field.onChange('square')}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className={`w-12 h-12 border-2 ${field.value === 'square' ? 'border-primary' : 'border-muted-foreground'}`} />
                            <p className="font-medium text-sm">Square</p>
                            <p className="text-xs text-muted-foreground text-center">1:1 (1080×1080px)</p>
                          </div>
                        </Card>
                        <Card
                          className={`p-3 cursor-pointer transition-all ${field.value === 'portrait' ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                          onClick={() => field.onChange('portrait')}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-12 border-2 ${field.value === 'portrait' ? 'border-primary' : 'border-muted-foreground'}`} />
                            <p className="font-medium text-sm">Portrait</p>
                            <p className="text-xs text-muted-foreground text-center">4:5 (1080×1350px)</p>
                          </div>
                        </Card>
                        <Card
                          className={`p-3 cursor-pointer transition-all ${field.value === 'large' ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                          onClick={() => field.onChange('large')}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className={`w-12 h-16 border-2 ${field.value === 'large' ? 'border-primary' : 'border-muted-foreground'}`} />
                            <p className="font-medium text-sm">Large</p>
                            <p className="text-xs text-muted-foreground text-center">9:16 (1080×1920px)</p>
                          </div>
                        </Card>
                      </>
                    )}
                    {showBannerFormat && (
                      <Card
                        className={`p-3 cursor-pointer transition-all ${field.value === 'banner' ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'} ${!showTileFormats ? 'col-span-2' : ''}`}
                        onClick={() => field.onChange('banner')}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-16 h-6 border-2 ${field.value === 'banner' ? 'border-primary' : 'border-muted-foreground'}`} />
                          <p className="font-medium text-sm">Banner</p>
                          <p className="text-xs text-muted-foreground text-center">6:1 (1800×300px)</p>
                        </div>
                      </Card>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <div className="space-y-2">
            <Label>Media Type *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mediaType === 'image' ? 'default' : 'outline'}
                className={mediaType === 'image' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
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
                className={mediaType === 'video' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                onClick={() => {
                  setMediaType('video');
                  removeMedia();
                }}
              >
                <Video className="mr-2 h-4 w-4" />
                Video (max 15s)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(() => {
                const selectedFormat = form.watch('adFormat');
                if (mediaType === 'video') {
                  return 'Video: Max 15 seconds. Recommended 1080×1920px (9:16) or 1920×1080px (16:9)';
                }
                switch (selectedFormat) {
                  case 'square':
                    return 'Image: 1080×1080px (1:1 ratio)';
                  case 'portrait':
                    return 'Image: 1080×1350px (4:5 ratio)';
                  case 'large':
                    return 'Image: 1080×1920px (9:16 ratio)';
                  case 'banner':
                    return 'Image: 1800×300px (6:1 ratio) - Banner format only';
                  default:
                    return 'Select a format above to see recommended dimensions';
                }
              })()}
            </p>
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
                    Click to upload {mediaType === 'image' ? 'an image' : 'a video (max 15 seconds)'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {mediaType === 'image' 
                      ? 'Best: 1080×1350px (4:5) or 1080×1080px (1:1)'
                      : 'Best: 1080×1920px (9:16) or 1920×1080px (16:9)'}
                  </p>
                </label>
              </div>
            ) : (
              <div className="relative">
                {imagePreview && (
                  <div className="flex flex-col items-center gap-4">
                    {/* Preview container with 4:5 aspect ratio to match discover feed */}
                    <div className="relative w-full max-w-[300px] rounded-lg overflow-hidden border border-border" style={{ aspectRatio: '4/5' }}>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2">
                        <span className="text-[10px] font-medium text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
                          Sponsored
                        </span>
                      </div>
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
                    <p className="text-xs text-muted-foreground text-center">
                      Preview shows how your ad will appear in the Discover feed (4:5 aspect ratio)
                    </p>
                  </div>
                )}
                {videoPreview && (
                  <div className="flex flex-col items-center gap-4">
                    {/* Preview container with 9:16 aspect ratio to match discover feed */}
                    <div className="relative w-full max-w-[300px] rounded-lg overflow-hidden border border-border" style={{ aspectRatio: maxWidthFormat ? (videoAspectRatio || 16/9) : '9/16' }}>
                      <video src={videoPreview} controls className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 z-10">
                        <span className="text-[10px] font-medium text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
                          Sponsored
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 z-10"
                        onClick={removeMedia}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {videoAspectRatio !== null && (
                        <p>
                          Video aspect ratio: {videoAspectRatio.toFixed(2)}:1
                          {maxWidthFormat && (
                            <span className="ml-2 text-amber-600">
                              (Requires 1:1 or 16:9 for max-width format)
                            </span>
                          )}
                        </p>
                      )}
                      <p className="mt-1">Preview shows how your ad will appear in the Discover feed</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Max-width format option (video ads only, mobile only) */}
          {mediaType === 'video' && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="maxWidthFormat"
                  checked={maxWidthFormat}
                  onCheckedChange={(checked) => setMaxWidthFormat(checked === true)}
                />
                <Label htmlFor="maxWidthFormat" className="cursor-pointer">
                  Max-width format (mobile only)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Spans multiple columns on mobile feeds. Requires square (1:1) or landscape (16:9) aspect ratio.
              </p>
            </div>
          )}

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
              <h3 className="text-sm font-semibold mb-2">Campaign Goal & Pricing *</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Choose your billing model based on your campaign goal.
              </p>
            </div>

            {/* Billing Model Selection */}
            <FormField
              control={form.control}
              name="billingModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Goal *</FormLabel>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Card 
                      className={`p-4 cursor-pointer transition-all ${field.value === 'cpm' ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                      onClick={() => field.onChange('cpm')}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${field.value === 'cpm' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <Eye className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">Brand Awareness</p>
                          <p className="text-xs text-muted-foreground">Pay per 1,000 impressions (CPM)</p>
                        </div>
                      </div>
                    </Card>
                    <Card 
                      className={`p-4 cursor-pointer transition-all ${field.value === 'cpc' ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                      onClick={() => field.onChange('cpc')}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${field.value === 'cpc' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <MousePointerClick className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">Drive Clicks</p>
                          <p className="text-xs text-muted-foreground">Pay per click (CPC)</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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

              {/* Show CPM input only when CPM billing model is selected */}
              {form.watch('billingModel') === 'cpm' && (
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
                        You pay this amount for every 1,000 ad views
                      </p>
                    </FormItem>
                  )}
                />
              )}

              {/* Show CPC input only when CPC billing model is selected */}
              {form.watch('billingModel') === 'cpc' && (
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
                        You pay this amount when someone clicks your ad
                      </p>
                    </FormItem>
                  )}
                />
              )}
            </div>

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
                    Maximum spend per day. Campaign pauses when reached and resumes next day.
                  </p>
                </FormItem>
              )}
            />

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

              {!form.watch('uncappedBudget') && (
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
              {isEditing ? 'Update Campaign' : 'Create Campaign'}
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
