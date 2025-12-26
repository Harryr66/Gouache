'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

const ART_JOKES = [
  "2 ships carrying red and blue paint collided at sea— the crew ended up marooned...",
  "Why did the artist steal their supplies? They had no Monet...",
  "Van Gogh walks into a bar. Bartender offers a drink. \"No thanks, I've got one 'ere.\"",
  "Every morning Dali started his day with some Surreal",
  "My canvas just broke up with me: They said over the years I've stretched them too thin.",
  "A portrait artist asked his wife why she was annoyed... She said \"don't use that tone with me\"",
  "A textile artist was fired for breaking the upholstery machine, they claim they were stitched up...",
  "Remember, if it's not Baroque, don't fix try it."
];

interface TypewriterJokeProps {
  onComplete?: () => void;
  typingSpeed?: number; // milliseconds per character
  pauseAfterComplete?: number; // milliseconds to wait after joke is complete
}

export function TypewriterJoke({ 
  onComplete, 
  typingSpeed = 60, // Slower typing speed for better readability
  pauseAfterComplete = 3000 // Longer pause to allow reading
}: TypewriterJokeProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentJoke, setCurrentJoke] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Pick a random joke
    const randomJoke = ART_JOKES[Math.floor(Math.random() * ART_JOKES.length)];
    setCurrentJoke(randomJoke);
  }, []);

  useEffect(() => {
    if (!currentJoke || !mounted) return;

    let currentIndex = 0;
    setIsTyping(true);
    setIsComplete(false);

    const typeInterval = setInterval(() => {
      if (currentIndex < currentJoke.length) {
        setDisplayedText(currentJoke.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        // Typing complete
        clearInterval(typeInterval);
        setIsTyping(false);
        setIsComplete(true);
        
        // Wait for pauseAfterComplete, then call onComplete
        setTimeout(() => {
          setIsComplete(false);
          if (onComplete) {
            onComplete();
          }
        }, pauseAfterComplete);
      }
    }, typingSpeed);

    return () => {
      clearInterval(typeInterval);
    };
  }, [currentJoke, mounted, typingSpeed, pauseAfterComplete, onComplete]);

  if (!mounted) {
    return null;
  }

  const currentTheme = resolvedTheme || theme || 'dark';
  const isDark = currentTheme === 'dark';
  const textColor = isDark ? 'text-white/90' : 'text-gray-800';

  return (
    <div className={`${textColor} text-sm md:text-base max-w-2xl text-center px-4`}>
      <p className="min-h-[3rem] flex items-center justify-center">
        {displayedText}
        {isTyping && (
          <span className="ml-1 animate-pulse">|</span>
        )}
      </p>
    </div>
  );
}

