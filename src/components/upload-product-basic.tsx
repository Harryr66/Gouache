'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/providers/auth-provider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

// List of countries for delivery selector
const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Italy', 'Spain',
  'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'Ireland', 'Portugal', 'Greece', 'Poland', 'Czech Republic', 'Hungary', 'Romania', 'Bulgaria',
  'Croatia', 'Slovenia', 'Slovakia', 'Estonia', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta',
  'Cyprus', 'Japan', 'South Korea', 'China', 'India', 'Singapore', 'Hong Kong', 'Taiwan',
  'Thailand', 'Malaysia', 'Indonesia', 'Philippines', 'Vietnam', 'New Zealand', 'South Africa',
  'Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Uruguay', 'Ecuador',
  'Venezuela', 'Panama', 'Costa Rica', 'Guatemala', 'Israel', 'United Arab Emirates', 'Saudi Arabia',
  'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Lebanon', 'Egypt', 'Morocco',
  'Tunisia', 'Turkey', 'Russia', 'Ukraine', 'Belarus', 'Iceland', 'Liechtenstein', 'Monaco',
  'Andorra', 'San Marino', 'Vatican City', 'Albania', 'Bosnia and Herzegovina', 'Serbia', 'Montenegro',
  'North Macedonia', 'Kosovo', 'Moldova', 'Georgia', 'Armenia', 'Azerbaijan', 'Kazakhstan',
  'Uzbekistan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Mongolia', 'Nepal', 'Bhutan',
  'Bangladesh', 'Sri Lanka', 'Maldives', 'Myanmar', 'Cambodia', 'Laos', 'Brunei', 'East Timor',
  'Papua New Guinea', 'Fiji', 'Samoa', 'Tonga', 'Vanuatu', 'Solomon Islands', 'Palau',
  'Micronesia', 'Marshall Islands', 'Kiribati', 'Tuvalu', 'Nauru', 'Mauritius', 'Seychelles',
  'Madagascar', 'Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia', 'Ghana', 'Nigeria',
  'Senegal', 'Ivory Coast', 'Cameroon', 'Gabon', 'Botswana', 'Namibia', 'Zimbabwe', 'Zambia',
  'Mozambique', 'Angola', 'Malawi', 'Lesotho', 'Swaziland', 'Djibouti', 'Eritrea', 'Sudan',
  'Chad', 'Niger', 'Mali', 'Burkina Faso', 'Guinea', 'Sierra Leone', 'Liberia', 'Togo',
  'Benin', 'Gambia', 'Guinea-Bissau', 'Cape Verde', 'São Tomé and Príncipe', 'Equatorial Guinea',
  'Central African Republic', 'Democratic Republic of the Congo', 'Republic of the Congo', 'Burundi',
  'Comoros', 'Algeria', 'Libya', 'Tunisia', 'Mauritania', 'Western Sahara', 'Afghanistan',
  'Iran', 'Iraq', 'Syria', 'Yemen', 'Oman', 'Pakistan', 'Bangladesh', 'Myanmar',
  'North Korea', 'Mongolia', 'Bhutan', 'Nepal', 'Sri Lanka', 'Maldives', 'Other'
].sort();

/**
 * BASIC Product Upload - Simple product upload portal
 * Images, Title, Description, Price/Delivery or Contact to Order
 */
