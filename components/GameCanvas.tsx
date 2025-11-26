import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  FIELD_WIDTH, FIELD_HEIGHT, GOAL_WIDTH, GOAL_DEPTH, 
  BALL_RADIUS, PLAYER_RADIUS, MAX_SPEED, FRICTION, BALL_FRICTION,
  ANIMALS 
} from '../constants';
import { AnimalType, Entity, GameStatus, Player, Vector2 } from '../types';
import { generateGoalCommentary } from '../services/geminiService';

interface GameCanvasProps {
  userAnimal: AnimalType;
  gameStatus: GameStatus;
  onGoal: (team: 'red' | 'blue', scorer: AnimalType) => void;
  onGameEnd: (scoreRed: number, scoreBlue: number) => void;
  setCommentary: (text: string) => void;
  scoreRed: number;
  scoreBlue: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  userAnimal, gameStatus, onGoal, onGameEnd, setCommentary, scoreRed, scoreBlue
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Audio contexts
  const kickAudioContext = useRef<AudioContext | null>(null);

  // Game State Refs (mutable for performance)
  const ballRef = useRef<Entity>({ pos: { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 }, vel: { x: 0, y: 0 }, radius: BALL_RADIUS, mass: 1, damping: BALL_FRICTION });
  const playerRedRef = useRef<Player>({ 
    id: 'p1', pos: { x: 100, y: FIELD_HEIGHT / 2 }, vel: { x: 0, y: 0 }, 
    radius: PLAYER_RADIUS, mass: 5, damping: FRICTION, 
    team: 'red', isHuman: true, emoji: userAnimal,
    ...ANIMALS.find(a => a.type === userAnimal)!
  });
  
  // Random CPU opponent
  const cpuAnimalType = useRef<AnimalType>(ANIMALS.filter(a => a.type !== userAnimal)[Math.floor(Math.random() * (ANIMALS.length - 1))].type);
  const playerBlueRef = useRef<Player>({ 
    id: 'cpu', pos: { x: FIELD_WIDTH - 100, y: FIELD_HEIGHT / 2 }, vel: { x: 0, y: 0 }, 
    radius: PLAYER_RADIUS, mass: 5, damping: FRICTION, 
    team: 'blue', isHuman: false, emoji: cpuAnimalType.current,
    ...ANIMALS.find(a => a.type === cpuAnimalType.current)!
  });

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const goalCooldownRef = useRef(0);

