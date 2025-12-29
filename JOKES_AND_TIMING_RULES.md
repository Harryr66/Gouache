# Jokes and Timing Rules Reference

## Current Jokes (from `src/components/typewriter-joke.tsx`)

1. `"2 ships carrying red and blue paint collided at sea... // The crew ended up marooned..."`
2. `"Why did the artist steal their supplies? // They had no Monet..."`
3. `"Vincent Van Gogh walks into a bar… // The bartender offers him a drink... // \"No thanks\" Vincent said... // \"I've got one ere.\""`
4. `"What did Dali eat for breakfast?... // A bowl of Surreal ..."`
5. `"My canvas just broke up with me… // It said over the years I've stretched it too thin."`
6. `"A portrait artist asked his wife why she was annoyed with him… // She said \"don't use that tone with me\""`
7. `"A textile artist was fired after falling into the factory loom... // They claim they were stitched up..."`
8. `"Remember, if it's not Baroque…Don't fix it."`

### Joke Format Notes:
- `//` = Line break (1 second pause)
- `...` = Ellipsis (2 second pause)
- Text after `//` is automatically capitalized

---

## Timing Rules

### TypewriterJoke Component (`src/components/typewriter-joke.tsx`)

**Default Values:**
- `typingSpeed = 60` milliseconds per character (default, but overridden in pages)
- `pauseAfterComplete = 2000` milliseconds (2 seconds) - pause after joke finishes typing

**Special Pauses:**
- `//` (line break): **1000ms** (1 second) pause
- `...` (ellipsis): **2000ms** (2 seconds) pause

**Actual Usage in Pages:**
- Discover page: `typingSpeed={40}` (40ms per character)
- Courses page: `typingSpeed={40}` (40ms per character)
- Both use: `pauseAfterComplete={2000}` (2 seconds)

---

### Discover Page (`src/app/(main)/discover/page.tsx`)

**Loading Screen Timing:**
- `MIN_JOKE_DISPLAY_TIME = 2000` - **2 seconds minimum** after joke completes before screen can dismiss
- `MAX_LOADING_TIME = 15000` - **15 seconds maximum** total loading time (fallback timeout)

**Dismissal Logic:**
- Must wait for: Joke completes + **2 seconds minimum** (`MIN_JOKE_DISPLAY_TIME`)
- Plus: All initial viewport images loaded
- Plus: All video posters loaded
- Fallback: If joke done + 2s but media still loading, wait max **5 seconds more** (total 7s after joke)
- Absolute maximum: **15 seconds total** (`MAX_LOADING_TIME`)

**Check Interval:**
- Re-checks every **500ms** (0.5 seconds) to see if ready to dismiss

**API Timeout:**
- Request timeout: **15 seconds** (`setTimeout(() => controller.abort(), 15000)`)

**Video Limits:**
- `MAX_VIDEOS_PER_VIEWPORT = 3` - Maximum videos to preload in viewport

---

### Courses Page (`src/app/(main)/courses/page.tsx`)

**Loading Screen Timing:**
- `MIN_JOKE_DISPLAY_TIME = 2000` - **2 seconds minimum** after joke completes before screen can dismiss
- Maximum timeout: **15 seconds total** (fallback)

**Dismissal Logic:**
- Must wait for: Joke completes + **2 seconds minimum** (`MIN_JOKE_DISPLAY_TIME`)
- Plus: Courses loaded (`coursesLoaded = true`)
- Plus: Not loading (`!isLoading`)
- Absolute maximum: **15 seconds total**

**Check Interval:**
- Re-checks every **500ms** (0.5 seconds) to see if ready to dismiss

---

## Summary of All Timing Values

| Timing Rule | Value | Location | Purpose |
|------------|-------|----------|---------|
| **Typing Speed** | 40ms per char | Discover/Courses pages | How fast joke types |
| **Pause After Complete** | 2000ms (2s) | TypewriterJoke component | Pause after joke finishes |
| **Line Break Pause** | 1000ms (1s) | TypewriterJoke component | Pause at `//` |
| **Ellipsis Pause** | 2000ms (2s) | TypewriterJoke component | Pause at `...` |
| **Min Joke Display** | 2000ms (2s) | Discover/Courses pages | Minimum time joke must be visible after completion |
| **Max Loading Time** | 15000ms (15s) | Discover/Courses pages | Absolute maximum loading screen duration |
| **Media Timeout** | 7000ms (7s) | Discover page | Max time after joke + 2s to wait for media |
| **Check Interval** | 500ms (0.5s) | Discover/Courses pages | How often to check if ready to dismiss |
| **API Timeout** | 15000ms (15s) | Discover page | Maximum API request time |

---

## Current Flow

1. **Joke starts typing** (40ms per character)
2. **Line breaks** (`//`) pause for 1 second
3. **Ellipsis** (`...`) pauses for 2 seconds
4. **Joke completes typing**
5. **Pause for 2 seconds** (`pauseAfterComplete`)
6. **`onComplete` callback fires** (marks joke as complete)
7. **Wait additional 2 seconds** (`MIN_JOKE_DISPLAY_TIME`) - minimum display time
8. **Check if content ready** (every 500ms)
9. **Dismiss when ready** OR **after 15 seconds maximum**

Total minimum time: ~Joke typing time + 2s (pause) + 2s (min display) = **Typing time + 4 seconds minimum**

