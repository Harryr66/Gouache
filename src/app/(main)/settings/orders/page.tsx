'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Clock, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RefundRequestDialog } from '@/components/refund-request-dialog';

interface Order {
  id: string;
  productId?: string;
  courseId?: string;
  artworkId?: string;
  itemTitle?: string;
  price: number;
  currency: string;
  status: string;
  createdAt: any;
  shippingAddress?: any;
  type: 'product' | 'course' | 'artwork';
  sellerId: string;
}

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchOrders();
  }, [user, router]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const allOrders: Order[] = [];

      console.log('🔍 FETCHING ORDERS FOR USER:', {
        userId: user.id,
        userEmail: user.email,
        userName: user.displayName || user.username,
      });

      // Fetch marketplace purchases
      const purchasesQuery = query(
        collection(db, 'purchases'),
        where('buyerId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
      const purchasesSnap = await getDocs(purchasesQuery);
      console.log('📦 PURCHASES FOUND:', purchasesSnap.size);
      purchasesSnap.forEach(doc => {
        const data = doc.data();
        console.log('📦 Purchase:', { id: doc.id, data });
        allOrders.push({
          id: doc.id,
          productId: data.productId,
          itemTitle: data.itemTitle || 'Product',
          price: data.price || 0,
          currency: data.currency || 'USD',
          status: data.status || 'completed',
          createdAt: data.createdAt,
          shippingAddress: data.shippingAddress,
          type: 'product',
          sellerId: data.sellerId,
        });
      });

      // Fetch course enrollments
      const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
      const enrollmentsSnap = await getDocs(enrollmentsQuery);
      console.log('📚 ENROLLMENTS FOUND:', enrollmentsSnap.size);
      enrollmentsSnap.forEach(doc => {
        const data = doc.data();
        console.log('📚 Enrollment:', { id: doc.id, data });
        allOrders.push({
          id: doc.id,
          courseId: data.courseId,
          itemTitle: data.courseTitle || 'Course',
          price: 0, // Would need to fetch from course doc
          currency: 'USD',
          status: data.status || 'active',
          createdAt: data.createdAt,
          type: 'course',
          sellerId: data.instructorId,
        });
      });

      // Fetch artwork purchases - artworks marked as sold to this user
      const artworkQuery = query(
        collection(db, 'artworks'),
        where('sold', '==', true),
        where('soldTo', '==', user.id)
      );
      const artworkSnap = await getDocs(artworkQuery);
      artworkSnap.forEach(doc => {
        const data = doc.data();
        allOrders.push({
          id: doc.id,
          artworkId: doc.id,
          itemTitle: data.title || 'Artwork',
          price: data.price || 0,
          currency: data.currency || 'USD',
          status: 'completed',
          createdAt: data.soldAt || data.createdAt,
          shippingAddress: data.shippingAddress,
          type: 'artwork',
          sellerId: data.artist?.userId || data.artistId,
        });
      });

      // Sort all orders by date
      allOrders.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });

      setOrders(allOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number, currency: string) => {
    // Price is stored in cents for products
    const amount = price / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status.toLowerCase() === 'completed' || status.toLowerCase() === 'active'
      ? 'default'
      : status.toLowerCase() === 'pending'
      ? 'secondary'
      : 'outline';

    return (
      <Badge variant={variant as any} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/settings')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>
          <h1 className="text-3xl font-bold mb-2">Order History</h1>
          <p className="text-muted-foreground">
            View your past purchases and enrollments
          </p>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground mb-6">
                Your purchase history will appear here
              </p>
              <Button onClick={() => router.push('/marketplace')}>
                Start Shopping
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Card key={order.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getStatusIcon(order.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold">{order.itemTitle}</h3>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {formatDate(order.createdAt)}
                      </p>
                      {order.price > 0 && (
                        <p className="text-sm font-medium">
                          {formatPrice(order.price, order.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                  >
                    Request Refund
                  </Button>
                </div>

                {order.shippingAddress && (
                  <>
                    <Separator className="my-4" />
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-2">Shipping to:</p>
                      <p className="font-medium">{order.shippingAddress.name}</p>
                      <p className="text-muted-foreground">
                        {order.shippingAddress.line1}
                        {order.shippingAddress.line2 && `, ${order.shippingAddress.line2}`}
                      </p>
                      <p className="text-muted-foreground">
                        {order.shippingAddress.city}
                        {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
                        {order.shippingAddress.postalCode && ` ${order.shippingAddress.postalCode}`}
                      </p>
                      <p className="text-muted-foreground">
                        {order.shippingAddress.country}
                      </p>
                    </div>
                  </>
                )}

                {order.type === 'course' && (
                  <>
                    <Separator className="my-4" />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => router.push(`/learn/${order.courseId}/player`)}
                    >
                      Continue Learning
                    </Button>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Refund Request Dialog */}
      {selectedOrder && (
        <RefundRequestDialog
          order={selectedOrder}
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSuccess={() => {
            setSelectedOrder(null);
            // Optionally show success toast
          }}
        />
      )}
    </div>
  );
}