  // Sound Effect
  const playKickSound = () => {
    if (!kickAudioContext.current) {
        kickAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = kickAudioContext.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  const playWhistleSound = () => {
    if (!kickAudioContext.current) return;
    const ctx = kickAudioContext.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(2500, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(2000, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Reset positions
  const resetPositions = useCallback(() => {
    ballRef.current.pos = { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 };
    ballRef.current.vel = { x: 0, y: 0 };
    
    playerRedRef.current.pos = { x: 150, y: FIELD_HEIGHT / 2 };
    playerRedRef.current.vel = { x: 0, y: 0 };
    
    playerBlueRef.current.pos = { x: FIELD_WIDTH - 150, y: FIELD_HEIGHT / 2 };
    playerBlueRef.current.vel = { x: 0, y: 0 };
    
    goalCooldownRef.current = 60; // 1 second immunity
    playWhistleSound();
  }, []);

  // Physics Helpers
  const checkCollision = (c1: Entity, c2: Entity) => {
    const dx = c2.pos.x - c1.pos.x;
    const dy = c2.pos.y - c1.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < c1.radius + c2.radius) {
      // Collision resolution
      const normal = { x: dx / dist, y: dy / dist };
      const relativeVelocity = { x: c1.vel.x - c2.vel.x, y: c1.vel.y - c2.vel.y };
      const speed = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;

      if (speed < 0) return; // Moving apart

      const impulse = 2 * speed / (c1.mass + c2.mass);
      
      c1.vel.x -= impulse * c2.mass * normal.x;
      c1.vel.y -= impulse * c2.mass * normal.y;
      c2.vel.x += impulse * c1.mass * normal.x;
      c2.vel.y += impulse * c1.mass * normal.y;

      // Prevent sticking
      const overlap = (c1.radius + c2.radius - dist) / 2;
      c1.pos.x -= overlap * normal.x;
      c1.pos.y -= overlap * normal.y;
      c2.pos.x += overlap * normal.x;
      c2.pos.y += overlap * normal.y;
    }
  };

  const updateAI = (cpu: Player, ball: Entity, opponentGoalX: number) => {
    // Simple AI: Move towards ball
    const dx = ball.pos.x - cpu.pos.x;
    const dy = ball.pos.y - cpu.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize and Apply speed
    if (dist > 5) {
      cpu.vel.x += (dx / dist) * 0.5;
      cpu.vel.y += (dy / dist) * 0.5;
    }

    // Shoot if close and aligned
    if (dist < cpu.radius + ball.radius + 10) {
       // Aim for goal
       const goalDy = (FIELD_HEIGHT/2) - cpu.pos.y;
       const goalDx = opponentGoalX - cpu.pos.x;
       const goalDist = Math.sqrt(goalDx*goalDx + goalDy*goalDy);
       
       // If aiming roughly right
       if ( (opponentGoalX === 0 && cpu.vel.x < 0) || (opponentGoalX === FIELD_WIDTH && cpu.vel.x > 0)) {
           // Kick
           ball.vel.x += (goalDx/goalDist) * 2; // Extra push
           ball.vel.y += (goalDy/goalDist) * 2;
       }
    }
  };

  const updatePhysics = () => {
    if (gameStatus !== GameStatus.PLAYING) return;
    if (goalCooldownRef.current > 0) {
        goalCooldownRef.current--;
        return;
    }

    const ball = ballRef.current;
    const p1 = playerRedRef.current;
    const p2 = playerBlueRef.current;

    // --- Player 1 Input ---
    if (keysRef.current['ArrowUp'] || keysRef.current['KeyW']) p1.vel.y -= 0.5;
    if (keysRef.current['ArrowDown'] || keysRef.current['KeyS']) p1.vel.y += 0.5;
    if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) p1.vel.x -= 0.5;
    if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) p1.vel.x += 0.5;

    // Kick
    if (keysRef.current['Space']) {
        const dx = ball.pos.x - p1.pos.x;
        const dy = ball.pos.y - p1.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < p1.radius + ball.radius + 15) {
            const normal = { x: dx/dist, y: dy/dist };
            ball.vel.x += normal.x * p1.kickPower * 0.3;
            ball.vel.y += normal.y * p1.kickPower * 0.3;
            playKickSound();
        }
    }

    // --- AI ---
    updateAI(p2, ball, 0); // AI attacks left goal (0, y)

    // --- Physics Update ---
    [ball, p1, p2].forEach(ent => {
        ent.pos.x += ent.vel.x;
        ent.pos.y += ent.vel.y;
        ent.vel.x *= ent.damping;
        ent.vel.y *= ent.damping;

        // Wall collisions
        if (ent.pos.y < ent.radius) { ent.pos.y = ent.radius; ent.vel.y *= -1; }
        if (ent.pos.y > FIELD_HEIGHT - ent.radius) { ent.pos.y = FIELD_HEIGHT - ent.radius; ent.vel.y *= -1; }
        
        // Side walls (excluding goals)
        const inGoalY = ent.pos.y > (FIELD_HEIGHT - GOAL_WIDTH)/2 && ent.pos.y < (FIELD_HEIGHT + GOAL_WIDTH)/2;
        
        if (ent.pos.x < ent.radius) {
            if (!inGoalY || ent !== ball) {
                ent.pos.x = ent.radius; ent.vel.x *= -0.5;
            }
        }
        if (ent.pos.x > FIELD_WIDTH - ent.radius) {
            if (!inGoalY || ent !== ball) {
                ent.pos.x = FIELD_WIDTH - ent.radius; ent.vel.x *= -0.5;
            }
        }

        // Clamp Speed
        const speed = Math.sqrt(ent.vel.x * ent.vel.x + ent.vel.y * ent.vel.y);
        const limit = ent === ball ? MAX_SPEED * 2.5 : (ent as Player).speed || MAX_SPEED;
        if (speed > limit) {
            ent.vel.x = (ent.vel.x / speed) * limit;
            ent.vel.y = (ent.vel.y / speed) * limit;
        }
    });

    // --- Collisions ---
    checkCollision(p1, ball);
    checkCollision(p2, ball);
    checkCollision(p1, p2);

    // --- Goal Check ---
    if (ball.pos.x < 0) {
        // Goal for Blue
        onGoal('blue', p2.emoji);
        handleGoal('blue', p2.emoji);
    } else if (ball.pos.x > FIELD_WIDTH) {
        // Goal for Red
        onGoal('red', p1.emoji);
        handleGoal('red', p1.emoji);
    }
  };

  const handleGoal = async (team: 'red' | 'blue', scorer: AnimalType) => {
    resetPositions();
    playWhistleSound();
    
    // Optimistic UI updates are handled in parent, but we trigger AI commentary here
    // We pass the *current* scores plus the new one for context
    const sR = team === 'red' ? scoreRed + 1 : scoreRed;
    const sB = team === 'blue' ? scoreBlue + 1 : scoreBlue;
    
    setCommentary(`${team.toUpperCase()} TEAM SCORES! Processing commentary...`);
    const comment = await generateGoalCommentary(scorer, team, sR, sB);
    setCommentary(comment);
  };

  // Render Loop
  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // Draw Field
    // Grass stripes
    const stripeWidth = 50;
    for(let i=0; i<FIELD_WIDTH; i+=stripeWidth) {
        ctx.fillStyle = (i/stripeWidth)%2 === 0 ? '#4ade80' : '#22c55e'; // Tailwind green-400 / green-500
        ctx.fillRect(i, 0, stripeWidth, FIELD_HEIGHT);
    }
    
    // Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 4;
    ctx.strokeRect(50, 50, FIELD_WIDTH-100, FIELD_HEIGHT-100); // Touchlines (inset slightly for aesthetics)
    
    // Center circle
    ctx.beginPath();
    ctx.arc(FIELD_WIDTH/2, FIELD_HEIGHT/2, 60, 0, Math.PI*2);
    ctx.stroke();
    
    // Center line
    ctx.beginPath();
    ctx.moveTo(FIELD_WIDTH/2, 50);
    ctx.lineTo(FIELD_WIDTH/2, FIELD_HEIGHT-50);
    ctx.stroke();

    // Goals
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, (FIELD_HEIGHT-GOAL_WIDTH)/2, 50, GOAL_WIDTH);
    ctx.fillRect(FIELD_WIDTH-50, (FIELD_HEIGHT-GOAL_WIDTH)/2, 50, GOAL_WIDTH);

