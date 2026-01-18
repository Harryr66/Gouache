'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Calendar, Radio } from 'lucide-react';
import { ScheduleStreamModal } from './schedule-stream-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GoLiveButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function GoLiveButton({ variant = 'default', size = 'default', className }: GoLiveButtonProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showGoLiveNow, setShowGoLiveNow] = useState(false);

  const handleGoLiveNow = () => {
    // For "Go Live Now", we open the schedule modal with immediate start
    // The modal will handle creating and immediately starting the stream
    setShowScheduleModal(true);
    setShowGoLiveNow(true);
  };

  const handleSchedule = () => {
    setShowScheduleModal(true);
    setShowGoLiveNow(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} className={className}>
            <Video className="h-4 w-4 mr-2" />
            Go Live
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleGoLiveNow}>
            <Radio className="h-4 w-4 mr-2 text-red-500" />
            Go Live Now
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSchedule}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule for Later
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ScheduleStreamModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setShowGoLiveNow(false);
        }}
        onSuccess={(streamId) => {
          console.log('Stream created:', streamId);
        }}
      />
    </>
  );
}
