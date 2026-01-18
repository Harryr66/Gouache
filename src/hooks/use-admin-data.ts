import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArtistRequest, GalleryRequest, Episode, AdvertisingApplication, MarketplaceProduct, AffiliateProductRequest, Advertisement, AdvertisementAnalytics, Course, CourseSubmission, NewsArticle, UserReport } from '@/lib/types';
import { DEFAULT_ARTICLE_IMAGE } from '@/lib/admin-constants';

export function useAdminData() {
  const [artistRequests, setArtistRequests] = useState<ArtistRequest[]>([]);
  const [galleryRequests, setGalleryRequests] = useState<GalleryRequest[]>([]);
  const [advertisingApplications, setAdvertisingApplications] = useState<AdvertisingApplication[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [marketplaceProducts, setMarketplaceProducts] = useState<MarketplaceProduct[]>([]);
  const [affiliateRequests, setAffiliateRequests] = useState<AffiliateProductRequest[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [advertisementAnalytics, setAdvertisementAnalytics] = useState<AdvertisementAnalytics[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseSubmissions, setCourseSubmissions] = useState<CourseSubmission[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [professionalArtists, setProfessionalArtists] = useState<Array<{ id: string; name: string; email: string; username?: string; avatarUrl?: string; isVerified: boolean; isProfessional: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 Admin Panel: Fetching all data...');
        
        // Fetch professional artists
        setLoadingArtists(true);
        try {
          const artistsQuery = query(
            collection(db, 'userProfiles'),
            where('isProfessional', '==', true)
          );
          const artistsSnapshot = await getDocs(artistsQuery);
          const artistsData = artistsSnapshot.docs
            .filter((docSnapshot: any) => {
              const data = docSnapshot.data();
              // CRITICAL: Filter out deleted accounts - they should not appear anywhere
              if (data.deleted === true) {
                console.log(`⚠️ Filtered out deleted account: ${data.email || docSnapshot.id}`);
                return false;
              }
              // Also filter out inactive accounts if the field exists and is false
              if (data.isActive === false) {
                console.log(`⚠️ Filtered out inactive account: ${data.email || docSnapshot.id}`);
                return false;
              }
              return true;
            })
            .map((docSnapshot: any) => {
              const data = docSnapshot.data();
            return {
                id: docSnapshot.id,
              name: data.name || data.displayName || data.username || 'Unknown',
              email: data.email || '',
              username: data.username || data.handle,
              avatarUrl: data.avatarUrl,
              isVerified: data.isVerified !== false,
              isProfessional: data.isProfessional || false
            };
          });
          setProfessionalArtists(artistsData);
          console.log(`✅ Loaded ${artistsData.length} professional artists (deleted accounts filtered out)`);
        } catch (error) {
          console.error('Error loading professional artists:', error);
        } finally {
          setLoadingArtists(false);
        }
        
        const [
          artistSnapshot,
          gallerySnapshot,
          advertisingSnapshot,
          episodesSnapshot,
          marketplaceSnapshot,
          affiliateSnapshot,
          advertisementsSnapshot,
          analyticsSnapshot,
          coursesSnapshot,
          courseSubmissionsSnapshot,
          newsArticlesSnapshot,
          userReportsSnapshot
        ] = await Promise.all([
          getDocs(query(collection(db, 'artistRequests'), orderBy('submittedAt', 'desc'))),
          getDocs(query(collection(db, 'galleryRequests'), orderBy('submittedAt', 'desc'))),
          getDocs(query(collection(db, 'advertisingApplications'), orderBy('submittedAt', 'desc'))),
          getDocs(query(collection(db, 'episodes'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'marketplaceProducts'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'affiliateRequests'), orderBy('submittedAt', 'desc'))),
          getDocs(query(collection(db, 'advertisements'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'advertisementAnalytics'), orderBy('date', 'desc'))),
          getDocs(query(collection(db, 'courses'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'courseSubmissions'), orderBy('submittedAt', 'desc'))),
          getDocs(query(collection(db, 'newsArticles'), orderBy('updatedAt', 'desc'))),
          getDocs(query(collection(db, 'userReports'), orderBy('submittedAt', 'desc')))
        ]);

        setArtistRequests(artistSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as ArtistRequest[]);
        setGalleryRequests(gallerySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as GalleryRequest[]);
        setAdvertisingApplications(advertisingSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as AdvertisingApplication[]);
        setEpisodes(episodesSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Episode[]);
        setMarketplaceProducts(marketplaceSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as MarketplaceProduct[]);
        setAffiliateRequests(affiliateSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as AffiliateProductRequest[]);
        setAdvertisements(advertisementsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Advertisement[]);
        setAdvertisementAnalytics(analyticsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as AdvertisementAnalytics[]);
        
        setCourses(coursesSnapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            publishedAt: data.publishedAt?.toDate(),
            instructor: {
              ...data.instructor,
              createdAt: data.instructor?.createdAt?.toDate() || new Date(),
              updatedAt: data.instructor?.updatedAt?.toDate() || new Date(),
            },
          } as Course;
        }));
        
        setCourseSubmissions(courseSubmissionsSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt?.toDate() || new Date(),
          reviewedAt: doc.data().reviewedAt?.toDate(),
        })) as CourseSubmission[]);
        
        setNewsArticles(newsArticlesSnapshot.docs.map((doc: any) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            title: data.title ?? 'Untitled story',
            summary: data.summary ?? '',
            category: data.category ?? 'Stories',
            author: data.author ?? '',
            imageUrl: data.imageUrl ?? DEFAULT_ARTICLE_IMAGE,
            publishedAt: data.publishedAt?.toDate?.(),
            updatedAt: data.updatedAt?.toDate?.(),
            tags: data.tags ?? [],
            externalUrl: data.externalUrl ?? '',
            featured: data.featured ?? false,
            content: data.content ?? '',
            sections: data.sections ?? undefined,
            location: data.location ?? 'evergreen',
            status: data.status ?? (data.publishedAt ? 'published' : 'draft'),
            artistResearchData: data.artistResearchData ?? undefined,
            archived: data.archived ?? false,
            archivedAt: data.archivedAt?.toDate?.()
          } as NewsArticle;
        }));
        
        setUserReports(userReportsSnapshot.docs.map((doc: any) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            userId: data.userId ?? '',
            userEmail: data.userEmail ?? '',
            username: data.username ?? '',
            displayName: data.displayName ?? '',
            message: data.message ?? '',
            status: data.status ?? 'pending',
            submittedAt: data.submittedAt?.toDate?.() ?? new Date(),
            reviewedBy: data.reviewedBy,
            reviewedAt: data.reviewedAt?.toDate?.(),
            adminNotes: data.adminNotes ?? ''
          } as UserReport;
        }));

        setLoading(false);
        console.log('✅ Admin Panel: All data loaded successfully');
      } catch (error) {
        console.error('❌ Error fetching admin panel data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    artistRequests,
    galleryRequests,
    advertisingApplications,
    episodes,
    marketplaceProducts,
    affiliateRequests,
    advertisements,
    advertisementAnalytics,
    courses,
    courseSubmissions,
    newsArticles,
    userReports,
    professionalArtists,
    loading,
    loadingArtists,
    setArtistRequests,
    setGalleryRequests,
    setAdvertisingApplications,
    setEpisodes,
    setMarketplaceProducts,
    setAffiliateRequests,
    setAdvertisements,
    setAdvertisementAnalytics,
    setCourses,
    setCourseSubmissions,
    setNewsArticles,
    setUserReports,
    setProfessionalArtists
  };
}

