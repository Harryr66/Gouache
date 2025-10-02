"use client";

import { Heart, MessageCircle, Bookmark, MoreHorizontal } from 'lucide-react';
import { type Post } from '@/lib/types';

// This is our component. It's a function that takes an 'artwork' object as input
// and returns the HTML to display it.
export function ArtPost({ post }: { post: Post }) {
  return (
    <div className="bg-card rounded-lg shadow-lg overflow-hidden my-6">
      {/* Post Header */}
      <div className="p-4 flex items-center">
        <img src={post.artist.avatarUrl || 'https://placehold.co/40x40/2D3748/FFFFFF?text=A'} alt={post.artist.name} className="w-10 h-10 rounded-full mr-4" />
        <div>
          <p className="font-bold text-white">{post.artist.name}</p>
          <p className="text-sm text-gray-400">@{post.artist.handle}</p>
        </div>
        <button className="ml-auto text-gray-400 hover:text-white">
          <MoreHorizontal size={24} />
        </button>
      </div>

      {/* Artwork Image */}
      <div className="bg-black">
         <img src={post.imageUrl || 'https://placehold.co/600x400/000000/FFFFFF?text=Artwork'} alt={post.caption || 'Artwork'} className="w-full h-auto max-h-[70vh] object-contain" />
      </div>
     

      {/* Action Buttons */}
      <div className="p-4 flex items-center space-x-4">
        <button className="flex items-center space-x-2 text-gray-400 hover:text-white">
          <Heart size={24} />
        </button>
        <button className="flex items-center space-x-2 text-gray-400 hover:text-white">
          <MessageCircle size={24} />
          <span>{post.commentsCount}</span>
        </button>
        <button className="ml-auto text-gray-400 hover:text-white">
          <Bookmark size={24} />
        </button>
      </div>

      {/* Caption */}
      <div className="px-4 pb-4">
        <p className="text-white">
          <span className="font-bold mr-2">{post.artist.handle}</span>
          {post.caption}
        </p>
      </div>
    </div>
  );
}
