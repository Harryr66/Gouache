import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  onSnapshot, 
  writeBatch,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  User, 
  Follow, 
  Conversation, 
  Message, 
  Community, 
  CommunityPost, 
  Auction, 
  Bid, 
  Product, 
  Order, 
  CartItem, 
  Notification,
  Report,
  AnalyticsEvent
} from './types';

// User Management
export class UserService {
  static async createUser(userData: Partial<User>): Promise<string> {
    const userRef = await addDoc(collection(db, 'users'), {
      ...userData,
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      isVerified: false,
      isProfessional: false,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return userRef.id;
  }

  static async getUser(userId: string): Promise<User | null> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as User : null;
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    await updateDoc(doc(db, 'users', userId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  static async searchUsers(searchTerm: string, limitCount: number = 20): Promise<User[]> {
    const usersQuery = query(
      collection(db, 'users'),
      where('username', '>=', searchTerm),
      where('username', '<=', searchTerm + '\uf8ff'),
      limit(limitCount)
    );
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }
}

// Following System
export class FollowService {
  static async followUser(followerId: string, followingId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Add to following collection
    batch.set(doc(db, 'users', followerId, 'following', followingId), {
      createdAt: serverTimestamp()
    });
    
    // Add to followers collection
    batch.set(doc(db, 'users', followingId, 'followers', followerId), {
      createdAt: serverTimestamp()
    });
    
    // Update follower counts
    batch.update(doc(db, 'users', followerId), {
      followingCount: increment(1)
    });
    
    batch.update(doc(db, 'users', followingId), {
      followerCount: increment(1)
    });
    
    await batch.commit();
  }

  static async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Remove from following collection
    batch.delete(doc(db, 'users', followerId, 'following', followingId));
    
    // Remove from followers collection
    batch.delete(doc(db, 'users', followingId, 'followers', followerId));
    
    // Update follower counts
    batch.update(doc(db, 'users', followerId), {
      followingCount: increment(-1)
    });
    
    batch.update(doc(db, 'users', followingId), {
      followerCount: increment(-1)
    });
    
    await batch.commit();
  }

  static async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const followDoc = await getDoc(doc(db, 'users', followerId, 'following', followingId));
    return followDoc.exists();
  }

  static async getFollowers(userId: string): Promise<User[]> {
    const followersSnapshot = await getDocs(collection(db, 'users', userId, 'followers'));
    const followerIds = followersSnapshot.docs.map(doc => doc.id);
    
    const followers: User[] = [];
    for (const followerId of followerIds) {
      const user = await UserService.getUser(followerId);
      if (user) followers.push(user);
    }
    
    return followers;
  }

  static async getFollowing(userId: string): Promise<User[]> {
    const followingSnapshot = await getDocs(collection(db, 'users', userId, 'following'));
    const followingIds = followingSnapshot.docs.map(doc => doc.id);
    
    const following: User[] = [];
    for (const followingId of followingIds) {
      const user = await UserService.getUser(followingId);
      if (user) following.push(user);
    }
    
    return following;
  }
}

// Messaging System
export class MessagingService {
  static async createConversation(participantIds: string[]): Promise<string> {
    const conversationRef = await addDoc(collection(db, 'conversations'), {
      participants: participantIds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
      unreadCount: {}
    });
    return conversationRef.id;
  }

  static async sendMessage(
    conversationId: string, 
    senderId: string, 
    recipientId: string, 
    text: string,
    type: 'text' | 'image' | 'video' | 'file' = 'text',
    mediaUrl?: string
  ): Promise<string> {
    const messageRef = await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      senderId,
      recipientId,
      text,
      timestamp: serverTimestamp(),
      isRead: false,
      type,
      mediaUrl
    });

    // Update conversation last message
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: {
        text,
        senderId,
        timestamp: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });

    return messageRef.id;
  }

  static async getConversations(userId: string): Promise<Conversation[]> {
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(conversationsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
  }

  static async getMessages(conversationId: string): Promise<Message[]> {
    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    
    const snapshot = await getDocs(messagesQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
  }

  static async markAsRead(conversationId: string, userId: string): Promise<void> {
    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      where('recipientId', '==', userId),
      where('isRead', '==', false)
    );
    
    const snapshot = await getDocs(messagesQuery);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });
    
    await batch.commit();
  }
}

// Community System
export class CommunityService {
  static async createCommunity(communityData: Partial<Community>): Promise<string> {
    const communityRef = await addDoc(collection(db, 'communities'), {
      ...communityData,
      memberCount: 0,
      postCount: 0,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return communityRef.id;
  }

  static async joinCommunity(communityId: string, userId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Add user to community members
    batch.set(doc(db, 'communities', communityId, 'members', userId), {
      joinedAt: serverTimestamp(),
      role: 'member'
    });
    
    // Update member count
    batch.update(doc(db, 'communities', communityId), {
      memberCount: increment(1)
    });
    
    await batch.commit();
  }

  static async leaveCommunity(communityId: string, userId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Remove user from community members
    batch.delete(doc(db, 'communities', communityId, 'members', userId));
    
    // Update member count
    batch.update(doc(db, 'communities', communityId), {
      memberCount: increment(-1)
    });
    
    await batch.commit();
  }

  static async createCommunityPost(postData: Partial<CommunityPost>): Promise<string> {
    const postRef = await addDoc(collection(db, 'communities', postData.communityId!, 'posts'), {
      ...postData,
      likes: 0,
      commentsCount: 0,
      isPinned: false,
      isLocked: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update community post count
    await updateDoc(doc(db, 'communities', postData.communityId!), {
      postCount: increment(1)
    });

    return postRef.id;
  }

  static async getCommunities(limitCount: number = 20): Promise<Community[]> {
    const communitiesQuery = query(
      collection(db, 'communities'),
      where('isActive', '==', true),
      orderBy('memberCount', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(communitiesQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Community));
  }
}

// Auction System
export class AuctionService {
  static async createAuction(auctionData: Partial<Auction>): Promise<string> {
    const auctionRef = await addDoc(collection(db, 'auctions'), {
      ...auctionData,
      bidCount: 0,
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return auctionRef.id;
  }

  static async placeBid(auctionId: string, bidderId: string, amount: number): Promise<string> {
    const batch = writeBatch(db);
    
    // Create bid
    const bidRef = doc(collection(db, 'auctions', auctionId, 'bids'));
    batch.set(bidRef, {
      bidderId,
      amount,
      timestamp: serverTimestamp(),
      isWinning: false,
      isAutoBid: false
    });
    
    // Update auction
    batch.update(doc(db, 'auctions', auctionId), {
      currentPrice: amount,
      bidCount: increment(1),
      updatedAt: serverTimestamp()
    });
    
    // Add participant if not already
    batch.set(doc(db, 'auctions', auctionId, 'participants', bidderId), {
      joinedAt: serverTimestamp()
    });
    
    await batch.commit();
    return bidRef.id;
  }

  static async getActiveAuctions(limitCount: number = 20): Promise<Auction[]> {
    const auctionsQuery = query(
      collection(db, 'auctions'),
      where('status', '==', 'active'),
      orderBy('endDate', 'asc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(auctionsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Auction));
  }

  static async getAuctionBids(auctionId: string): Promise<Bid[]> {
    const bidsQuery = query(
      collection(db, 'auctions', auctionId, 'bids'),
      orderBy('amount', 'desc')
    );
    
    const snapshot = await getDocs(bidsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bid));
  }
}

// Product/Shop System
export class ProductService {
  static async createProduct(productData: Partial<Product>): Promise<string> {
    const productRef = await addDoc(collection(db, 'products'), {
      ...productData,
      salesCount: 0,
      rating: 0,
      reviewCount: 0,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return productRef.id;
  }

  static async addToCart(userId: string, productId: string, quantity: number = 1): Promise<void> {
    await setDoc(doc(db, 'users', userId, 'cart', productId), {
      productId,
      quantity,
      addedAt: serverTimestamp()
    });
  }

  static async removeFromCart(userId: string, productId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', userId, 'cart', productId));
  }

  static async getCart(userId: string): Promise<CartItem[]> {
    const cartSnapshot = await getDocs(collection(db, 'users', userId, 'cart'));
    return cartSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CartItem));
  }

  static async createOrder(orderData: Partial<Order>): Promise<string> {
    const orderRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return orderRef.id;
  }

  static async getProducts(category?: string, limitCount: number = 20): Promise<Product[]> {
    let productsQuery = query(
      collection(db, 'products'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    if (category) {
      productsQuery = query(
        collection(db, 'products'),
        where('isActive', '==', true),
        where('category', '==', category),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }
    
    const snapshot = await getDocs(productsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  }
}

// Notification System
export class NotificationService {
  static async createNotification(notificationData: Partial<Notification>): Promise<string> {
    const notificationRef = await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      isRead: false,
      createdAt: serverTimestamp()
    });
    return notificationRef.id;
  }

  static async getUserNotifications(userId: string, limitCount: number = 50): Promise<Notification[]> {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(notificationsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
  }

  static async markAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true
    });
  }

  static async markAllAsRead(userId: string): Promise<void> {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    
    const snapshot = await getDocs(notificationsQuery);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });
    
    await batch.commit();
  }
}

// Analytics System
export class AnalyticsService {
  static async trackEvent(event: string, properties: { [key: string]: any }, userId?: string): Promise<void> {
    await addDoc(collection(db, 'analytics'), {
      userId,
      event,
      properties,
      timestamp: serverTimestamp(),
      sessionId: this.getSessionId()
    });
  }

  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }
}

// Portfolio Items Service - New collection-based architecture
export interface PortfolioItem {
  id: string;
  userId: string;
  imageUrl: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  supportingImages?: string[];
  mediaUrls?: string[];
  mediaTypes?: string[];
  title: string;
  description?: string;
  medium?: string;
  dimensions?: string;
  year?: string;
  tags?: string[];
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  showInPortfolio?: boolean;
  showInShop?: boolean;
  isForSale?: boolean;
  sold?: boolean;
  price?: number; // in cents
  currency?: string;
  priceType?: 'fixed' | 'contact';
  contactForPrice?: boolean;
  deliveryScope?: string;
  deliveryCountries?: string[];
  artworkType?: 'original' | 'print' | 'merchandise';
  type?: string;
  deleted?: boolean;
  aiAssistance?: 'none' | 'assisted' | 'generated';
  isAI?: boolean;
  likes?: number;
  commentsCount?: number;
  category?: string;
  [key: string]: any; // Allow additional fields
}

export class PortfolioService {
  /**
   * Create a new portfolio item
   */
  static async createPortfolioItem(item: Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const itemRef = await addDoc(collection(db, 'portfolioItems'), {
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deleted: false,
      showInPortfolio: item.showInPortfolio !== false, // Default to true
    });
    return itemRef.id;
  }

  /**
   * Get a single portfolio item by ID
   */
  static async getPortfolioItem(itemId: string): Promise<PortfolioItem | null> {
    const itemDoc = await getDoc(doc(db, 'portfolioItems', itemId));
    if (!itemDoc.exists()) return null;
    
    const data = itemDoc.data();
    return {
      id: itemDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || (data.createdAt instanceof Date ? data.createdAt : new Date()),
      updatedAt: data.updatedAt?.toDate?.() || (data.updatedAt instanceof Date ? data.updatedAt : new Date()),
    } as PortfolioItem;
  }

  /**
   * Get all portfolio items for a user
   */
  static async getUserPortfolioItems(
    userId: string,
    options?: {
      showInPortfolio?: boolean;
      showInShop?: boolean;
      isForSale?: boolean;
      deleted?: boolean;
      limit?: number;
      orderBy?: 'createdAt' | 'updatedAt';
      orderDirection?: 'asc' | 'desc';
    }
  ): Promise<PortfolioItem[]> {
    try {
      // Check if collection exists and has any documents first (quick check)
      // This helps avoid query errors on empty collections
      let q = query(
        collection(db, 'portfolioItems'),
        where('userId', '==', userId),
        limit(1) // Quick check - just see if any documents exist
      );
      
      const quickCheck = await getDocs(q);
      
      // If no documents found, return empty array (will trigger fallback)
      if (quickCheck.empty) {
        console.log('📋 PortfolioService: No portfolioItems found for user, returning empty array (will trigger fallback)');
        return [];
      }

      // Build full query
      q = query(
        collection(db, 'portfolioItems'),
        where('userId', '==', userId)
      );

      if (options?.showInPortfolio !== undefined) {
        q = query(q, where('showInPortfolio', '==', options.showInPortfolio));
      }
      if (options?.showInShop !== undefined) {
        q = query(q, where('showInShop', '==', options.showInShop));
      }
      if (options?.isForSale !== undefined) {
        q = query(q, where('isForSale', '==', options.isForSale));
      }
      if (options?.deleted !== undefined) {
        q = query(q, where('deleted', '==', options.deleted));
      }

      const orderField = options?.orderBy || 'createdAt';
      const orderDir = options?.orderDirection || 'desc';
      q = query(q, orderBy(orderField, orderDir));

      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || (data.createdAt instanceof Date ? data.createdAt : new Date()),
          updatedAt: data.updatedAt?.toDate?.() || (data.updatedAt instanceof Date ? data.updatedAt : new Date()),
        } as PortfolioItem;
      });
    } catch (error: any) {
      // If query fails (e.g., missing index), return empty array
      // This allows backward compatibility to kick in
      console.warn('⚠️ PortfolioService: Error querying portfolioItems, returning empty array:', error?.message || error);
      return [];
    }
  }

  /**
   * Get portfolio items for discover feed (all users, filtered)
   */
  static async getDiscoverPortfolioItems(options?: {
    showInPortfolio?: boolean;
    deleted?: boolean;
    hideAI?: boolean;
    limit?: number;
    startAfter?: any;
  }): Promise<PortfolioItem[]> {
    try {
      // Quick check: see if collection has any documents
      const quickCheck = await getDocs(query(collection(db, 'portfolioItems'), limit(1)));
      if (quickCheck.empty) {
        console.log('📋 PortfolioService: portfolioItems collection is empty, returning empty array (will trigger fallback)');
        return [];
      }

      let q = query(collection(db, 'portfolioItems'));

      if (options?.showInPortfolio !== undefined) {
        q = query(q, where('showInPortfolio', '==', options.showInPortfolio));
      }
      if (options?.deleted !== undefined) {
        q = query(q, where('deleted', '==', options.deleted));
      }

      q = query(q, orderBy('createdAt', 'desc'));

      if (options?.startAfter) {
        q = query(q, startAfter(options.startAfter));
      }
      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      const snapshot = await getDocs(q);
      let items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || (data.createdAt instanceof Date ? data.createdAt : new Date()),
          updatedAt: data.updatedAt?.toDate?.() || (data.updatedAt instanceof Date ? data.updatedAt : new Date()),
        } as PortfolioItem;
      });

      // Client-side filter for AI content if needed (can't query on nested fields efficiently)
      if (options?.hideAI) {
        items = items.filter(item => 
          item.aiAssistance !== 'assisted' && 
          item.aiAssistance !== 'generated' && 
          !item.isAI
        );
      }

      return items;
    } catch (error: any) {
      // If query fails (e.g., missing index), return empty array
      // This allows backward compatibility to kick in
      console.warn('⚠️ PortfolioService: Error querying discover portfolioItems, returning empty array:', error?.message || error);
      return [];
    }
  }

  /**
   * Update a portfolio item
   */
  static async updatePortfolioItem(itemId: string, updates: Partial<PortfolioItem>): Promise<void> {
    const { id, userId, createdAt, ...updateData } = updates;
    await updateDoc(doc(db, 'portfolioItems', itemId), {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete a portfolio item (soft delete)
   */
  static async deletePortfolioItem(itemId: string): Promise<void> {
    await updateDoc(doc(db, 'portfolioItems', itemId), {
      deleted: true,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Hard delete a portfolio item
   */
  static async hardDeletePortfolioItem(itemId: string): Promise<void> {
    await deleteDoc(doc(db, 'portfolioItems', itemId));
  }

  /**
   * Batch create portfolio items (for migration)
   */
  static async batchCreatePortfolioItems(items: Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const batch = writeBatch(db);
    const timestamp = serverTimestamp();

    items.forEach(item => {
      const itemRef = doc(collection(db, 'portfolioItems'));
      batch.set(itemRef, {
        ...item,
        createdAt: timestamp,
        updatedAt: timestamp,
        deleted: false,
        showInPortfolio: item.showInPortfolio !== false,
      });
    });

    await batch.commit();
  }

  /**
   * Get shop items for a user
   */
  static async getUserShopItems(userId: string, limitCount: number = 100): Promise<PortfolioItem[]> {
    return this.getUserPortfolioItems(userId, {
      isForSale: true,
      showInShop: true,
      deleted: false,
      limit: limitCount,
      orderBy: 'createdAt',
      orderDirection: 'desc',
    });
  }

  /**
   * Subscribe to portfolio items changes (real-time)
   */
  static subscribeToUserPortfolio(
    userId: string,
    callback: (items: PortfolioItem[]) => void,
    options?: {
      showInPortfolio?: boolean;
      deleted?: boolean;
    }
  ): () => void {
    try {
      let q = query(
        collection(db, 'portfolioItems'),
        where('userId', '==', userId)
      );

      if (options?.showInPortfolio !== undefined) {
        q = query(q, where('showInPortfolio', '==', options.showInPortfolio));
      }
      if (options?.deleted !== undefined) {
        q = query(q, where('deleted', '==', options.deleted));
      }

      q = query(q, orderBy('createdAt', 'desc'));

      return onSnapshot(q, 
        (snapshot) => {
          const items = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || (data.createdAt instanceof Date ? data.createdAt : new Date()),
              updatedAt: data.updatedAt?.toDate?.() || (data.updatedAt instanceof Date ? data.updatedAt : new Date()),
            } as PortfolioItem;
          });
          callback(items);
        },
        (error) => {
          // If snapshot fails, return empty array
          console.warn('⚠️ PortfolioService: Error in portfolio snapshot, returning empty array:', error?.message || error);
          callback([]);
        }
      );
    } catch (error: any) {
      // If query setup fails, return a no-op unsubscribe function
      console.warn('⚠️ PortfolioService: Error setting up portfolio subscription, returning empty array:', error?.message || error);
      callback([]);
      return () => {}; // Return no-op unsubscribe function
    }
  }
}

// Search System
export class SearchService {
  static async searchUsers(searchTerm: string): Promise<User[]> {
    return UserService.searchUsers(searchTerm);
  }

  static async searchProducts(searchTerm: string, category?: string): Promise<Product[]> {
    let productsQuery = query(
      collection(db, 'products'),
      where('isActive', '==', true),
      where('title', '>=', searchTerm),
      where('title', '<=', searchTerm + '\uf8ff')
    );
    
    if (category) {
      productsQuery = query(
        collection(db, 'products'),
        where('isActive', '==', true),
        where('category', '==', category),
        where('title', '>=', searchTerm),
        where('title', '<=', searchTerm + '\uf8ff')
      );
    }
    
    const snapshot = await getDocs(productsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  }

  static async searchCommunities(searchTerm: string): Promise<Community[]> {
    const communitiesQuery = query(
      collection(db, 'communities'),
      where('isActive', '==', true),
      where('name', '>=', searchTerm),
      where('name', '<=', searchTerm + '\uf8ff')
    );
    
    const snapshot = await getDocs(communitiesQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Community));
  }
}
