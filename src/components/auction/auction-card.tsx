'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Auction, Bid } from '@/lib/types';
import { AuctionService } from '@/lib/database';
import { Clock, Gavel, Users, TrendingUp } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import Image from 'next/image';

interface AuctionCardProps {
  auction: Auction;
  onBid: (auctionId: string, amount: number) => void;
  currentUserId?: string;
}

export function AuctionCard({ auction, onBid, currentUserId }: AuctionCardProps) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState(auction.currentPrice + 1);

  useEffect(() => {
    loadBids();
  }, [auction.id]);

  const loadBids = async () => {
    try {
      const auctionBids = await AuctionService.getAuctionBids(auction.id);
      setBids(auctionBids);
    } catch (error) {
      console.error('Error loading bids:', error);
    }
  };

  const handleBid = async () => {
    if (bidAmount <= auction.currentPrice) return;
    
    setLoading(true);
    try {
      await onBid(auction.id, bidAmount);
      setBidAmount(auction.currentPrice + 1);
      await loadBids();
    } catch (error) {
      console.error('Error placing bid:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeRemaining = new Date(auction.endDate).getTime() - Date.now();
  const isActive = auction.status === 'active' && timeRemaining > 0;
  const isEnded = auction.status === 'ended' || timeRemaining <= 0;
  const isWinning = bids.some(bid => bid.bidderId === currentUserId && bid.isWinning);

  const progressPercentage = Math.min(
    ((Date.now() - new Date(auction.startDate).getTime()) / 
     (new Date(auction.endDate).getTime() - new Date(auction.startDate).getTime())) * 100,
    100
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="relative">
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          <Image
            src={auction.imageUrl}
            alt={auction.title}
            fill
            className="object-cover"
          />
          <div className="absolute top-4 left-4">
            <Badge variant={isActive ? 'default' : isEnded ? 'secondary' : 'outline'}>
              {isActive ? 'Live' : isEnded ? 'Ended' : 'Upcoming'}
            </Badge>
          </div>
          {isActive && (
            <div className="absolute top-4 right-4">
              <Badge variant="destructive" className="animate-pulse">
                <Clock className="h-3 w-3 mr-1" />
                {formatDistanceToNow(auction.endDate, { addSuffix: true })}
              </Badge>
            </div>
          )}
        </div>
        
        {isActive && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <Progress value={progressPercentage} className="h-1 mb-2" />
            <p className="text-white text-sm">
              {formatDistanceToNow(auction.endDate, { addSuffix: true })}
            </p>
          </div>
        )}
      </div>

      <CardHeader>
        <CardTitle className="line-clamp-1">{auction.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {auction.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Price */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">${auction.currentPrice.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">
              {auction.bidCount} bid{auction.bidCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Starting Price</p>
            <p className="font-medium">${auction.startingPrice.toLocaleString()}</p>
          </div>
        </div>

        {/* Reserve Price */}
        {auction.reservePrice && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reserve Price</span>
            <span className="font-medium">${auction.reservePrice.toLocaleString()}</span>
          </div>
        )}

        {/* Listed Price */}
        {auction.buyNowPrice && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Listed Price</span>
            <span className="font-medium text-green-600">${auction.buyNowPrice.toLocaleString()}</span>
          </div>
        )}

        {/* Bidding Section */}
        {isActive && currentUserId && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                min={auction.currentPrice + 1}
                className="flex-1 px-3 py-2 border rounded-md"
                placeholder="Enter bid amount"
              />
              <Button 
                onClick={handleBid}
                disabled={loading || bidAmount <= auction.currentPrice}
                className="min-w-[80px]"
              >
                {loading ? 'Bidding...' : 'Bid'}
              </Button>
            </div>
            
            {isWinning && (
              <div className="flex items-center space-x-2 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">You are currently winning!</span>
              </div>
            )}
          </div>
        )}

        {/* Auction Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Gavel className="h-4 w-4" />
            <span>Ends {format(auction.endDate, 'MMM d, h:mm a')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>{bids.length} bidders</span>
          </div>
        </div>

        {/* Recent Bids */}
        {bids.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Bids</h4>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {bids.slice(0, 3).map((bid) => (
                <div key={bid.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">Bidder {bid.bidderId.slice(0, 8)}...</span>
                  <span className="font-medium">${bid.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
