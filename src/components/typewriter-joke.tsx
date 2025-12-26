'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

const ART_JOKES = [
  "2 ships carrying red and blue paint collided at sea... // The crew ended up marooned...",
  "Why did the artist steal their supplies? // They had no Monet...",
  "Vincent Van Gogh walks into a bar… // The bartender offers him a drink... // \"No thanks\" Vincent said... // \"I've got one ere.\"",
  "What did Dali eat for breakfast?... // A bowl of Surreal ...",
  "My canvas just broke up with me… // It said over the years I've stretched it too thin.",
  "A portrait artist asked his wife why she was annoyed with him… // She said \"don't use that tone with me\"",
  "A textile artist was fired after falling into the factory loom... // They claim they were stitched up...",
  "Remember, if it's not Baroque…Don't fix it."
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
  const typingStartedRef = useRef(false);

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
    if (!currentJoke || !mounted || typingStartedRef.current) return;
    
    // Mark that typing has started - prevent restarting
    typingStartedRef.current = true;

    let currentIndex = 0;
    setIsTyping(true);
    setIsComplete(false);
    let isPaused = false;
    let shouldCapitalizeNext = false; // Track if next char should be capitalized (after line break)
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
        
        // Check for "//" - insert line break with 2 second pause
        if (char === '/' && nextChar === '/') {
          isPaused = true;
          const textSoFar = currentJoke.slice(0, currentIndex).replace(/\/\//g, '\n') + '\n';
          setDisplayedText(textSoFar);
          currentIndex += 2;
          shouldCapitalizeNext = true; // Next character should be capitalized
          
          // Pause for 2 seconds before continuing
          setTimeout(() => {
            isPaused = false;
          }, 2000);
          return;
        }
        
        // Normal character typing (convert // to line breaks and capitalize after line breaks)
        let charToAdd = char;
        if (shouldCapitalizeNext && char.trim()) {
          // Capitalize the first non-whitespace character after a line break
          charToAdd = char.toUpperCase();
          shouldCapitalizeNext = false;
        }
        
        // Build text so far: take text up to and including currentIndex, replace // with \n, and apply capitalization
        let textSoFar = currentJoke.slice(0, currentIndex + 1);
        // Replace // with \n first
        textSoFar = textSoFar.replace(/\/\//g, '\n');
        // If we need to capitalize this character, replace the last character with its capitalized version
        if (charToAdd !== char) {
          textSoFar = textSoFar.slice(0, -1) + charToAdd;
        }
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
      <p className="min-h-[3rem] whitespace-pre-line break-words font-semibold">
        {formattedText}
        {isTyping && (
          <span className="ml-1 animate-pulse">|</span>
        )}
      </p>
    </div>
  );
}

