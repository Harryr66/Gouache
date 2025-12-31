export interface Artist {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string | null;
  bio?: string;
  website?: string;
  followerCount: number;
  followingCount: number;
  createdAt: Date;
  isVerified?: boolean;
  isProfessional?: boolean;
  location?: string;
  // Optional country fields for advanced search filters
  countryOfOrigin?: string;
  countryOfResidence?: string;
  socialLinks?: {
    instagram?: string;
    x?: string; // renamed from twitter
    website?: string;
  };
  // Portfolio and content
  portfolioImages?: Array<{
    id: string;
    imageUrl: string;
    title: string;
    description?: string;
    medium?: string;
    year?: string;
    tags?: string[];
    createdAt: Date;
  }>;
  events?: Array<{
    id: string;
    title: string;
    description: string;
    date: Date;
    endDate?: Date;
    location: string;
    venue?: string;
    type: string;
    bookingUrl?: string;
    imageUrl?: string;
    price?: string;
    capacity?: number;
    isEditable?: boolean;
  }>;
  courses?: Array<{
    id: string;
    title: string;
    description: string;
    price: number;
    thumbnailUrl?: string;
    students?: number;
    rating?: number;
    createdAt: Date;
  }>;
  showcaseLocations?: ShowcaseLocation[];
  // Thumbnail for discover tile
  discoverThumbnail?: string;
}

export interface Gallery {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string | null;
  bio?: string;
  website?: string;
  location?: string;
  country?: string;
  city?: string;
  followerCount: number;
  followingCount: number;
  createdAt: Date;
  isVerified?: boolean;
  // Gallery-specific fields
  galleryType?: 'commercial' | 'non-profit' | 'artist-run' | 'museum' | 'other';
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: {
    instagram?: string;
    x?: string;
    website?: string;
    facebook?: string;
  };
  // Events managed by gallery
  events?: Array<{
    id: string;
    title: string;
    description: string;
    date: Date;
    endDate?: Date;
    location: string;
    venue?: string;
    type: string;
    bookingUrl?: string;
    imageUrl?: string;
    price?: string;
    capacity?: number;
    isEditable?: boolean;
  }>;
  // Artworks for sale
  artworksForSale?: Array<{
    id: string;
    title: string;
    artistName: string;
    artistId?: string;
    imageUrl: string;
    price: number;
    currency: string;
    description?: string;
    medium?: string;
    dimensions?: string;
    year?: string;
    tags?: string[];
    isAvailable: boolean;
    createdAt: Date;
  }>;
  showcaseLocations?: ShowcaseLocation[];
}

export interface ArtistRequest {
  id: string;
  userId: string;
  user: User;
  portfolioImages: string[];
  artistStatement?: string;
  experience: string;
  socialLinks?: {
    instagram?: string;
    x?: string; // renamed from twitter
    website?: string;
    tiktok?: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'removed';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface ArtistInvite {
  id: string;
  email: string;
  name?: string;
  token: string;
  status: 'pending' | 'redeemed' | 'revoked' | 'expired' | 'archived';
  createdAt: Date;
  createdBy?: string;
  createdByName?: string;
  lastSentAt?: Date;
  redeemedAt?: Date;
  redeemedBy?: string;
  lastAccessedAt?: Date;
  lastError?: string;
  revokedAt?: Date;
  archivedAt?: Date;
  message?: string | null;
}

export interface AdvertisingApplication {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  advertisingType: string;
  budget?: string;
  targetAudience?: string;
  campaignGoals?: string;
  message?: string;
  timeline?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
}

export interface MarketplaceProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  category: string;
  subcategory: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  sellerWebsite?: string;
  affiliateLink?: string;
  isAffiliate: boolean;
  isActive: boolean;
  stock: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  dimensions?: {
    width: number;
    height: number;
    depth?: number;
    unit: 'cm' | 'in';
  };
  weight?: number;
  shippingInfo?: {
    freeShipping: boolean;
    shippingCost: number;
    estimatedDays: number;
  };
  createdAt: Date;
  updatedAt: Date;
  salesCount: number;
  isOnSale: boolean;
  // Admin approval workflow
  isApproved?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  isWishlisted?: boolean;
  // Stripe fees handling
  stripeFeesIncluded?: boolean; // If true, price includes Stripe fees (seller pays fees). If false, fees are added on top (buyer pays fees).
}

export interface AffiliateProductRequest {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  website: string;
  productCategory: string;
  productSubcategory: string;
  productTitle: string;
  productDescription: string;
  productPrice: number;
  productCurrency: string;
  productImages: string[];
  affiliateLink: string;
  targetAudience?: string;
  marketingGoals?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  notes?: string;
}

// Gouache Learn Course System Types
export interface Instructor {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  bio: string;
  rating: number;
  students: number;
  courses: number;
  verified: boolean;
  location?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    x?: string; // renamed from twitter
    youtube?: string;
    facebook?: string;
    linkedin?: string;
  };
  credentials?: string;
  specialties: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseLesson {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'assignment' | 'quiz' | 'reading' | 'live';
  duration?: string;
  videoUrl?: string;
  content?: string;
  attachments?: string[];
  isPreview: boolean;
  isCompleted?: boolean;
  order: number;
}

export interface CourseWeek {
  week: number;
  title: string;
  description?: string;
  lessons: CourseLesson[];
}

export interface CourseReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: Date;
  isVerified: boolean;
}

