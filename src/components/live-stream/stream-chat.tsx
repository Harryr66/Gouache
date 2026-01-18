'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, HelpCircle } from 'lucide-react';
import { StreamChatMessage } from '@/lib/live-stream-types';
import { useLiveStream } from '@/providers/live-stream-provider';
import { useAuth } from '@/providers/auth-provider';
import { formatDistanceToNow } from 'date-fns';

interface StreamChatProps {
  streamId: string;
  messages: StreamChatMessage[];
  chatEnabled: boolean;
  qaEnabled: boolean;
  isArtist?: boolean;
}

export function StreamChat({ 
  streamId, 
  messages, 
  chatEnabled, 
  qaEnabled,
  isArtist = false,
}: StreamChatProps) {
  const [message, setMessage] = useState('');
  const [isQuestion, setIsQuestion] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { sendChatMessage } = useLiveStream();
  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !user) return;
    
    setIsSending(true);
    try {
      await sendChatMessage(message.trim(), isQuestion);
      setMessage('');
      setIsQuestion(false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!chatEnabled) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground text-sm">Chat is disabled for this stream</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Live Chat
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-3 py-2">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No messages yet. Be the first to say hi!
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.isQuestion ? 'bg-primary/5 -mx-2 px-2 py-1 rounded' : ''}`}
                >
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarImage src={msg.userAvatar} />
                    <AvatarFallback className="text-xs">{msg.userName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">{msg.userName}</span>
                      {msg.isQuestion && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          <HelpCircle className="h-2 w-2 mr-0.5" />
                          Q
                        </Badge>
                      )}
                      {msg.isPinned && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          Pinned
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm break-words">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t flex-shrink-0">
          {user ? (
            <form onSubmit={handleSend} className="space-y-2">
              {qaEnabled && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={isQuestion ? 'default' : 'outline'}
                    onClick={() => setIsQuestion(!isQuestion)}
                    className="text-xs"
                  >
                    <HelpCircle className="h-3 w-3 mr-1" />
                    Ask Question
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={isQuestion ? 'Type your question...' : 'Say something...'}
                  disabled={isSending}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={isSending || !message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Sign in to join the chat
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
