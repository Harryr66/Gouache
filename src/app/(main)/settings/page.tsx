'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database, 
  Download,
  Upload,
  Trash2,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useDiscoverSettings } from '@/providers/discover-settings-provider';

export default function SettingsPage() {
  const { settings: discoverSettings, updateSettings: updateDiscoverSettings } = useDiscoverSettings();
  
  const [profileData, setProfileData] = useState({
    username: 'artist123',
    displayName: 'Artist Name',
    bio: 'Digital artist passionate about creating unique pieces',
    website: 'https://artistwebsite.com',
    location: 'New York, NY'
  });

  const [notifications, setNotifications] = useState({
    likes: true,
    comments: true,
    follows: true,
    messages: true,
    auctions: true
  });

  const [privacy, setPrivacy] = useState({
    showEmail: false,
    showLocation: true,
    allowMessages: true
  });

  const [progress, setProgress] = useState(75);
  const [remainingTasks] = useState([
    'Complete your profile',
    'Upload your first artwork',
    'Join a community',
    'Follow 5 artists'
  ]);

  const handleSave = () => {
    // Save settings logic here
    console.log('Settings saved');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Completion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Profile Completion</span>
            </CardTitle>
            <CardDescription>
              Complete your profile to get the most out of SOMA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Profile Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {remainingTasks.length > 0 && (
                <div className="pt-2 space-y-2">
                   <p className="text-xs text-muted-foreground">
                     Complete these tasks to improve your profile:
                   </p>
                   <ul className="space-y-1">
                     {remainingTasks.map((task, index) => (
                       <li key={index} className="text-xs text-muted-foreground flex items-center space-x-2">
                         <div className="h-1 w-1 bg-muted-foreground rounded-full"></div>
                         <span>{task}</span>
                       </li>
                     ))}
                   </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Profile Information</span>
                </CardTitle>
                <CardDescription>
                  Update your public profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Input
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={profileData.website}
                      onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleSave}>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notification Preferences</span>
                </CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="likes">Likes</Label>
                    <p className="text-sm text-muted-foreground">Get notified when someone likes your posts</p>
                  </div>
                  <Switch
                    id="likes"
                    checked={notifications.likes}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, likes: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="comments">Comments</Label>
                    <p className="text-sm text-muted-foreground">Get notified when someone comments on your posts</p>
                  </div>
                  <Switch
                    id="comments"
                    checked={notifications.comments}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, comments: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="follows">Follows</Label>
                    <p className="text-sm text-muted-foreground">Get notified when someone follows you</p>
                  </div>
                  <Switch
                    id="follows"
                    checked={notifications.follows}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, follows: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="messages">Messages</Label>
                    <p className="text-sm text-muted-foreground">Get notified when you receive new messages</p>
                  </div>
                  <Switch
                    id="messages"
                    checked={notifications.messages}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, messages: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auctions">Auctions</Label>
                    <p className="text-sm text-muted-foreground">Get notified about auction updates</p>
                  </div>
                  <Switch
                    id="auctions"
                    checked={notifications.auctions}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, auctions: checked })}
                  />
                </div>
                <Button onClick={handleSave}>Save Preferences</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Privacy Settings</span>
                </CardTitle>
                <CardDescription>
                  Control who can see your information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showEmail">Show Email</Label>
                    <p className="text-sm text-muted-foreground">Make your email visible to other users</p>
                  </div>
                  <Switch
                    id="showEmail"
                    checked={privacy.showEmail}
                    onCheckedChange={(checked) => setPrivacy({ ...privacy, showEmail: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showLocation">Show Location</Label>
                    <p className="text-sm text-muted-foreground">Make your location visible to other users</p>
                  </div>
                  <Switch
                    id="showLocation"
                    checked={privacy.showLocation}
                    onCheckedChange={(checked) => setPrivacy({ ...privacy, showLocation: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allowMessages">Allow Messages</Label>
                    <p className="text-sm text-muted-foreground">Allow other users to send you messages</p>
                  </div>
                  <Switch
                    id="allowMessages"
                    checked={privacy.allowMessages}
                    onCheckedChange={(checked) => setPrivacy({ ...privacy, allowMessages: checked })}
                  />
                </div>
                <Button onClick={handleSave}>Save Privacy Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discover" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Discover Settings</span>
                </CardTitle>
                <CardDescription>
                  Customize what content you see in the Discover section
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="hideAiAssistedArt">Hide AI-Assisted Art</Label>
                    <p className="text-sm text-muted-foreground">
                      Hide artworks tagged with "AI assisted" to only see 100% human-made art
                    </p>
                  </div>
                  <Switch
                    id="hideAiAssistedArt"
                    checked={discoverSettings.hideAiAssistedArt}
                    onCheckedChange={(checked) => updateDiscoverSettings({ hideAiAssistedArt: checked })}
                  />
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <EyeOff className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">About AI-Assisted Art Filtering</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        When enabled, artworks tagged with "AI assisted" will be hidden from your Discover feed. 
                        This helps you focus on traditional, handcrafted artwork created entirely by human artists.
                      </p>
                    </div>
                  </div>
                </div>
                <Button onClick={handleSave}>Save Discover Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Data Management</span>
                </CardTitle>
                <CardDescription>
                  Manage your data and account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Download Your Data</h4>
                    <p className="text-sm text-muted-foreground">Get a copy of all your data</p>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Upload Data</h4>
                    <p className="text-sm text-muted-foreground">Import data from another platform</p>
                  </div>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg border-destructive">
                  <div>
                    <h4 className="font-medium text-destructive">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
