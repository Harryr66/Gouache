import Image from 'next/image';
import { type Event } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Calendar, MapPin, Tag } from 'lucide-react';

interface EventCardProps {
  event: Event;
  onClick?: () => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  return (
    <Card className="overflow-hidden group flex flex-col h-full cursor-pointer" onClick={onClick}>
        <CardContent className="p-0 relative">
            <div className="aspect-[4/3] w-full overflow-hidden">
                <Image
                    src={event.imageUrl}
                    alt={event.title}
                    width={600}
                    height={450}
                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint={event.imageAiHint}
                />
            </div>
            <div className="absolute top-2 left-2 bg-background/70 backdrop-blur-sm text-foreground px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4 text-foreground" />
                <span>{event.type}</span>
            </div>
        </CardContent>
        <CardHeader className="p-4 flex-grow">
            <h3 className="font-headline text-xl font-semibold">{event.title}</h3>
            <div className="space-y-1.5 pt-2">
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4"/>
                  {event.date}
              </p>
               <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4"/>
                  {event.locationType}{event.locationType === 'In-person' && ` - ${event.locationName}`}
              </p>
            </div>
        </CardHeader>
    </Card>
  );
}