export interface CourseDiscussion {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  title: string;
  content: string;
  replies: CourseDiscussionReply[];
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  isResolved: boolean;
}

export interface CourseDiscussionReply {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: Date;
  isInstructorReply: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  instructor: Instructor;
  thumbnail: string;
  previewVideoUrl?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  category: string;
  subcategory: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  format: 'Self-Paced' | 'Live Sessions' | 'Hybrid' | 'E-Book';
  students: number;
  lessons: number;
  rating: number;
  reviewCount: number;
  isOnSale: boolean;
  isNew: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  // Admin approval workflow
  status?: 'pending' | 'approved' | 'rejected';
  tags: string[];
  skills: string[];
  curriculum: CourseWeek[];
  reviews: CourseReview[];
  discussions: CourseDiscussion[];
  enrollmentCount: number;
  completionRate: number;
  supplyList?: SupplyItem[];
  // Course hosting type: 'hosted' = hosted on platform, 'affiliate' = external link
  courseType?: 'hosted' | 'affiliate';
  // External URL for affiliate courses (where course is hosted externally)
  externalUrl?: string;
  // Link type: 'direct' = direct course link, 'enrollment' = auto-enrollment link, 'affiliate' = affiliate/referral link
  linkType?: 'direct' | 'enrollment' | 'affiliate';
  // Platform where course is hosted (for better UX and future integrations)
  hostingPlatform?: string;
  // SEO fields
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface SupplyItem {
  id: string;
  item: string;
  brand: string;
  affiliateLink?: string;
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  paymentIntentId?: string; // CRITICAL: Added for paid course verification
  enrolledAt: Date;
  completedAt?: Date;
  progress: number; // 0-100
  currentWeek: number;
  currentLesson: number;
  completedLessons: string[];
  lastAccessedAt: Date;
  certificateEarned: boolean;
  certificateUrl?: string;
  isActive: boolean;
}

export interface CourseSubmission {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  website: string;
  courseTitle: string;
  courseCategory: string;
  courseSubcategory: string;
  courseDescription: string;
  courseDuration?: string;
  courseFormat?: string;
  instructorBio: string;
  teachingExperience: string;
  sampleWork?: string;
  courseGoals?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  notes?: string;
}

export interface Artwork {
  id: string;
  artist: Artist;
  title: string;
  description?: string;
  imageUrl: string;
  imageAiHint: string;
  imageWidth?: number; // Pixel width for HTML attributes (prevents layout shift)
  imageHeight?: number; // Pixel height for HTML attributes (prevents layout shift)
  blurPlaceholder?: string; // Base64-encoded blur placeholder for instant visual feedback (Pinterest/Instagram style)
  discussionId?: string;
  tags: string[];
  price?: number;
  currency?: string;
  isForSale?: boolean;
  sold?: boolean;
  priceType?: 'fixed' | 'contact';
  contactForPrice?: boolean;
  isAuction?: boolean;
  auctionId?: string;
  category?: string;
  medium?: string;
  dimensions?: {
    width: number;
    height: number;
    unit: 'cm' | 'in' | 'px';
  };
  createdAt: Date;
  updatedAt: Date;
  views?: number;
  likes?: number;
  commentsCount?: number;
  isAI?: boolean;
  aiAssistance?: 'none' | 'assisted' | 'generated';
  processExplanation?: string;
  materialsList?: string;
  supportingImages?: string[];
  supportingVideos?: string[];
  supportingMedia?: string[]; // Alternative name for supporting media
  mediaUrls?: string[]; // Array of all media URLs (images and videos)
  mediaTypes?: string[]; // Types for each media file ('image' or 'video')
  statement?: string;
  // Stripe fees handling
  stripeFeesIncluded?: boolean; // If true, price includes Stripe fees (seller pays fees). If false, fees are added on top (buyer pays fees).
  // Video support
  videoUrl?: string; // Legacy: single video URL (deprecated, use videoVariants)
  mediaType?: 'image' | 'video';
  // Multiple quality video variants (240p for tiles, 720p for expanded)
  videoVariants?: {
    thumbnail: string; // 240p low quality for tiles/previews (faster loading)
    full: string; // 720p full quality for expanded view
    thumbnailQuality?: '240p';
    fullQuality?: '720p';
    thumbnailBitrate?: number; // in kbps (e.g., 300)
    fullBitrate?: number; // in kbps (e.g., 1000-2500)
  };
}

export interface Post {
  id: string;
  artworkId: string;
  artist: Artist;
  imageUrl: string;
  imageAiHint: string;
  caption: string;
  likes: number;
  commentsCount: number;
  timestamp: string;
  createdAt: number;
  discussionId?: string;
  listing?: {
    type: 'sale' | 'auction';
    endDate?: string;
  };
  resharedBy?: Artist;
  tags?: string[];
  location?: string;
  isAI?: boolean;
  aiAssistance?: 'none' | 'assisted' | 'generated';
}

export interface CaptionConfig {
  id: string;
  text: string;
  color: string;
  backgroundColor: string;
  hasBackground: boolean;
  x: number;
  y: number;
  fontSize: number;
  rotation?: number;
}

export interface StoryItem {
  id: string;
  artistId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: number;
  captionConfigs?: CaptionConfig[];
  mediaConfig?: {
    scale: number;
    x: number;
    y: number;
    bgColor: string;
  };
  views?: number;
  expiresAt: number;
}

export interface Story {
  id: string;
  artist: Artist;
  items: StoryItem[];
}

export interface Event {
  id: string;
  title: string;
  imageUrl: string;
  imageAiHint: string;
  date: string;
  endDate?: string;
  type: 'Auction' | 'Exhibition' | 'Workshop';
  artist: Artist;
  locationType: 'Online' | 'In-person';
  locationName?: string;
  locationAddress?: string;
  description: string;
  discussionId: string;
  attendees?: string[];
  maxAttendees?: number;
  price?: number | string;
  currency?: string;
  bookingUrl?: string;
}

export interface ShowcaseLocation {
  id?: string;
  name: string;
  venue?: string;
  city?: string;
  country?: string;
  website?: string;
  notes?: string;
  imageUrl?: string;
  startDate?: string; // Optional start date (ISO string) - used to determine if event is current or upcoming
  endDate?: string; // Optional end date (ISO string) - if not set, remains indefinitely
  pinned?: boolean; // Pin this event/location to the start of the carousel
  type?: 'event' | 'location'; // Type: 'event' for events, 'location' for showcase locations
}

export interface ArticleSection {
  id: string;
  type: 'headline' | 'subheadline' | 'intro' | 'body' | 'outro' | 'image' | 'text-image';
  content?: string; // Text content for text sections
  imageUrl?: string; // Image URL for image sections
  imagePosition?: 'above' | 'below' | 'left' | 'right'; // For text-image sections
  caption?: string; // Optional image caption
  order: number; // Order of section in article
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  subheadline?: string; // Optional subheadline for articles
  category: string;
  imageUrl: string;
  thumbnailUrl?: string; // Thumbnail image for news page listing
  publishedAt?: Date; // Optional for drafts
  updatedAt?: Date;
  author?: string;
  authorAvatarUrl?: string; // Profile image URL for the article author
  tags?: string[];
  externalUrl?: string;
  featured?: boolean;
  content?: string; // Legacy field - kept for backward compatibility
  sections?: ArticleSection[]; // New rich content sections
  archived?: boolean;
  archivedAt?: Date;
  location?: 'main-banner' | 'whats-new' | 'evergreen';
  status?: 'draft' | 'published'; // Draft status for articles
  artistResearchData?: {
    artistName: string;
    website?: string;
    socialLinks?: string[];
    researchNotes?: string;
  };
}

export interface Comment {
  id: string;
  contentId: string;
  contentType: 'episode' | 'docuseries' | 'artwork';
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  likes: number;
  dislikes: number;
  replies: Comment[];
  isDeleted: boolean;
  isReported: boolean;
  reportCount: number;
  isModerated: boolean;
  moderatedBy?: string;
  moderatedAt?: Date;
  moderationReason?: string;
}

export interface Advertisement {
  id: string;
  title: string;
  description: string;
  advertiserName: string;
  advertiserWebsite?: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  duration: number; // in seconds
  type: 'pre-roll' | 'post-roll' | 'banner' | 'overlay';
  targetAudience?: string[];
  budget?: number;
  currency?: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  impressions: number;
  clicks: number;
  views: number;
  clickThroughRate: number;
  costPerImpression: number;
  costPerClick: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // admin user ID
}

export interface AdvertisementAnalytics {
  id: string;
  advertisementId: string;
  date: Date;
  impressions: number;
  clicks: number;
  views: number;
  uniqueViews: number;
  completionRate: number; // percentage of users who watched the full ad
  clickThroughRate: number;
  costPerImpression: number;
  costPerClick: number;
  revenue: number;
}

export interface CommentReport {
  id: string;
  commentId: string;
  reporterId: string;
  reporterName: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'hate_speech' | 'violence' | 'other';
  description?: string;
  reportedAt: Date;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
  action?: 'warning' | 'comment_removed' | 'user_suspended' | 'no_action';
}

export interface ChatMessage {
  id: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
  text: string;
  timestamp: string;
  isOwnMessage?: boolean;
}

export interface Reply {
  id: string;
  author: Artist;
  timestamp: string;
  content: string;
  upvotes: number;
  downvotes: number;
  isPinned?: boolean;
  replies?: Reply[];
  replyCount?: number;
}

export interface Discussion {
  id: string;
  title: string;
  author: Artist;
  timestamp: string;
  content: string;
  upvotes: number;
  downvotes: number;
  isPinned: boolean;
  replyCount: number;
  replies?: Reply[];
  tags?: string[];
  category?: string;
  isLocked?: boolean;
  isSticky?: boolean;
}

export interface Report {
  id: string;
  contentId: string;
  contentType: 'Artwork' | 'Discussion' | 'Reply' | 'Post' | 'User' | 'Community';
  content: string;
  reportedBy: string;
  reporterId?: string;
  offenderId: string;
  offenderHandle: string;
  reason: string;
  details?: string;
  timestamp: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
  isAIContentReport?: boolean; // Flag for AI-generated content reports
}

export interface UserReport {
  id: string;
  userId: string;
  userEmail: string;
  username: string;
  displayName: string;
  message: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  submittedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  adminNotes?: string;
}

// New types for production features

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bannerImageUrl?: string;
  bio?: string;
  website?: string;
  location?: string;
  countryOfOrigin?: string;
  countryOfResidence?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
  isVerified: boolean;
  isProfessional: boolean;
  isActive: boolean;
  lastSeen?: Date;
  artistType?: string;
  isAdmin?: boolean;
  tipJarEnabled?: boolean;
  suggestionsEnabled?: boolean;
  hideLocation?: boolean;
  hideFlags?: boolean;
  hideCard?: boolean;
  hideShowcaseLocations?: boolean;
  hideUpcomingEvents?: boolean;
  hideShop?: boolean;
  hideLearn?: boolean;
  eventCity?: string;
  eventCountry?: string;
  eventDate?: string;
  eventStartDate?: string; // Optional start date (ISO string)
  eventEndDate?: string; // Optional end date (ISO string) - if not set, remains indefinitely
  newsletterLink?: string;
  accountRole?: 'user' | 'artist' | 'gallery' | 'admin';
  artistInviteToken?: string;
  artistOnboarding?: {
    completed: boolean;
    version?: number;
    completedAt?: Date;
  };
  portfolio?: Array<{
    id: string;
    imageUrl: string;
    title: string;
    description: string;
    medium: string;
    dimensions: string;
    year: string;
    tags: string[];
    createdAt: Date;
  }>;
  socialLinks?: {
    instagram?: string;
    x?: string; // renamed from twitter
    website?: string;
    tiktok?: string;
  };
  preferences?: {
    notifications: {
      likes: boolean;
      comments: boolean;
      follows: boolean;
      messages: boolean;
      auctions: boolean;
    };
    privacy: {
      showEmail: boolean;
      showLocation: boolean;
      allowMessages: boolean;
    };
    discover?: {
      hideDigitalArt?: boolean;
      hideAIAssistedArt?: boolean;
      hideNFTs?: boolean;
      hidePhotography?: boolean;
      hideVideoArt?: boolean;
      hidePerformanceArt?: boolean;
      hideInstallationArt?: boolean;
      hidePrintmaking?: boolean;
      hideTextileArt?: boolean;
    };
  };
  showcaseLocations?: ShowcaseLocation[];
  // Stripe Connect fields
  stripeAccountId?: string; // Stripe Connect account ID
  stripeOnboardingStatus?: 'incomplete' | 'pending' | 'complete'; // Onboarding status
  stripeOnboardingUrl?: string; // URL to complete onboarding
  stripeChargesEnabled?: boolean; // Whether charges are enabled
  stripePayoutsEnabled?: boolean; // Whether payouts are enabled
  stripeAccountType?: 'express' | 'standard' | 'custom'; // Account type
  platformDonationEnabled?: boolean; // Whether artist wants to donate to platform
  platformDonationType?: 'ongoing' | 'one-time'; // Type of donation: ongoing (percentage of sales) or one-time
  platformDonationPercentage?: number; // Percentage of sales to donate (0-100) for ongoing donations
  platformDonationOneTimeAmount?: number; // One-time donation amount in cents
  platformDonationOneTimeCompleted?: boolean; // Whether one-time donation has been completed
  platformDonationOneTimeCurrency?: string; // Currency for one-time donation (e.g., 'usd', 'gbp', 'eur')
  // Newsletter integration fields
  newsletterProvider?: 'convertkit' | 'mailchimp' | 'substack' | 'custom' | null;
  newsletterApiKey?: string; // Encrypted server-side, never exposed to client
  newsletterFormId?: string; // ConvertKit form ID, Mailchimp list ID, etc.
  newsletterConnectedAt?: Date;
  newsletterSubscriberCount?: number; // Cached subscriber count
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  unreadCount?: { [userId: string]: number };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
  type: 'text' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  replyTo?: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  memberCount: number;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  isActive: boolean;
  rules?: string[];
  tags?: string[];
  category?: string;
  location?: string;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  author: Artist;
  title: string;
  content: string;
  imageUrl?: string;
  tags?: string[];
  likes: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  isLocked: boolean;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  artworkId: string;
  sellerId: string;
  startingPrice: number;
  currentPrice: number;
  reservePrice?: number;
  buyNowPrice?: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
  winnerId?: string;
  bidCount: number;
  imageUrl: string;
  category?: string;
  tags?: string[];
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  timestamp: Date;
  isWinning: boolean;
  isAutoBid: boolean;
  maxBid?: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  sellerId: string;
  price: number;
  currency: string;
  category: string;
  tags?: string[];
  images: string[];
  isDigital: boolean;
  isPhysical: boolean;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  salesCount: number;
  rating: number;
  reviewCount: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
    unit: 'cm' | 'in';
  };
  weight?: number;
  shippingInfo?: {
    freeShipping: boolean;
    shippingCost: number;
    estimatedDays: number;
  };
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  addedAt: Date;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentMethod: string;
  paymentId?: string;
  shippingAddress: Address;
  billingAddress: Address;
  createdAt: Date;
  updatedAt: Date;
  trackingNumber?: string;
  notes?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  total: number;
}

export interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'auction' | 'order' | 'system';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
  imageUrl?: string;
}

export interface SearchResult {
  type: 'user' | 'artwork' | 'post' | 'community' | 'auction' | 'product';
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  relevance: number;
  data: any;
}

// Analytics types
export interface AnalyticsEvent {
  id: string;
  userId?: string;
  event: string;
  properties: { [key: string]: any };
  timestamp: Date;
  sessionId?: string;
}

export interface UserActivity {
  userId: string;
  lastActive: Date;
  totalSessions: number;
  totalTime: number;
  pagesVisited: string[];
  actionsPerformed: { [action: string]: number };
}

// Admin types
export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: string[];
  createdAt: Date;
  lastActive: Date;
}

export interface ModerationAction {
  id: string;
  adminId: string;
  targetType: 'user' | 'post' | 'artwork' | 'community' | 'auction';
  targetId: string;
  action: 'warn' | 'suspend' | 'ban' | 'delete' | 'approve' | 'reject';
  reason: string;
  duration?: number; // in days for suspensions
  createdAt: Date;
  expiresAt?: Date;
}

// Streaming Platform Types

export interface Docuseries {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  bannerUrl: string;
  featuredArtist: Artist;
  category: 'Emerging Artists' | 'Street Art' | 'Digital Art' | 'Traditional Art' | 'Sculpture' | 'Photography' | 'Mixed Media';
  genre: 'Documentary' | 'Behind the Scenes' | 'Tutorial' | 'Interview' | 'Process' | 'Exhibition';
  totalEpisodes: number;
  totalDuration: number; // in minutes
  releaseDate: Date;
  lastUpdated: Date;
  rating: number;
  viewCount: number;
  isFeatured: boolean;
  isNew: boolean;
  tags: string[];
  status: 'ongoing' | 'completed' | 'upcoming';
  episodes: Episode[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Episode {
  id: string;
  docuseriesId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number; // in seconds
  episodeNumber: number;
  seasonNumber: number;
  releaseDate: Date;
  viewCount: number;
  likes: number;
  commentsCount: number;
  isPublished: boolean;
  isFeatured: boolean;
  isMainEvent: boolean; // New: High-profile episodes for hero banner
  tags: string[];
  categories: string[]; // New: Art medium categories (Oil, Acrylic, Pastel, etc.)
  displayLocation: 'main-banner' | 'new-releases' | 'trending' | 'most-loved' | 'all'; // New: Where to display the video
  likedBy: string[]; // New: Array of user IDs who liked the video
  artist: Artist;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchHistory {
  id: string;
  userId: string;
  episodeId: string;
  episode: Episode;
  watchedDuration: number; // in seconds
  totalDuration: number; // in seconds
  lastWatchedAt: Date;
  isCompleted: boolean;
  progress: number; // percentage 0-100
}

export interface Watchlist {
  id: string;
  userId: string;
  docuseriesId: string;
  docuseries: Docuseries;
  addedAt: Date;
}

export interface StreamingCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  docuseriesCount: number;
  isActive: boolean;
}

export interface FeaturedContent {
  id: string;
  type: 'docuseries' | 'episode';
  contentId: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  priority: number;
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
}

// Partner Advertising Types
export interface PartnerAccount {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  phone?: string;
  createdAt: Date;
  isActive: boolean;
  accountType: 'partner';
}

export interface AdCampaign {
  id: string;
  partnerId: string;
  title: string;
  description?: string;
  placement: 'news' | 'discover' | 'learn';
  imageUrl?: string;
  videoUrl?: string;
  mediaType: 'image' | 'video';
  videoDuration?: number; // in seconds, max 60
  maxWidthFormat?: boolean; // If true, video ad spans multiple columns on mobile (requires square 1:1 or landscape 16:9)
  clickUrl: string; // Where the ad links to
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  clicks: number;
  impressions: number;
  createdAt: Date;
  updatedAt: Date;
  // Budget management
  budget?: number; // Total budget in cents (e.g., $100 = 10000 cents). null if uncapped
  dailyBudget?: number; // Daily budget limit in cents (optional)
  spent?: number; // Amount spent so far in cents
  dailySpent?: number; // Amount spent today in cents
  lastSpentReset?: Date; // Date when dailySpent was last reset
  uncappedBudget?: boolean; // If true, campaign has no budget limit
  costPerImpression?: number; // Cost per impression in cents (CPM)
  costPerClick?: number; // Cost per click in cents (CPC)
  currency?: string; // Currency code (USD, GBP, etc.)
  // Dynamic targeting
  targetAudience?: {
    tags?: string[];
    categories?: string[];
    excludeUsers?: string[]; // User IDs to exclude
  };
}

export interface AdClick {
  id: string;
  campaignId: string;
  userId?: string; // Optional - may be anonymous
  clickedAt: Date;
  placement: 'news' | 'discover' | 'learn';
  userAgent?: string;
  ipAddress?: string;
}
