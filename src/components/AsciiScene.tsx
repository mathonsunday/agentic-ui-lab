import { useMemo } from 'react';
import type { MiraState } from '../shared/miraAgentSimulator';
import './AsciiScene.css';

interface AsciiSceneProps {
  sceneId: string;
  mood: MiraState['currentMood'];
  confidence: number;
}

// ASCII art patterns for different scenes and moods
const ASCII_PATTERNS = {
  shadows: {
    testing: `
     ~~~~~~~~~~~~~~~~~~~
    /                   \\
   |     . . . .        |
   |    ...   ...       |
   |     . . . .        |
    \\                   /
     ~~~~~~~~~~~~~~~~~~~
    `,
    curious: `
     ~~~~~~~~~~~~~~~~~~~
    /   ~   ~   ~       \\
   |    ...   ...       |
   |     . . . .        |
   |    ...   ...       |
    \\   ~   ~   ~       /
     ~~~~~~~~~~~~~~~~~~~
    `,
    vulnerable: `
     ~~~~~~~~~~~~~~~~~~~~~
    /                     \\
   |     ...     ...      |
   |      .........       |
   |     ...     ...      |
    \\                     /
     ~~~~~~~~~~~~~~~~~~~~~
    `,
    excited: `
     ~~~~~~~~~~~~~~~~~~~~
    /  ~ ~ ~ ~ ~ ~ ~    \\
   | ..  ...  ...  ..   |
   |  ..........  ..    |
   | ..  ...  ...  ..   |
    \\  ~ ~ ~ ~ ~ ~ ~    /
     ~~~~~~~~~~~~~~~~~~~~
    `,
    defensive: `
     ~~~~~~~~~~~~~~~~
    / \\ / \\ / \\ / \\ /
   |  .  .  .  .  . |
   |  .  .  .  .  . |
   |  .  .  .  .  . |
    \\ / \\ / \\ / \\ / \\
     ~~~~~~~~~~~~~~~~
    `,
  },
  'giant-squid': {
    testing: `
      \\ | /
       \\|/
        |
       /|\\
      / | \\
        |||
       /| |\\
      / | | \\
        |||
        |||
    `,
    curious: `
      \\ ~ /
       \\|/
      ~ | ~
       /|\\
      / | \\
       ~|||~
       /|||\\
      / | | \\
       ~|||~
        |||
    `,
    vulnerable: `
       /|\\
      / | \\
     |  |  |
      \\ | /
       \\|/
        |
        |
       /|\\
      / | \\
       |||
    `,
    excited: `
      \\ | /
      /   \\
    |   |   |
    |   |   |
     \\ | | /
      \\|||/
       \\|/
        |
       |||
    `,
    defensive: `
      >|<
      >|<
      >|<
        |
       /|\\
      / | \\
       /||\\
      /  ||  \\
       ||||
    `,
  },
  leviathan: {
    testing: `
     \\\\\/\\\\\/\\\\/\\\\
      |    |
      |    |
       \\  /
        \\/
    `,
    curious: `
     \\\\/~\\\\/~\\\\/\\\\
      ~    ~
      |    |
       \\  /
        \\/
    `,
    vulnerable: `
     \\\\|\\\\|\\\\|\\\\
      |    |
      |    |
       |  |
        ||
    `,
    excited: `
     \\\\<>\\\\/\\\\<>
      |    |
      |    |
       \\  /
        \\/
    `,
    defensive: `
     \\\\##\\\\##\\\\##
      #    #
      #    #
       \\##/
        ##
    `,
  },
  'rov-exterior': {
    testing: `
      [====]
       | |
       | |
      /   \\
     /     \\
    `,
    curious: `
      [~==~]
       |~|
       |~|
      / ~ \\
     /  ~  \\
    `,
    vulnerable: `
      [....]
       |..|
       |..|
      /...\\
     /.....\\
    `,
    excited: `
      [***]
       |||
       |||
      / * \\
     / * * \\
    `,
    defensive: `
      [###]
       ###
       ###
      /###\\
     /### #\\
    `,
  },
};

export function AsciiScene({ sceneId, mood, confidence }: AsciiSceneProps) {
  const pattern = useMemo(() => {
    const scenes = ASCII_PATTERNS[sceneId as keyof typeof ASCII_PATTERNS] || ASCII_PATTERNS.shadows;
    return scenes[mood] || scenes.testing;
  }, [sceneId, mood]);

  const confidenceBar = useMemo(() => {
    const filledLength = Math.round((confidence / 100) * 20);
    const emptyLength = 20 - filledLength;
    return `[${'='.repeat(filledLength)}${'-'.repeat(emptyLength)}]`;
  }, [confidence]);

  return (
    <div className="ascii-scene">
      <div className="ascii-scene__container">
        <pre className="ascii-scene__art">{pattern}</pre>
        <div className="ascii-scene__confidence">
          <span className="ascii-scene__confidence-label">presence</span>
          <span className="ascii-scene__confidence-meter">{confidenceBar}</span>
          <span className="ascii-scene__confidence-value">{Math.round(confidence)}%</span>
        </div>
      </div>
    </div>
  );
}
