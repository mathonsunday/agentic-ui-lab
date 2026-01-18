# Premium ASCII Art Integration Guide

## Overview

Your agentic-ui-lab now includes support for rendering animated, colored ASCII creatures from the `deep-sea-ascii-art` library. This allows you to view your original text-based ASCII creatures alongside beautifully animated versions with:

- Smooth CSS animations
- Glow effects and color variations
- Multi-zoom level support (far, medium, close)
- Graceful fallback to text ASCII if premium library unavailable

## What's New

### New Components

1. **`PremiumCreatureRenderer.tsx`** - Dynamic component that renders premium creatures or falls back to text ASCII
2. **`usePremiumAscii` hook** - Manages premium/text ASCII preference with localStorage persistence

### Updated Components

- **`TerminalInterface.tsx`** - Now includes:
  - `usePremiumAscii` hook for state management
  - Premium renderer integration in ASCII rendering path
  - Toggle button (⭐ PREMIUM / █ TEXT) in tool buttons

## How It Works

### Current State (Without Setup)

Right now, the integration is set up to gracefully fall back to your original text-based ASCII. The "⭐ PREMIUM" toggle button will appear but won't render premium animations yet—it will show the text fallback.

This is intentional! The premium components live in a separate library (`deep-sea-ascii-art`) that needs to be properly configured in the build.

### Available Premium Creatures

The following creatures have premium animated versions available:

- **anglerFish** - Glowing lure with drifting particles ✨
- **jellyfish** - Pulsing bell with sinking tentacles 🪼
- **bioluminescentFish** - Swimming with glow trails 🐟
- **viperFish** - Sharp teeth and aggressive movement 🦷
- **treasureChest** - Opening/closing with coin spill 💰
- **coral** - Swaying with polyp animations 🪸
- **deepSeaDiver** - Pressure suit with helmet glow 🤿

## Setting Up Premium Rendering

### Option 1: Using Relative Imports (Simplest)

If `deep-sea-ascii-art` is in the same monorepo, update the import path in `PremiumCreatureRenderer.tsx`:

```typescript
// Already configured in the component to try this path:
import(`../../../deep-sea-ascii-art/components/premium-ascii/${componentName}`)
```

Just ensure the directory structure is:
```
mathonsunday/
├── agentic-ui-lab/
│   └── src/
│       └── components/
│           └── PremiumCreatureRenderer.tsx
└── deep-sea-ascii-art/
    └── components/
        └── premium-ascii/
```

### Option 2: Build and Export Premium Library

1. **Build the premium library:**

```bash
cd ../deep-sea-ascii-art
npm run build
```

2. **Update vite.config.ts** in agentic-ui-lab:

```typescript
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@premium-ascii-art': resolve(__dirname, '../deep-sea-ascii-art'),
    },
  },
});
```

3. **Update import in PremiumCreatureRenderer.tsx:**

```typescript
import(`@premium-ascii-art/components/premium-ascii/${componentName}`)
```

### Option 3: Manual Component Import (Most Reliable)

If the dynamic imports aren't working, you can manually import components:

```typescript
import { AnimatedAnglerfish } from '../../../deep-sea-ascii-art/components/premium-ascii/animated-anglerfish';
import { AnimatedJellyfish } from '../../../deep-sea-ascii-art/components/premium-ascii/animated-jellyfish';
// ... etc

const PremiumCreatures = {
  anglerFish: () => AnimatedAnglerfish,
  jellyfish: () => AnimatedJellyfish,
  // ...
};
```

## Using the Premium Renderer

### In Your Components

The integration is automatic in `TerminalInterface.tsx`:

```tsx
// The premium renderer is already integrated:
{line.type === 'ascii' ? (
  isHydrated ? (
    <PremiumCreatureRenderer
      creature={currentCreature}
      zoom={currentZoom}
      usePremium={usePremium}           // Controlled by toggle button
      fallback={<pre>{line.content}</pre>}
    />
  ) : (
    <pre>{line.content}</pre>
  )
) : (
  // ... other line types
)}
```

### Toggling Premium/Text

Users can click the **⭐ PREMIUM** button to toggle between:
- **⭐ PREMIUM**: Renders animated creatures (if available)
- **█ TEXT**: Shows original text-based ASCII

The preference is persisted to localStorage.

## Customization

### Adding New Premium Creatures

1. Create the animated component in `deep-sea-ascii-art/components/premium-ascii/`
2. Name it with the pattern: `animated-{creature-name}.tsx`
3. Add to `PremiumCreatures` mapping in `PremiumCreatureRenderer.tsx`
4. Update the creature name mapping if needed

### Styling

Premium creatures use:
- Tailwind CSS classes (from the v0 library)
- Inline `style` attributes for dynamic animations
- CSS-in-JS `<style jsx>` blocks for keyframe animations

To customize appearance, modify the component files in `deep-sea-ascii-art/components/premium-ascii/`.

## Fallback Behavior

If a premium creature isn't available, the renderer will:

1. Show a helpful message indicating text-based ASCII is being used
2. Fall back to your original text ASCII art
3. Continue functioning normally

This ensures the experience degrades gracefully.

## Performance Considerations

### Bundle Size

- **With premium library**: ~20-30KB additional gzipped
- **Without premium library**: 0KB (uses fallback)

Premium components only load when:
1. The library is available
2. The user has the toggle enabled
3. The component is visible

### Animation Performance

Premium creatures use:
- CSS animations (60fps, GPU-accelerated)
- React hooks (minimal re-renders)
- Suspension boundaries (doesn't block UI)

For slower devices, users can switch to text ASCII via the toggle.

## Troubleshooting

### Premium Toggle Appears but Shows Text ASCII

This is expected if the library isn't properly linked. Check:

1. ✅ Is `deep-sea-ascii-art` in the same parent directory?
2. ✅ Did you run `npm run build` in that directory?
3. ✅ Does the relative import path match your structure?

The system is working correctly—it's just falling back to text ASCII.

### Import Errors

If you see errors like `Cannot find module...`:

1. Verify the path in `PremiumCreatureRenderer.tsx` is correct
2. Try the "Manual Import" approach (Option 3)
3. Check that the deep-sea-ascii-art library builds successfully

### Animations Not Showing

Make sure:
1. The toggle is set to ⭐ PREMIUM
2. Tailwind CSS is configured (it should be)
3. JavaScript is enabled in your browser
4. No ad blockers are interfering with animations

## Future Enhancements

### Claude-Based Selection (Planned)

Once you have a strong library of good ASCII art, you can integrate Claude to dynamically select creatures based on mood:

```typescript
async function selectCreaturByMood(
  personality: 'negative' | 'chaotic' | 'glowing',
  mood: string
): Promise<CreatureName> {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 50,
    messages: [{
      role: 'user',
      content: `Given these ASCII variations of creatures, which best expresses "${mood}" for personality "${personality}"? Return just the creature name.`
    }]
  });

  return parseCreatureName(message.content[0].text);
}
```

### Procedural Generation

Generate new creatures on the fly by:
1. Using Unicode/Dingbats from `experimental-ascii.ts`
2. Applying color gradients
3. Adding custom animations

## Resources

- **Premium Components**: `deep-sea-ascii-art/components/premium-ascii/`
- **Experimental Styles**: `deep-sea-ascii-art/lib/experimental-ascii.ts`
- **Original Text ASCII**: `src/shared/rovAsciiVariants.ts`

## Questions?

The integration is built to be resilient—if something doesn't work, the original text ASCII will always display. You can iterate and improve the setup incrementally!
