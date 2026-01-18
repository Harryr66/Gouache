'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Video, Plus, Trash2, Link, DollarSign, Copy, Check, Share2, ExternalLink } from 'lucide-react';
import { useLiveStream } from '@/providers/live-stream-provider';
import { StreamScheduleFormData, StreamType, STREAM_TYPE_LABELS } from '@/lib/live-stream-types';
import { useToast } from '@/hooks/use-toast';

interface ScheduleStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (streamId: string) => void;
}

interface MaterialInput {
  name: string;
  description: string;
  affiliateUrl: string;
  price: string;
}

export function ScheduleStreamModal({ isOpen, onClose, onSuccess }: ScheduleStreamModalProps) {
  const { scheduleStream } = useLiveStream();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdStreamId, setCreatedStreamId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [streamType, setStreamType] = useState<StreamType>('class');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState('60'); // minutes
  const [chatEnabled, setChatEnabled] = useState(true);
  const [qaEnabled, setQaEnabled] = useState(true);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [tags, setTags] = useState('');
  
  // Materials list
  const [materials, setMaterials] = useState<MaterialInput[]>([]);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState<MaterialInput>({
    name: '',
    description: '',
    affiliateUrl: '',
    price: '',
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStreamType('class');
    setScheduledDate('');
    setScheduledTime('');
    setDuration('60');
    setChatEnabled(true);
    setQaEnabled(true);
    setIsFree(true);
    setPrice('');
    setRecordingEnabled(false);
    setTags('');
    setMaterials([]);
    setShowAddMaterial(false);
    setNewMaterial({ name: '', description: '', affiliateUrl: '', price: '' });
    setCreatedStreamId(null);
    setCopiedLink(false);
  };
  
  // Generate shareable URL
  const getShareableUrl = (streamId: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gouache.app';
    return `${baseUrl}/live/${streamId}`;
  };
  
  const copyShareableLink = async () => {
    if (!createdStreamId) return;
    const url = getShareableUrl(createdStreamId);
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast({
      title: 'Link Copied!',
      description: 'Share this link with your followers',
    });
    setTimeout(() => setCopiedLink(false), 3000);
  };
  
  const shareToSocial = (platform: string) => {
    if (!createdStreamId) return;
    const url = getShareableUrl(createdStreamId);
    const text = `Join my live stream: ${title}`;
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  const handleAddMaterial = () => {
    if (newMaterial.name && newMaterial.affiliateUrl) {
      setMaterials([...materials, newMaterial]);
      setNewMaterial({ name: '', description: '', affiliateUrl: '', price: '' });
      setShowAddMaterial(false);
    }
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !scheduledDate || !scheduledTime) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Parse scheduled time
      const scheduledStartTime = new Date(`${scheduledDate}T${scheduledTime}`);
      const scheduledEndTime = new Date(scheduledStartTime.getTime() + parseInt(duration) * 60 * 1000);
      
      const formData: StreamScheduleFormData = {
        title,
        description,
        streamType,
        scheduledStartTime,
        scheduledEndTime,
        materials: materials.map(m => ({
          name: m.name,
          description: m.description,
          affiliateUrl: m.affiliateUrl,
          price: m.price ? parseFloat(m.price) : undefined,
        })),
        chatEnabled,
        qaEnabled,
        isFree,
        price: isFree ? undefined : parseFloat(price),
        recordingEnabled,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      
      const streamId = await scheduleStream(formData);
      
      if (streamId) {
        setCreatedStreamId(streamId);
        onSuccess?.(streamId);
      }
    } catch (error) {
      console.error('Error scheduling stream:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {createdStreamId ? (
          // Success State - Show shareable link
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Stream Scheduled!
              </DialogTitle>
              <DialogDescription>
                Your live stream has been scheduled. Share the link with your followers!
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Stream Info */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">
                  {scheduledDate && scheduledTime && 
                    new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
                </p>
              </div>
              
              {/* Shareable Link */}
              <div className="space-y-3">
                <Label>Shareable Link</Label>
                <div className="flex gap-2">
                  <Input 
                    value={getShareableUrl(createdStreamId)} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={copyShareableLink}
                  >
                    {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {/* Social Share Buttons */}
              <div className="space-y-3">
                <Label>Share on Social Media</Label>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => shareToSocial('twitter')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Twitter/X
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => shareToSocial('facebook')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Facebook
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => shareToSocial('linkedin')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    LinkedIn
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => shareToSocial('whatsapp')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    WhatsApp
                  </Button>
                </div>
              </div>
              
              {/* Open Stream Page */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  type="button"
                  variant="outline" 
                  className="flex-1"
                  onClick={handleClose}
                >
                  Close
                </Button>
                <Button 
                  type="button"
                  className="flex-1"
                  onClick={() => {
                    window.open(getShareableUrl(createdStreamId), '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Stream Page
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Form State
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Schedule Live Stream
              </DialogTitle>
              <DialogDescription>
                Schedule a live class, Q&A, or workshop for your followers
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Stream Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Watercolor Basics: Painting a Sunset"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will you cover in this stream?"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="streamType">Stream Type</Label>
              <Select value={streamType} onValueChange={(v) => setStreamType(v as StreamType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STREAM_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={today}
                  required
                />
              </div>
              <div>
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Materials / Supplies List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Link className="h-4 w-4" />
                Materials & Supplies
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddMaterial(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Material
              </Button>
            </div>

            {materials.length > 0 && (
              <div className="space-y-2">
                {materials.map((material, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{material.name}</p>
                      {material.price && (
                        <p className="text-sm text-muted-foreground">${material.price}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMaterial(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {showAddMaterial && (
              <div className="p-4 border rounded-lg space-y-3">
                <Input
                  placeholder="Material name *"
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newMaterial.description}
                  onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                />
                <Input
                  placeholder="Affiliate link URL *"
                  value={newMaterial.affiliateUrl}
                  onChange={(e) => setNewMaterial({ ...newMaterial, affiliateUrl: e.target.value })}
                />
                <Input
                  placeholder="Price (optional)"
                  type="number"
                  step="0.01"
                  value={newMaterial.price}
                  onChange={(e) => setNewMaterial({ ...newMaterial, price: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleAddMaterial}>
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddMaterial(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Add supplies or materials with affiliate links. Viewers can click to purchase during your stream.
            </p>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="font-medium">Settings</h3>

            <div className="flex items-center justify-between">
              <div>
                <Label>Live Chat</Label>
                <p className="text-sm text-muted-foreground">Allow viewers to chat during stream</p>
              </div>
              <Switch checked={chatEnabled} onCheckedChange={setChatEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Q&A Mode</Label>
                <p className="text-sm text-muted-foreground">Allow viewers to submit questions</p>
              </div>
              <Switch checked={qaEnabled} onCheckedChange={setQaEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Save Recording</Label>
                <p className="text-sm text-muted-foreground">Save stream for later viewing</p>
              </div>
              <Switch checked={recordingEnabled} onCheckedChange={setRecordingEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Free Stream</Label>
                <p className="text-sm text-muted-foreground">Anyone can join for free</p>
              </div>
              <Switch checked={isFree} onCheckedChange={setIsFree} />
            </div>

            {!isFree && (
              <div>
                <Label htmlFor="price">Ticket Price ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.50"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-9"
                    placeholder="9.99"
                    required={!isFree}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="watercolor, beginner, landscape (comma separated)"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title || !scheduledDate || !scheduledTime}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Stream'}
            </Button>
          </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
