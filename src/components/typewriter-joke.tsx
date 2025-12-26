'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

const ART_JOKES = [
  "2 ships carrying red and blue paint collided at sea— the crew ended up marooned...",
  "Why did the artist steal their supplies? They had no Monet...",
  "Vincent Van Gogh walks into a bar... The bartender offers him a drink... // \"No thanks Vincent said... I've got one 'ere.\"",
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
  const jokeInitializedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    // Pick a random joke ONLY ONCE - never change it
    if (!jokeInitializedRef.current) {
      const randomJoke = ART_JOKES[Math.floor(Math.random() * ART_JOKES.length)];
      setCurrentJoke(randomJoke);
      jokeInitializedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!currentJoke || !mounted) return;

    let currentIndex = 0;
    setIsTyping(true);
    setIsComplete(false);
    let isPaused = false;
    let intervalId: NodeJS.Timeout | null = null;

    const typeInterval = setInterval(() => {
      if (isPaused) return; // Skip typing while paused
      
      if (currentIndex < currentJoke.length) {
        const char = currentJoke[currentIndex];
        const nextChar = currentIndex + 1 < currentJoke.length ? currentJoke[currentIndex + 1] : '';
        const nextNextChar = currentIndex + 2 < currentJoke.length ? currentJoke[currentIndex + 2] : '';
        
        // Check for "..." - pause for 2 seconds
        if (char === '.' && nextChar === '.' && nextNextChar === '.') {
          isPaused = true;
          // Display the ellipsis (convert // to line breaks)
          const textSoFar = currentJoke.slice(0, currentIndex + 3).replace(/\/\//g, '\n');
          setDisplayedText(textSoFar);
          currentIndex += 3;
          
          // Pause for 2 seconds
          setTimeout(() => {
            isPaused = false;
          }, 2000);
          return;
        }
        
        // Check for "//" - insert line break
        if (char === '/' && nextChar === '/') {
          const textSoFar = currentJoke.slice(0, currentIndex).replace(/\/\//g, '\n') + '\n';
          setDisplayedText(textSoFar);
          currentIndex += 2;
          return;
        }
        
        // Normal character typing (convert // to line breaks)
        const textSoFar = currentJoke.slice(0, currentIndex + 1).replace(/\/\//g, '\n');
        setDisplayedText(textSoFar);
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

    intervalId = typeInterval;

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentJoke, mounted, typingSpeed, pauseAfterComplete, onComplete]);

  if (!mounted) {
    return null;
  }

  const currentTheme = resolvedTheme || theme || 'dark';
  const isDark = currentTheme === 'dark';
  const textColor = isDark ? 'text-white/90' : 'text-gray-800';

  // Convert newlines to <br/> for rendering
  const formattedText = displayedText.split('\n').map((line, index, array) => (
    <React.Fragment key={index}>
      {line}
      {index < array.length - 1 && <br />}
    </React.Fragment>
  ));

  return (
    <div className={`${textColor} text-sm md:text-base max-w-2xl text-center px-4`}>
      <p className="min-h-[3rem] flex items-center justify-center whitespace-pre-line">
        {formattedText}
        {isTyping && (
          <span className="ml-1 animate-pulse">|</span>
        )}
      </p>
    </div>
  );
}

