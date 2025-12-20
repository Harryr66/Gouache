'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Trash2, Edit, Save, X, Upload, Mail } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, getDoc, serverTimestamp, collection, addDoc, setDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';
import { useRouter, useSearchParams } from 'next/navigation';

interface PortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  medium: string;
  dimensions: string;
  year: string;
  tags: string[];
  createdAt: Date;
}

export function PortfolioManager() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Log mount only once
  useEffect(() => {
    console.log('🚀 PortfolioManager component MOUNTED');
  }, []);
  
  // Log when portfolioItems changes
  useEffect(() => {
    console.log('🔄 PortfolioManager: portfolioItems changed', {
      count: portfolioItems.length,
      items: portfolioItems.slice(0, 3).map((i: PortfolioItem) => ({ id: i.id, title: i.title }))
    });
    if (portfolioItems.length > 0) {
      console.log('✅ PortfolioManager: portfolioItems has items!', portfolioItems.length, 'items ready to render');
    } else {
      console.warn('⚠️ PortfolioManager: portfolioItems is empty!');
    }
  }, [portfolioItems]);
  
  // Debug logging (throttled to avoid blocking)
  useEffect(() => {
    if (portfolioItems.length > 0) {
      console.log('📋 PortfolioManager state:', {
        showAddForm,
        hasUser: !!user,
        userId: user?.id,
        portfolioCount: portfolioItems.length,
        isUploading,
        sampleItems: portfolioItems.slice(0, 3).map((i: PortfolioItem) => ({ id: i.id, title: i.title, hasImage: !!i.imageUrl }))
      });
    }
  }, [showAddForm, user?.id, portfolioItems.length, isUploading]);
  
  // Log when form becomes visible
  useEffect(() => {
    if (showAddForm) {
      console.log('✅ Add New Artwork form is now visible');
    }
  }, [showAddForm]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    medium: '',
    dimensions: '',
    year: '',
    tags: '',
    isForSale: false,
    price: '',
    priceType: 'fixed' as 'fixed' | 'contact', // 'fixed' = set price, 'contact' = contact artist
    currency: 'USD',
    deliveryScope: 'worldwide' as 'worldwide' | 'specific',
    deliveryCountries: ''
  });

  // State for editing item's sale info
  const [editingItemSaleInfo, setEditingItemSaleInfo] = useState<{
    isForSale: boolean;
    price: string;
    priceType: 'fixed' | 'contact';
    currency: string;
    deliveryScope: 'worldwide' | 'specific';
    deliveryCountries: string;
  } | null>(null);

  // Check for editArtwork URL parameter and open edit form
  useEffect(() => {
    const editArtworkId = searchParams?.get('editArtwork');
    if (editArtworkId && portfolioItems.length > 0) {
      const itemToEdit = portfolioItems.find(item => item.id === editArtworkId);
      if (itemToEdit) {
        setEditingItem(itemToEdit);
        // Populate form with item data
        setNewItem({
          title: itemToEdit.title || '',
          description: itemToEdit.description || '',
          medium: itemToEdit.medium || '',
          dimensions: itemToEdit.dimensions || '',
          year: itemToEdit.year || '',
          tags: itemToEdit.tags?.join(', ') || '',
          isForSale: false, // Will be loaded from artworks collection
          price: '',
          priceType: 'fixed' as 'fixed' | 'contact',
          currency: 'USD',
          deliveryScope: 'worldwide' as 'worldwide' | 'specific',
          deliveryCountries: ''
        });
        // Load sale info from artworks collection if it exists
        const loadSaleInfo = async () => {
          try {
            const artworkDoc = await getDoc(doc(db, 'artworks', editArtworkId));
            if (artworkDoc.exists()) {
              const artworkData = artworkDoc.data();
              const saleInfo = {
                isForSale: artworkData.isForSale || false,
                price: artworkData.price ? (artworkData.price > 1000 ? (artworkData.price / 100).toString() : artworkData.price.toString()) : '',
                currency: artworkData.currency || 'USD',
                priceType: (artworkData.priceType || (artworkData.price ? 'fixed' : 'contact')) as 'fixed' | 'contact',
                deliveryScope: (artworkData.deliveryScope || 'worldwide') as 'worldwide' | 'specific',
                deliveryCountries: artworkData.deliveryCountries?.join(', ') || ''
              };
              setNewItem(prev => ({ ...prev, ...saleInfo }));
              setEditingItemSaleInfo(saleInfo);
            } else {
              setEditingItemSaleInfo({
                isForSale: false,
                price: '',
                priceType: 'fixed',
                currency: 'USD',
                deliveryScope: 'worldwide',
                deliveryCountries: ''
              });
            }
          } catch (error) {
            console.error('Error loading sale info:', error);
            setEditingItemSaleInfo({
              isForSale: false,
              price: '',
              priceType: 'fixed',
              currency: 'USD',
              deliveryScope: 'worldwide',
              deliveryCountries: ''
            });
          }
        };
        loadSaleInfo();
        // Remove the query parameter from URL
        router.replace('/profile', { scroll: false });
      }
    }
  }, [searchParams, portfolioItems, router]);

  // Load sale info when editing item changes
  useEffect(() => {
    if (editingItem) {
      const loadSaleInfo = async () => {
        try {
          const artworkDoc = await getDoc(doc(db, 'artworks', editingItem.id));
          if (artworkDoc.exists()) {
            const artworkData = artworkDoc.data();
            setEditingItemSaleInfo({
              isForSale: artworkData.isForSale || false,
              price: artworkData.price ? (artworkData.price > 1000 ? (artworkData.price / 100).toString() : artworkData.price.toString()) : '',
              currency: artworkData.currency || 'USD',
              priceType: (artworkData.priceType || (artworkData.price ? 'fixed' : 'contact')) as 'fixed' | 'contact',
              deliveryScope: (artworkData.deliveryScope || 'worldwide') as 'worldwide' | 'specific',
              deliveryCountries: artworkData.deliveryCountries?.join(', ') || ''
            });
          } else {
            setEditingItemSaleInfo({
              isForSale: false,
              price: '',
              priceType: 'fixed',
              currency: 'USD',
              deliveryScope: 'worldwide',
              deliveryCountries: ''
            });
          }
        } catch (error) {
          console.error('Error loading sale info:', error);
          setEditingItemSaleInfo({
            isForSale: false,
            price: '',
            priceType: 'fixed',
            currency: 'USD',
            deliveryScope: 'worldwide',
            deliveryCountries: ''
          });
        }
      };
      loadSaleInfo();
    } else {
      setEditingItemSaleInfo(null);
    }
  }, [editingItem?.id]);

  useEffect(() => {
    const loadPortfolio = async () => {
      if (!user?.id) {
        setPortfolioItems([]);
        return;
      }

      // Helper function to map portfolio items (deferred to avoid blocking)
      const mapPortfolioItem = (item: any, index: number): PortfolioItem => {
        let createdAt: Date;
        if (item.createdAt?.toDate) {
          createdAt = item.createdAt.toDate();
        } else if (item.createdAt instanceof Date) {
          createdAt = item.createdAt;
        } else {
          createdAt = new Date();
        }

        const imageUrl = item.imageUrl || item.supportingImages?.[0] || item.images?.[0] || '';

        return {
          id: item.id || `portfolio-${Date.now()}-${index}`,
          imageUrl: imageUrl,
          title: item.title || 'Untitled Artwork',
          description: item.description || '',
          medium: item.medium || '',
          dimensions: item.dimensions || '',
          year: item.year || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          createdAt
        };
      };

      // First, try to use portfolio from user object if available (faster)
      if (user.portfolio && Array.isArray(user.portfolio) && user.portfolio.length > 0) {
        const userPortfolio = user.portfolio;
        console.log('📋 PortfolioManager: Using portfolio from user object', userPortfolio.length);
        
        // Process immediately - the operations are fast enough for small arrays
        // Filter to only show items where showInPortfolio is true (or undefined for backward compatibility)
        const mappedFromUser = userPortfolio
          .filter((item: any) => item.showInPortfolio !== false) // Show if true or undefined
          .map(mapPortfolioItem);
        mappedFromUser.sort((a: PortfolioItem, b: PortfolioItem) => b.createdAt.getTime() - a.createdAt.getTime());
        console.log('✅ PortfolioManager: Setting portfolio items from user object', mappedFromUser.length);
        setPortfolioItems(mappedFromUser);
      }

      // Always also fetch from Firestore to ensure we have the latest
      try {
        const userDoc = await getDoc(doc(db, 'userProfiles', user.id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const rawPortfolio = data.portfolio || [];
          
          // Filter to only show items where showInPortfolio is true (or undefined for backward compatibility)
          // Process immediately
          const mappedItems = rawPortfolio
            .filter((item: any) => item.showInPortfolio !== false) // Show if true or undefined
            .map(mapPortfolioItem);
          mappedItems.sort((a: PortfolioItem, b: PortfolioItem) => b.createdAt.getTime() - a.createdAt.getTime());

          console.log('📋 PortfolioManager: Loaded portfolio from Firestore', {
            userId: user.id,
            rawPortfolioCount: rawPortfolio.length,
            mappedCount: mappedItems.length,
            items: mappedItems.slice(0, 5).map((i: PortfolioItem) => ({ id: i.id, title: i.title, hasImage: !!i.imageUrl }))
          });

          console.log('✅ PortfolioManager: Setting portfolio items from Firestore', mappedItems.length);
          setPortfolioItems(mappedItems);
        } else {
          setPortfolioItems([]);
        }
      } catch (error) {
        console.error('Error loading portfolio from Firestore:', error);
        setPortfolioItems([]);
      }
    };

    loadPortfolio();
  }, [user?.id, user?.portfolio]);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Resize to fit 1080x1080 pixels (maintaining aspect ratio)
        const maxWidth = 1080;
        const maxHeight = 1080;
        let { width, height } = img;
        
        // Log original dimensions and suggest optimal sizing
        if (width !== 1080 || height !== 1080) {
          console.log('📐 Image Upload Suggestion:', {
            original: `${width}x${height}`,
            recommended: '1080x1080 pixels',
            message: 'For best quality and performance, upload images at 1080x1080 pixels. Your image will be automatically resized to fit this format.'
          });
        }
        
        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        // If image is smaller than 1080x1080, scale it up to fit (but maintain aspect ratio)
        if (width < maxWidth && height < maxHeight) {
          const scale = Math.min(maxWidth / width, maxHeight / height);
          width = width * scale;
          height = height * scale;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log('✅ Image resized:', {
              original: `${img.width}x${img.height}`,
              resized: `${width}x${height}`,
              fileSize: `${(compressedFile.size / 1024).toFixed(2)} KB`
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🎬 handleImageUpload called:', {
      hasFile: !!event.target.files?.[0],
      hasUser: !!user,
      userId: user?.id,
      userName: user?.displayName || user?.username,
      title: newItem.title.trim()
    });
    
    const file = event.target.files?.[0];
    if (!file || !user) {
      console.warn('⚠️ Upload cancelled - missing file or user:', { hasFile: !!file, hasUser: !!user });
      return;
    }

    // Block auto-upload until required fields are set (title at minimum)
    if (!newItem.title.trim()) {
      toast({
        title: "Add a title first",
        description: "Enter a title before selecting an image.",
        variant: "destructive"
      });
      event.target.value = '';
      return;
    }

    console.log('✅ Starting upload process...');
    setIsUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const imageRef = ref(storage, `portfolio/${user.id}/${Date.now()}_${file.name}`);
      await uploadBytes(imageRef, compressedFile);
      const imageUrl = await getDownloadURL(imageRef);

      // Use current timestamp instead of serverTimestamp to avoid placeholder issues
      const now = new Date();
      const portfolioItem: any = {
        id: Date.now().toString(),
        imageUrl,
        title: newItem.title.trim(),
        description: newItem.description || '',
        medium: newItem.medium || '',
        dimensions: newItem.dimensions || '',
        year: newItem.year || '',
        tags: newItem.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        createdAt: now, // Use Date object instead of serverTimestamp to avoid placeholder issues
        showInPortfolio: true,
        deleted: false,
        isForSale: newItem.isForSale || false,
        showInShop: newItem.isForSale || false,
      };

      // Add sale-related fields if for sale
      if (newItem.isForSale) {
        if (newItem.priceType === 'fixed' && newItem.price) {
          portfolioItem.price = parseFloat(newItem.price) * 100; // Convert to cents
          portfolioItem.currency = newItem.currency || 'USD';
        } else if (newItem.priceType === 'contact') {
          portfolioItem.priceType = 'contact';
          portfolioItem.contactForPrice = true;
        }
        portfolioItem.deliveryScope = newItem.deliveryScope || 'worldwide';
        if (newItem.deliveryScope === 'specific' && newItem.deliveryCountries) {
          portfolioItem.deliveryCountries = newItem.deliveryCountries;
        }
      }

      console.log('📤 Uploading portfolio item:', {
        userId: user.id,
        userName: user.displayName || user.username,
        itemId: portfolioItem.id,
        title: portfolioItem.title,
        imageUrl: portfolioItem.imageUrl ? 'has image' : 'no image',
        imageUrlLength: portfolioItem.imageUrl?.length || 0,
        createdAt: portfolioItem.createdAt
      });

      // Read current portfolio from Firestore to ensure we have the latest data
      const userDocRef = doc(db, 'userProfiles', user.id);
      console.log('🔍 Reading from Firestore document:', {
        collection: 'userProfiles',
        documentId: user.id,
        userName: user.displayName || user.username
      });
      
      const userDoc = await getDoc(userDocRef);
      const currentPortfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];
      
      console.log('📖 Firestore document read result:', {
        exists: userDoc.exists(),
        documentId: userDoc.id,
        hasPortfolio: !!userDoc.data()?.portfolio,
        portfolioType: Array.isArray(userDoc.data()?.portfolio) ? 'array' : typeof userDoc.data()?.portfolio,
        portfolioLength: currentPortfolio.length
      });
      
      console.log('📖 Current portfolio from Firestore:', {
        exists: userDoc.exists(),
        currentCount: currentPortfolio.length,
        currentItems: currentPortfolio.map((item: any) => ({
          id: item.id,
          title: item.title,
          hasImage: !!item.imageUrl
        }))
      });
      
      // Check if item with same ID already exists
      const existingIndex = currentPortfolio.findIndex((item: any) => item.id === portfolioItem.id);
      
      // Add or update the portfolio item
      let updatedPortfolio;
      if (existingIndex >= 0) {
        // Update existing item
        updatedPortfolio = [...currentPortfolio];
        updatedPortfolio[existingIndex] = portfolioItem;
        console.log('📝 Updating existing portfolio item at index:', existingIndex);
      } else {
        // Add new item
        updatedPortfolio = [...currentPortfolio, portfolioItem];
        console.log('➕ Adding new portfolio item, total items:', updatedPortfolio.length);
      }

      console.log('💾 Saving portfolio to Firestore:', {
        userId: user.id,
        itemId: portfolioItem.id,
        itemTitle: portfolioItem.title,
        totalItems: updatedPortfolio.length,
        portfolioStructure: updatedPortfolio.map((item: any) => ({
          id: item.id,
          title: item.title,
          imageUrl: item.imageUrl ? 'has image' : 'no image',
          createdAt: item.createdAt ? (item.createdAt instanceof Date ? item.createdAt.toISOString() : 'not a date') : 'missing'
        }))
      });

      // Update user profile with the complete portfolio array
      console.log('💾 Writing to Firestore:', {
        documentId: user.id,
        userName: user.displayName || user.username,
        portfolioArrayLength: updatedPortfolio.length,
        newItemId: portfolioItem.id,
        newItemTitle: portfolioItem.title,
        newItemImageUrl: portfolioItem.imageUrl ? 'has image' : 'MISSING'
      });
      
      try {
        await updateDoc(userDocRef, {
          portfolio: updatedPortfolio,
          updatedAt: now
        });
        console.log('✅ Firestore updateDoc completed successfully');

        // If marked for sale, also add to artworks collection
        if (newItem.isForSale) {
          try {
            const artworkData: any = {
              id: portfolioItem.id,
              title: portfolioItem.title,
              description: portfolioItem.description,
              imageUrl: portfolioItem.imageUrl,
              artist: {
                userId: user.id,
                name: user.displayName || user.username || 'Artist',
                handle: user.username || undefined,
                avatarUrl: user.avatarUrl || null,
              },
              tags: portfolioItem.tags,
              isForSale: true,
              showInShop: true,
              category: portfolioItem.medium || 'Other',
              medium: portfolioItem.medium,
              dimensions: portfolioItem.dimensions,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              views: 0,
              likes: 0,
              commentsCount: 0,
            };

            // Add sale-related fields
            if (newItem.priceType === 'fixed' && newItem.price) {
              artworkData.price = parseFloat(newItem.price) * 100; // Convert to cents
              artworkData.currency = newItem.currency || 'USD';
            } else if (newItem.priceType === 'contact') {
              artworkData.priceType = 'contact';
              artworkData.contactForPrice = true;
            }
            artworkData.deliveryScope = newItem.deliveryScope || 'worldwide';
            if (newItem.deliveryScope === 'specific' && newItem.deliveryCountries) {
              artworkData.deliveryCountries = newItem.deliveryCountries;
            }

            // Use setDoc with the artwork ID to ensure it uses the same ID
            await setDoc(doc(db, 'artworks', portfolioItem.id), artworkData);
            console.log('✅ Artwork added to artworks collection for shop');
          } catch (artworkError) {
            console.error('⚠️ Failed to add artwork to artworks collection (non-critical):', artworkError);
            // Don't throw - portfolio save is more important
          }
        }
      } catch (updateError) {
        console.error('❌ Firestore updateDoc failed:', updateError);
        throw updateError;
      }

      // Verify the write by reading back
      console.log('🔍 Verifying write by reading back from Firestore...');
      const verifyDoc = await getDoc(userDocRef);
      const verifiedPortfolio = verifyDoc.exists() ? (verifyDoc.data().portfolio || []) : [];
      
      console.log('✅ Portfolio saved and verified:', {
        documentId: verifyDoc.id,
        exists: verifyDoc.exists(),
        verifiedCount: verifiedPortfolio.length,
        expectedCount: updatedPortfolio.length,
        verifiedItems: verifiedPortfolio.map((item: any) => ({
          id: item.id,
          title: item.title,
          imageUrl: item.imageUrl || 'MISSING',
          imageUrlType: typeof item.imageUrl,
          hasImage: !!item.imageUrl,
          allKeys: Object.keys(item || {})
        })),
        fullPortfolioJSON: JSON.stringify(verifiedPortfolio, null, 2)
      });
      
      // Check if the new item is in the verified portfolio
      const newItemFound = verifiedPortfolio.some((item: any) => item.id === portfolioItem.id);
      if (!newItemFound) {
        console.error('❌ CRITICAL: New portfolio item NOT found in verified portfolio!', {
          expectedItemId: portfolioItem.id,
          verifiedItemIds: verifiedPortfolio.map((item: any) => item.id)
        });
      } else {
        console.log('✅ New portfolio item confirmed in Firestore');
      }

      // Update local state immediately for instant feedback
      const localItem: PortfolioItem = {
        ...portfolioItem,
        createdAt: now
      };
      setPortfolioItems(prev => {
        // Check if item already exists to avoid duplicates
        const exists = prev.some(p => p.id === localItem.id);
        if (exists) {
          console.log('⚠️ Item already in local state, skipping duplicate');
          return prev;
        }
        console.log('✅ Adding item to local state:', localItem.id);
        return [...prev, localItem];
      });

      // Wait longer for Firestore to process and propagate the update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh user data to sync with Firestore
      try {
        await refreshUser();
        console.log('✅ User data refreshed, portfolio synced with Firestore');
      } catch (refreshError) {
        console.error('⚠️ Error refreshing user data:', refreshError);
        // Don't fail the upload if refresh fails - local state is already updated
      }
      setNewItem({
        title: '',
        description: '',
        medium: '',
        dimensions: '',
        year: '',
        tags: '',
        isForSale: false,
        price: '',
        priceType: 'fixed',
        currency: 'USD',
        deliveryScope: 'worldwide',
        deliveryCountries: ''
      });
      setShowAddForm(false);

      toast({
        title: "Portfolio updated",
        description: "New artwork added to your portfolio.",
      });
    } catch (error: any) {
      console.error('❌ Error uploading portfolio image:', {
        error,
        errorMessage: error.message,
        errorCode: error.code,
        errorStack: error.stack,
        userId: user?.id,
        userName: user?.displayName || user?.username,
        fileName: file?.name
      });
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload artwork. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const handleUpdateItem = async (item: PortfolioItem) => {
    if (!user) return;

    try {
      // Remove old item and add updated item
      const updatedItems = portfolioItems.map(p => p.id === item.id ? item : p);
      
      await updateDoc(doc(db, 'userProfiles', user.id), {
        portfolio: updatedItems,
        updatedAt: serverTimestamp()
      });

      // Update artworks collection if sale info changed
      if (editingItemSaleInfo !== null) {
        const artworkRef = doc(db, 'artworks', item.id);
        const artworkDoc = await getDoc(artworkRef);
        
        if (editingItemSaleInfo.isForSale) {
          // Add or update in artworks collection
          const artworkData: any = {
            id: item.id,
            title: item.title,
            description: item.description,
            imageUrl: item.imageUrl,
            artist: {
              userId: user.id,
              name: user.displayName || user.username || 'Artist',
              handle: user.username || undefined,
              avatarUrl: user.avatarUrl || null,
            },
            tags: item.tags,
            isForSale: true,
            showInShop: true,
            category: item.medium || 'Other',
            medium: item.medium,
            dimensions: item.dimensions,
            updatedAt: serverTimestamp(),
            views: artworkDoc.exists() ? (artworkDoc.data().views || 0) : 0,
            likes: artworkDoc.exists() ? (artworkDoc.data().likes || 0) : 0,
            commentsCount: artworkDoc.exists() ? (artworkDoc.data().commentsCount || 0) : 0,
          };

          // Add sale-related fields
          if (editingItemSaleInfo.priceType === 'fixed' && editingItemSaleInfo.price) {
            artworkData.price = parseFloat(editingItemSaleInfo.price) * 100; // Convert to cents
            artworkData.currency = editingItemSaleInfo.currency || 'USD';
          } else if (editingItemSaleInfo.priceType === 'contact') {
            artworkData.priceType = 'contact';
            artworkData.contactForPrice = true;
          }
          artworkData.deliveryScope = editingItemSaleInfo.deliveryScope || 'worldwide';
          if (editingItemSaleInfo.deliveryScope === 'specific' && editingItemSaleInfo.deliveryCountries) {
            artworkData.deliveryCountries = editingItemSaleInfo.deliveryCountries.split(',').map((c: string) => c.trim()).filter(Boolean);
          }

          if (!artworkDoc.exists()) {
            artworkData.createdAt = serverTimestamp();
          }

          await setDoc(artworkRef, artworkData, { merge: true });
          console.log('✅ Artwork updated in artworks collection for shop');
        } else {
          // Remove from shop by setting isForSale to false
          if (artworkDoc.exists()) {
            await updateDoc(artworkRef, {
              isForSale: false,
              showInShop: false,
              updatedAt: serverTimestamp()
            });
            console.log('✅ Artwork removed from shop');
          }
        }
      }

      // Refresh user data to update the portfolio in the auth context
      await refreshUser();

      setPortfolioItems(updatedItems);
      setEditingItem(null);
      setEditingItemSaleInfo(null);

      toast({
        title: "Portfolio updated",
        description: "Artwork details have been updated.",
      });
    } catch (error) {
      console.error('Error updating portfolio item:', error);
      toast({
        title: "Update failed",
        description: "Failed to update artwork. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteItem = async (item: PortfolioItem) => {
    if (!user) return;

    try {
      // Delete image from storage
      if (item.imageUrl) {
        const imageRef = ref(storage, item.imageUrl);
        try {
          await deleteObject(imageRef);
        } catch (error) {
          console.error('Error deleting image from storage:', error);
          // Continue even if storage delete fails
        }
      }

      // Read current portfolio from Firestore
      const userDocRef = doc(db, 'userProfiles', user.id);
      const userDoc = await getDoc(userDocRef);
      const currentPortfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];
      
      // Remove item from portfolio array
      const updatedPortfolio = currentPortfolio.filter((p: any) => p.id !== item.id);
      
      console.log('🗑️ Deleting portfolio item:', {
        itemId: item.id,
        beforeCount: currentPortfolio.length,
        afterCount: updatedPortfolio.length
      });

      // Update Firestore with the filtered portfolio
      await updateDoc(userDocRef, {
        portfolio: updatedPortfolio,
        updatedAt: new Date()
      });

      // Refresh user data to update the portfolio in the auth context
      await refreshUser();

      setPortfolioItems(prev => prev.filter(p => p.id !== item.id));

      toast({
        title: "Artwork deleted",
        description: "Artwork has been removed from your portfolio.",
      });
    } catch (error) {
      console.error('Error deleting portfolio item:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete artwork. Please try again.",
        variant: "destructive"
      });
    }
  };

  console.log('🎬 PortfolioManager RETURN/RENDER:', { 
    hasUser: !!user,
    userId: user?.id,
    portfolioItemsCount: portfolioItems.length,
    showAddForm,
    willShowGrid: portfolioItems.length > 0
  });

  // Note: No need to check isProfessional here - this component is only rendered
  // when isProfessional is true (via ProfileTabs component)

  return (
    <div className="space-y-6">
      {/* Add New Artwork Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Artwork</CardTitle>
            <CardDescription>Upload a new piece to your portfolio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Artwork Title *</Label>
                <Input
                  id="title"
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter artwork title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medium">Medium</Label>
                <Input
                  id="medium"
                  value={newItem.medium}
                  onChange={(e) => setNewItem(prev => ({ ...prev, medium: e.target.value }))}
                  placeholder="Oil on canvas, Digital, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio-image">Artwork Image *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    console.log('🖼️ File picker button clicked');
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Choose Image'}
                </Button>
              </div>
              <Input
                ref={fileInputRef}
                id="portfolio-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="hidden"
              />
              {!newItem.title.trim() && (
                <p className="text-sm text-muted-foreground">Please enter an artwork title before uploading an image.</p>
              )}
              {isUploading && (
                <p className="text-sm text-muted-foreground">Uploading image...</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                  id="dimensions"
                  value={newItem.dimensions}
                  onChange={(e) => setNewItem(prev => ({ ...prev, dimensions: e.target.value }))}
                  placeholder="24 x 30 inches"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  value={newItem.year}
                  onChange={(e) => setNewItem(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="2024"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your artwork..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={newItem.tags}
                onChange={(e) => setNewItem(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="abstract, painting, modern (comma-separated)"
              />
            </div>

            {/* For Sale Toggle */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Mark as For Sale</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this to list this artwork in your shop. Make sure your Shop tab is enabled in Profile Settings.
                  </p>
                </div>
                <Switch
                  checked={newItem.isForSale}
                  onCheckedChange={(checked) => setNewItem(prev => ({ ...prev, isForSale: checked }))}
                />
              </div>

              {newItem.isForSale && (
                <div className="space-y-4 pl-4 border-l-2">
                  {/* Price Type */}
                  <div className="space-y-2">
                    <Label>Pricing</Label>
                    <Select
                      value={newItem.priceType}
                      onValueChange={(value: 'fixed' | 'contact') => setNewItem(prev => ({ ...prev, priceType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Set Price</SelectItem>
                        <SelectItem value="contact">Contact Artist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fixed Price Fields */}
                  {newItem.priceType === 'fixed' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Price *</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newItem.price}
                          onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select
                          value={newItem.currency}
                          onValueChange={(value) => setNewItem(prev => ({ ...prev, currency: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="CAD">CAD (C$)</SelectItem>
                            <SelectItem value="AUD">AUD (A$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Contact Artist Note */}
                  {newItem.priceType === 'contact' && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Customers will be prompted to email you to inquire about pricing.
                      </p>
                    </div>
                  )}

                  {/* Delivery Location */}
                  <div className="space-y-2">
                    <Label>Delivery Location</Label>
                    <Select
                      value={newItem.deliveryScope}
                      onValueChange={(value: 'worldwide' | 'specific') => setNewItem(prev => ({ ...prev, deliveryScope: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="worldwide">Worldwide</SelectItem>
                        <SelectItem value="specific">Specific Countries</SelectItem>
                      </SelectContent>
                    </Select>
                    {newItem.deliveryScope === 'specific' && (
                      <Input
                        placeholder="Enter countries (comma-separated)"
                        value={newItem.deliveryCountries}
                        onChange={(e) => setNewItem(prev => ({ ...prev, deliveryCountries: e.target.value }))}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewItem({
                    title: '',
                    description: '',
                    medium: '',
                    dimensions: '',
                    year: '',
                    tags: '',
                    isForSale: false,
                    price: '',
                    priceType: 'fixed',
                    currency: 'USD',
                    deliveryScope: 'worldwide',
                    deliveryCountries: ''
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Grid */}
      {(() => {
        console.log('🔍 PortfolioManager render check:', { 
          portfolioItemsLength: portfolioItems.length,
          showAddForm,
          hasItems: portfolioItems.length > 0
        });
        
        if (portfolioItems.length === 0) {
          return (
            <Card>
              <CardContent className="text-center py-12">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No artworks yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start building your portfolio by adding your first artwork.
                </p>
                <Button 
                  variant="gradient"
                  onClick={() => {
                    console.log('➕ Add Your First Artwork button clicked - redirect to /upload');
                    router.push('/upload');
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Artwork
                </Button>
              </CardContent>
            </Card>
          );
        }
        
        console.log('✅ PortfolioManager: Rendering grid with', portfolioItems.length, 'items');
        console.log('📊 PortfolioManager: Items data:', portfolioItems.map(i => ({ id: i.id, title: i.title, hasImage: !!i.imageUrl })));
        
        if (portfolioItems.length === 0) {
          console.error('❌ PortfolioManager: portfolioItems.length is 0 but we should have items!');
        }
        
        return (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {portfolioItems.length} artwork{portfolioItems.length !== 1 ? 's' : ''}
            </div>
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              data-portfolio-count={portfolioItems.length}
            >
              {portfolioItems.map((item, index) => {
              const imageUrl = item.imageUrl || '/assets/placeholder-light.png';
              // Only log first 3 items to avoid blocking
              if (index < 3) {
                console.log(`🎨 Rendering portfolio item ${index + 1}/${portfolioItems.length}:`, { 
                  id: item.id, 
                  title: item.title, 
                  hasImageUrl: !!item.imageUrl
                });
              }
              return (
              <Card 
                key={item.id || `portfolio-item-${index}`} 
                className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300"
                onClick={() => {
                  // Navigate to artwork detail page
                  if (item.id) {
                    router.push(`/artwork/${item.id}`);
                  }
                }}
              >
                <div className="relative h-64 bg-muted">
                  {item.imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        console.error('❌ Image load error for item:', item.id, item.title, imageUrl);
                        (e.target as HTMLImageElement).src = '/assets/placeholder-light.png';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Upload className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(item);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  {item.medium && (
                    <p className="text-sm text-muted-foreground mb-2">{item.medium}</p>
                  )}
                  {item.dimensions && (
                    <p className="text-sm text-muted-foreground mb-2">{item.dimensions}</p>
                  )}
                  {item.year && (
                    <p className="text-sm text-muted-foreground mb-2">{item.year}</p>
                  )}
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })}
            </div>
          </>
        );
      })()}

      {/* Edit Item Modal */}
      {editingItem && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Edit Artwork
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingItem(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-medium">Medium</Label>
                <Input
                  id="edit-medium"
                  value={editingItem.medium}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, medium: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dimensions">Dimensions</Label>
                <Input
                  id="edit-dimensions"
                  value={editingItem.dimensions}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, dimensions: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-year">Year</Label>
                <Input
                  id="edit-year"
                  value={editingItem.year}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, year: e.target.value } : null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editingItem.description}
                onChange={(e) => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                value={editingItem.tags.join(', ')}
                onChange={(e) => setEditingItem(prev => prev ? { 
                  ...prev, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                } : null)}
                placeholder="abstract, painting, modern (comma-separated)"
              />
            </div>

            {/* For Sale Toggle */}
            {editingItemSaleInfo !== null && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Mark as For Sale</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable this to list this artwork in your shop. Disabling will remove it from your shop.
                    </p>
                  </div>
                  <Switch
                    checked={editingItemSaleInfo.isForSale}
                    onCheckedChange={(checked) => setEditingItemSaleInfo(prev => prev ? { ...prev, isForSale: checked } : null)}
                  />
                </div>

                {editingItemSaleInfo.isForSale && (
                  <div className="space-y-4 pl-4 border-l-2">
                    {/* Price Type */}
                    <div className="space-y-2">
                      <Label>Pricing</Label>
                      <Select
                        value={editingItemSaleInfo.priceType}
                        onValueChange={(value: 'fixed' | 'contact') => setEditingItemSaleInfo(prev => prev ? { ...prev, priceType: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Set Price</SelectItem>
                          <SelectItem value="contact">Contact Artist</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Fixed Price Fields */}
                    {editingItemSaleInfo.priceType === 'fixed' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-price">Price *</Label>
                          <Input
                            id="edit-price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingItemSaleInfo.price}
                            onChange={(e) => setEditingItemSaleInfo(prev => prev ? { ...prev, price: e.target.value } : null)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-currency">Currency</Label>
                          <Select
                            value={editingItemSaleInfo.currency}
                            onValueChange={(value) => setEditingItemSaleInfo(prev => prev ? { ...prev, currency: value } : null)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="CAD">CAD (C$)</SelectItem>
                              <SelectItem value="AUD">AUD (A$)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Contact Artist Note */}
                    {editingItemSaleInfo.priceType === 'contact' && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Customers will be prompted to email you to inquire about pricing.
                        </p>
                      </div>
                    )}

                    {/* Delivery Location */}
                    <div className="space-y-2">
                      <Label>Delivery Location</Label>
                      <Select
                        value={editingItemSaleInfo.deliveryScope}
                        onValueChange={(value: 'worldwide' | 'specific') => setEditingItemSaleInfo(prev => prev ? { ...prev, deliveryScope: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="worldwide">Worldwide</SelectItem>
                          <SelectItem value="specific">Specific Countries</SelectItem>
                        </SelectContent>
                      </Select>
                      {editingItemSaleInfo.deliveryScope === 'specific' && (
                        <Input
                          placeholder="Enter countries (comma-separated)"
                          value={editingItemSaleInfo.deliveryCountries}
                          onChange={(e) => setEditingItemSaleInfo(prev => prev ? { ...prev, deliveryCountries: e.target.value } : null)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingItem(null);
                  setEditingItemSaleInfo(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingItem) {
                    handleUpdateItem(editingItem);
                  }
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
