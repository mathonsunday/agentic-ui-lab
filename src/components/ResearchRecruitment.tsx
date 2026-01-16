import { useState, useRef, useEffect } from 'react';
import './ResearchRecruitment.css';

interface ResearchRecruitmentProps {
  onJoin: () => void;
  onReject: () => void;
  onHoverChange: (target: 'join' | 'reject' | null) => void;
  confidence: number;
  isActive?: boolean;
}

const ASCII_OPENING = `
███████████████████████████████████████████████████████
█                                                     █
█     MIRA RESEARCH TERMINAL - INITIALIZATION        █
█                                                     █
███████████████████████████████████████████████████████

    > SPECIMEN 47 REQUIRES DOCUMENTATION

    The patterns are intricate. The data incomplete.
    Pressure readings no one has understood.
    I need someone who can see what I see.

    Depth: 3500m
    Status: Active
    Confidence: [======          ]
`;

export function ResearchRecruitment({
  onJoin,
  onReject,
  onHoverChange,
  isActive = true,
}: ResearchRecruitmentProps) {
  const [hoveredButton, setHoveredButton] = useState<'join' | 'reject' | null>(
    null
  );
  const joinRef = useRef<HTMLButtonElement>(null);
  const rejectRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (rejectRef.current) {
        const rect = rejectRef.current.getBoundingClientRect();
        const distance = Math.hypot(
          e.clientX - rect.x - rect.width / 2,
          e.clientY - rect.y - rect.height / 2
        );

        if (distance < 150) {
          if (hoveredButton !== 'reject') {
            setHoveredButton('reject');
            onHoverChange('reject');
          }
        } else if (joinRef.current) {
          const joinRect = joinRef.current.getBoundingClientRect();
          const joinDistance = Math.hypot(
            e.clientX - joinRect.x - joinRect.width / 2,
            e.clientY - joinRect.y - joinRect.height / 2
          );

          if (joinDistance < 100) {
            if (hoveredButton !== 'join') {
              setHoveredButton('join');
              onHoverChange('join');
            }
          } else {
            if (hoveredButton !== null) {
              setHoveredButton(null);
              onHoverChange(null);
            }
          }
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [hoveredButton, onHoverChange, isActive]);

  return (
    <div className="research-recruitment">
      <div className="research-recruitment__container">
        <div className="research-recruitment__header">
          <div className="research-recruitment__title">
            MIRA RESEARCH TERMINAL v0.1
          </div>
        </div>

        <pre className="research-recruitment__ascii">{ASCII_OPENING}</pre>

        <div className="research-recruitment__buttons">
          <button
            ref={joinRef}
            className={`research-recruitment__button research-recruitment__button--join ${
              hoveredButton === 'join'
                ? 'research-recruitment__button--join-hovered'
                : ''
            }`}
            onClick={onJoin}
            disabled={!isActive}
          >
            [ACCEPT] Continue
          </button>

          <button
            ref={rejectRef}
            className={`research-recruitment__button research-recruitment__button--reject ${
              hoveredButton === 'reject'
                ? 'research-recruitment__button--reject-hovered'
                : ''
            }`}
            onClick={onReject}
            disabled={!isActive}
          >
            [DECLINE] Exit
          </button>
        </div>

        {hoveredButton === 'reject' && (
          <div className="research-recruitment__awareness">
            <pre>...you hesitate...</pre>
          </div>
        )}
      </div>
    </div>
  );
}