export function UploadProductBasic() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [priceType, setPriceType] = useState<'fixed' | 'contact'>('fixed');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD'>('USD');
  const [deliveryScope, setDeliveryScope] = useState<'worldwide' | 'specific'>('worldwide');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [useAccountEmail, setUseAccountEmail] = useState(true);
  const [alternativeEmail, setAlternativeEmail] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    );
    
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    const input = document.getElementById('product-images') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !files.length || !title.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please select at least one image and enter a title.',
        variant: 'destructive',
      });
      return;
    }

    if (priceType === 'fixed' && !price.trim()) {
      toast({
        title: 'Missing price',
        description: 'Please enter a price or select "Contact to order".',
        variant: 'destructive',
      });
      return;
    }

    if (priceType === 'contact' && !useAccountEmail && !alternativeEmail.trim()) {
      toast({
        title: 'Missing email',
        description: 'Please enter an alternative email address.',
        variant: 'destructive',
      });
      return;
    }

    if (priceType === 'contact' && !useAccountEmail && alternativeEmail.trim() && !alternativeEmail.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Upload all images to Firebase Storage
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileRef = ref(storage, `marketplaceProducts/${user.id}/${Date.now()}_${i}_${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);
        uploadedUrls.push(fileUrl);
      }

      // Create product document in marketplaceProducts collection
      const productData: any = {
        title: title.trim(),
        description: description.trim() || '',
        images: uploadedUrls,
        imageUrl: uploadedUrls[0], // Primary image
        sellerId: user.id,
        sellerName: user.displayName || user.username || 'Artist',
        currency: currency,
        category: 'merchandise',
        isActive: true,
        stock: 1, // Default stock
        isAffiliate: false,
        salesCount: 0,
        rating: 0,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isApproved: true,
        status: 'approved',
      };

      // Add pricing/delivery fields
      // Always set currency
      productData.currency = currency;
      
      if (priceType === 'fixed' && price.trim()) {
        productData.price = parseFloat(price) * 100; // Convert to cents
      } else if (priceType === 'contact') {
        productData.priceType = 'contact';
        productData.contactForPrice = true;
        productData.contactEmail = useAccountEmail ? user.email : alternativeEmail.trim();
        productData.price = 0; // No fixed price
      }

      productData.deliveryScope = deliveryScope;
      if (deliveryScope === 'specific' && selectedCountries.length > 0) {
        productData.deliveryCountries = selectedCountries.join(', ');
      }

      // Add to marketplaceProducts collection
      await addDoc(collection(db, 'marketplaceProducts'), productData);

      toast({
        title: 'Product uploaded',
        description: 'Your product has been added to your shop.',
      });

      // Reset form and cleanup object URLs
      files.forEach(file => {
        const url = URL.createObjectURL(file);
        URL.revokeObjectURL(url);
      });
      setFiles([]);
      setTitle('');
      setDescription('');
      setPriceType('fixed');
      setPrice('');
      setCurrency('USD');
      setDeliveryScope('worldwide');
      setSelectedCountries([]);
      setCountrySearch('');
      setUseAccountEmail(true);
      setAlternativeEmail('');

      // Navigate to profile shop tab
      router.push('/profile?tab=shop&subtab=products');
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload product. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Please log in to upload products.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Product</CardTitle>
        <CardDescription>
          Add products to your shop.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Images *</Label>
            
            {/* Hidden file input */}
            <Input
              type="file"
              id="product-images"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Drag and drop area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-6 transition-colors
                ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                ${files.length === 0 ? 'cursor-pointer hover:border-primary hover:bg-primary/5' : ''}
              `}
              onClick={files.length === 0 ? triggerFileInput : undefined}
            >
              {files.length === 0 ? (
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Click or drag images here</p>
                  <p className="text-xs text-muted-foreground">
                    Select multiple images at once or add them one by one
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {files.length} image(s) selected
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={triggerFileInput}
                    >
                      Add More Images
                    </Button>
                  </div>
                  
                  {/* Image preview tiles */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {files.map((file, index) => {
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border-2 border-muted">
                            <img
                              src={previewUrl}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {index === 0 && (
                            <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                              Main
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                              URL.revokeObjectURL(previewUrl);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {file.name}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  
                  {files.length > 1 && (
                    <p className="text-xs text-muted-foreground text-center">
                      First image is the main display. Others will appear in carousel.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="product-title">Title *</Label>
            <Input
              id="product-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter product title"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product..."
              rows={3}
            />
          </div>

          {/* Pricing Options */}
          <div className="space-y-4 p-4 border rounded-lg">
            <Label className="text-base font-semibold mb-4 block">Pricing & Delivery</Label>
            
            {/* Price Type */}
            <div className="space-y-2">
              <Label>Pricing</Label>
              <Select
                value={priceType}
                onValueChange={(value: 'fixed' | 'contact') => setPriceType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Set Price</SelectItem>
                  <SelectItem value="contact">Contact to Order</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fixed Price Fields */}
            {priceType === 'fixed' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product-price">Price *</Label>
                  <Input
                    id="product-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-currency">Currency</Label>
                  <Select 
                    value={currency} 
                    onValueChange={(value: 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD') => setCurrency(value)}
                  >
                    <SelectTrigger id="product-currency">
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

            {/* Currency selector for contact pricing */}
            {priceType === 'contact' && (
              <div className="space-y-2">
                <Label htmlFor="product-currency-contact">Currency</Label>
                <Select 
                  value={currency} 
                  onValueChange={(value: 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD') => setCurrency(value)}
                >
                  <SelectTrigger id="product-currency-contact">
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
                <p className="text-xs text-muted-foreground">
                  Currency for pricing when customers contact you
                </p>
              </div>
            )}

            {/* Contact to Order Email Options */}
            {priceType === 'contact' && (
              <div className="space-y-3">
                <Label>Contact Email</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="product-useAccountEmail"
                      name="product-contactEmail"
                      checked={useAccountEmail}
                      onChange={() => {
                        setUseAccountEmail(true);
                        setAlternativeEmail('');
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="product-useAccountEmail" className="cursor-pointer font-normal">
                      Use account email ({user?.email || 'your email'})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="product-useAlternativeEmail"
                      name="product-contactEmail"
                      checked={!useAccountEmail}
                      onChange={() => setUseAccountEmail(false)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="product-useAlternativeEmail" className="cursor-pointer font-normal">
                      Use alternative email
                    </Label>
                  </div>
                  {!useAccountEmail && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="product-alternativeEmail">Alternative Email *</Label>
                      <Input
                        id="product-alternativeEmail"
                        type="email"
                        value={alternativeEmail}
                        onChange={(e) => setAlternativeEmail(e.target.value)}
                        placeholder="business@example.com"
                        required={!useAccountEmail}
                      />
                      <p className="text-xs text-muted-foreground">
                        Customers will contact this email to order.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Delivery Scope */}
            <div className="space-y-2">
              <Label>Available for delivery</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className={deliveryScope === 'worldwide' ? '!bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!text-primary-foreground border-primary' : ''}
                  onClick={() => {
                    setDeliveryScope('worldwide');
                    setSelectedCountries([]);
                    setCountrySearch('');
                  }}
                >
                  Worldwide
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={deliveryScope === 'specific' ? '!bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!text-primary-foreground border-primary' : ''}
                  onClick={() => setDeliveryScope('specific')}
                >
                  Specific countries
                </Button>
              </div>
              {deliveryScope === 'specific' && (
                <div className="space-y-2 mt-3">
                  <Label>Select countries</Label>
                  <Input
                    placeholder="Search countries..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                    {COUNTRIES.filter(country => 
                      country.toLowerCase().includes(countrySearch.toLowerCase())
                    ).map((country) => (
                      <div key={country} className="flex items-center space-x-2">
                        <Checkbox
                          id={`product-country-${country}`}
                          checked={selectedCountries.includes(country)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCountries([...selectedCountries, country]);
                            } else {
                              setSelectedCountries(selectedCountries.filter(c => c !== country));
                            }
                          }}
                        />
                        <Label 
                          htmlFor={`product-country-${country}`} 
                          className="cursor-pointer font-normal text-sm"
                        >
                          {country}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedCountries.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        Selected: {selectedCountries.length} countr{selectedCountries.length === 1 ? 'y' : 'ies'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedCountries.map((country) => (
                          <Badge key={country} variant="secondary" className="text-xs">
                            {country}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCountries(selectedCountries.filter(c => c !== country));
                              }}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" variant="gradient" disabled={uploading || !files.length || !title.trim()} className="w-full">
            {uploading ? 'Uploading...' : 'Upload Product'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

