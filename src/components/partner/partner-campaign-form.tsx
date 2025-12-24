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
import { Loader2, Upload, X, Image as ImageIcon, Video } from 'lucide-react';
import { AdCampaign } from '@/lib/types';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  placement: z.enum(['news', 'discover', 'learn']),
  clickUrl: z.string().url('Please enter a valid URL'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
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
      description: '',
      placement: 'news',
      clickUrl: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
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

      // Create campaign
      const campaignData: Omit<AdCampaign, 'id'> = {
        partnerId,
        title: values.title,
        description: values.description,
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
