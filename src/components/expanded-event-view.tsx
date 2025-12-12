'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { Event, Discussion } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useContent } from '@/providers/content-provider';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { AboutTheArtist } from '@/components/about-the-artist';

interface ExpandedEventViewProps {
    event: Event;
    discussion?: Discussion;
    onClose: () => void;
}

export function ExpandedEventView({ event, discussion, onClose }: ExpandedEventViewProps) {
    const { user } = useAuth();
    const { updateDiscussion } = useContent();

    const isCreator = useMemo(() => {
        if (!user || !discussion) return false;
        return user.id === discussion.author.id;
    }, [user, discussion]);

    const renderDiscussion = () => {
        if (!discussion) return null;

        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Discussion</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={discussion.author.avatarUrl ?? undefined} alt={discussion.author.name} />
                                <AvatarFallback>{discussion.author.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                    <span className="font-medium text-sm">{discussion.author.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {discussion.timestamp}
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed">{discussion.content}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-4 border-b flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Event Details</h2>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            ×
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Event Image */}
                        <div className="relative h-64 rounded-lg overflow-hidden">
                            <Image
                                src={event.imageUrl}
                                alt={event.imageAiHint}
                                fill
                                className="object-cover"
                            />
                        </div>

                        {/* Event Info */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">{event.title}</h3>
                                <div className="flex items-center space-x-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={event.artist.avatarUrl ?? undefined} alt={event.artist.name} />
                                        <AvatarFallback>{event.artist.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-sm">{event.artist.name}</p>
                                        <p className="text-xs text-muted-foreground">@{event.artist.handle}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Event Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{event.date}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{event.type}</span>
                                </div>
                                {event.locationName && (
                                    <div className="flex items-center space-x-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{event.locationName}</span>
                                    </div>
                                )}
                                <div className="flex items-center space-x-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                        {event.attendees?.length || 0} attending
                                    </span>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <h4 className="font-medium mb-2">Description</h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {event.description}
                                </p>
                            </div>

                            {/* Price */}
                            {event.price && (
                                <div className="p-4 bg-muted rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Price</p>
                                            <p className="text-2xl font-bold">${event.price.toLocaleString()}</p>
                                        </div>
                                        <Button>Get Tickets</Button>
                                    </div>
                                </div>
                            )}

                            {/* About the Artist */}
                            {event.artist.id && (
                                <AboutTheArtist
                                    artistId={event.artist.id}
                                    artistName={event.artist.name}
                                    artistHandle={event.artist.handle}
                                />
                            )}

                            {/* Discussion */}
                            {renderDiscussion()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
