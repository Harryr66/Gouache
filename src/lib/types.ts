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
  // Thumbnail for discover tile
  discoverThumbnail?: string;
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
  status: 'pending' | 'approved' | 'rejected';
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
  status: 'pending' | 'redeemed' | 'revoked' | 'expired';
  createdAt: Date;
  createdBy?: string;
  createdByName?: string;
  lastSentAt?: Date;
  redeemedAt?: Date;
  redeemedBy?: string;
  lastAccessedAt?: Date;
  lastError?: string;
  revokedAt?: Date;
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
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
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
  discussionId?: string;
  tags: string[];
  price?: number;
  currency?: string;
  isForSale?: boolean;
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
  statement?: string;
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
  type: 'Auction' | 'Exhibition' | 'Workshop';
  artist: Artist;
  locationType: 'Online' | 'In-person';
  locationName?: string;
  locationAddress?: string;
  description: string;
  discussionId: string;
  attendees?: string[];
  maxAttendees?: number;
  price?: number;
  currency?: string;
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
  offenderId: string;
  offenderHandle: string;
  reason: string;
  details?: string;
  timestamp: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
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
  tipJarEnabled?: boolean;
  suggestionsEnabled?: boolean;
  hideLocation?: boolean;
  hideFlags?: boolean;
  hideCard?: boolean;
  eventCity?: string;
  eventCountry?: string;
  eventDate?: string;
  accountRole?: 'user' | 'artist' | 'admin';
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
  };
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