    // Draw Entities
    const drawPlayer = (p: Player) => {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(p.pos.x, p.pos.y + p.radius - 5, p.radius, p.radius/3, 0, 0, Math.PI*2);
        ctx.fill();

        // Body (Circle)
        ctx.fillStyle = p.team === 'red' ? '#ef4444' : '#3b82f6';
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI*2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        // Emoji
        ctx.font = `${p.radius * 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, p.pos.x, p.pos.y + 2);

        // Indicator
        if (p.isHuman) {
            ctx.beginPath();
            ctx.moveTo(p.pos.x - 10, p.pos.y - p.radius - 10);
            ctx.lineTo(p.pos.x + 10, p.pos.y - p.radius - 10);
            ctx.lineTo(p.pos.x, p.pos.y - p.radius - 5);
            ctx.fillStyle = '#fbbf24'; // Yellow arrow
            ctx.fill();
        }
    };

    drawPlayer(playerRedRef.current);
    drawPlayer(playerBlueRef.current);

    // Draw Ball
    const b = ballRef.current;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(b.pos.x, b.pos.y + b.radius - 2, b.radius, b.radius/3, 0, 0, Math.PI*2);
    ctx.fill();

    // Ball Body
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI*2);
    ctx.fill();
    
    // Ball pattern (simple soccer ball patches)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(b.pos.x, b.pos.y, b.radius/2, 0, Math.PI*2);
    ctx.fill();
  };

  const tick = () => {
    updatePhysics();
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameStatus]); // Re-bind tick if status changes, though logic handles returns

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-white/20">
       <canvas 
         ref={canvasRef} 
         width={FIELD_WIDTH} 
         height={FIELD_HEIGHT}
         className="block bg-green-500 cursor-none touch-none w-full h-auto max-w-[800px]"
       />
       {/* Mobile Controls Overlay (Visible only on touch devices ideally, but simpler to show always or rely on css) */}
       <div className="md:hidden absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none">
          <div className="bg-black/30 p-2 rounded text-white text-xs">Tap screen is not supported yet. Use keyboard!</div>
       </div>
    </div>
  );
};

export default GameCanvas;
