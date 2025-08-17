/**
 * Advanced particle effects system for code animations
 */

import { ResourcePool } from '../../utils/performance';

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: [number, number, number, number];
  rotation: number;
  rotationSpeed: number;
  scale: number;
  opacity: number;
  type: ParticleType;
  data?: Record<string, unknown>;
}

export enum ParticleType {
  SPARK = 'spark',
  GLOW = 'glow',
  TEXT = 'text',
  CODE_FRAGMENT = 'code_fragment',
  CURSOR = 'cursor',
  HIGHLIGHT = 'highlight',
  SMOKE = 'smoke',
  MAGIC = 'magic',
}

export interface ParticleEmitterConfig {
  id: string;
  x: number;
  y: number;
  particleType: ParticleType;
  emissionRate: number;
  maxParticles: number;
  particleLife: number;
  particleLifeVariance: number;
  initialVelocity: { x: number; y: number };
  velocityVariance: { x: number; y: number };
  gravity: { x: number; y: number };
  size: number;
  sizeVariance: number;
  color: [number, number, number, number];
  colorVariance: [number, number, number, number];
  fadeIn: boolean;
  fadeOut: boolean;
  enabled: boolean;
  burst?: {
    count: number;
    interval: number;
  };
}

export interface ParticleEffect {
  id: string;
  name: string;
  description: string;
  emitters: ParticleEmitterConfig[];
  duration: number;
  loop: boolean;
}

export class ParticleEmitter {
  private config: ParticleEmitterConfig;
  private particles: Particle[] = [];
  private lastEmissionTime = 0;
  private lastBurstTime = 0;
  private particlePool: ResourcePool<Particle>;

  constructor(config: ParticleEmitterConfig) {
    this.config = { ...config };
    this.particlePool = new ResourcePool<Particle>(
      () => this.createParticle(),
      (particle) => this.resetParticle(particle)
    );
  }

  private createParticle(): Particle {
    return {
      id: '',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      size: 0,
      color: [1, 1, 1, 1],
      rotation: 0,
      rotationSpeed: 0,
      scale: 1,
      opacity: 1,
      type: ParticleType.SPARK,
    };
  }

  private resetParticle(particle: Particle): void {
    particle.life = 0;
    particle.maxLife = 0;
    particle.x = 0;
    particle.y = 0;
    particle.vx = 0;
    particle.vy = 0;
    particle.data = undefined;
  }

  private emitParticle(): void {
    if (this.particles.length >= this.config.maxParticles) return;

    const particle = this.particlePool.acquire();
    
    // Initialize particle properties
    particle.id = `${this.config.id}-${Date.now()}-${Math.random()}`;
    particle.x = this.config.x;
    particle.y = this.config.y;
    particle.type = this.config.particleType;
    
    // Velocity with variance
    particle.vx = this.config.initialVelocity.x + 
      (Math.random() - 0.5) * this.config.velocityVariance.x;
    particle.vy = this.config.initialVelocity.y + 
      (Math.random() - 0.5) * this.config.velocityVariance.y;
    
    // Life
    particle.maxLife = this.config.particleLife + 
      (Math.random() - 0.5) * this.config.particleLifeVariance;
    particle.life = particle.maxLife;
    
    // Size
    particle.size = this.config.size + 
      (Math.random() - 0.5) * this.config.sizeVariance;
    
    // Color with variance
    particle.color = [
      Math.max(0, Math.min(1, this.config.color[0] + 
        (Math.random() - 0.5) * this.config.colorVariance[0])),
      Math.max(0, Math.min(1, this.config.color[1] + 
        (Math.random() - 0.5) * this.config.colorVariance[1])),
      Math.max(0, Math.min(1, this.config.color[2] + 
        (Math.random() - 0.5) * this.config.colorVariance[2])),
      Math.max(0, Math.min(1, this.config.color[3] + 
        (Math.random() - 0.5) * this.config.colorVariance[3])),
    ];
    
    // Rotation
    particle.rotation = Math.random() * Math.PI * 2;
    particle.rotationSpeed = (Math.random() - 0.5) * 0.1;
    
    // Initial scale and opacity
    particle.scale = 1;
    particle.opacity = this.config.fadeIn ? 0 : 1;
    
    // Type-specific initialization
    this.initializeParticleByType(particle);
    
    this.particles.push(particle);
  }

  private initializeParticleByType(particle: Particle): void {
    switch (particle.type) {
      case ParticleType.CODE_FRAGMENT:
        particle.data = {
          text: this.getRandomCodeFragment(),
          fontSize: particle.size,
        };
        break;
      
      case ParticleType.CURSOR:
        particle.data = {
          blinkRate: 0.5,
          blinkPhase: 0,
        };
        break;
      
      case ParticleType.HIGHLIGHT:
        particle.color[3] = 0.3; // Semi-transparent
        break;
      
      case ParticleType.MAGIC:
        particle.rotationSpeed = (Math.random() - 0.5) * 0.2;
        particle.data = {
          sparklePhase: Math.random() * Math.PI * 2,
        };
        break;
    }
  }

  private getRandomCodeFragment(): string {
    const fragments = [
      'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while',
      'return', 'class', 'import', 'export', 'async', 'await', 'try', 'catch',
      '{', '}', '(', ')', '[', ']', ';', ':', '=', '=>', '++', '--',
    ];
    return fragments[Math.floor(Math.random() * fragments.length)];
  }

  update(deltaTime: number): void {
    if (!this.config.enabled) return;

    const now = Date.now();
    
    // Emit particles
    if (this.config.burst) {
      // Burst emission
      if (now - this.lastBurstTime >= this.config.burst.interval) {
        for (let i = 0; i < this.config.burst.count; i++) {
          this.emitParticle();
        }
        this.lastBurstTime = now;
      }
    } else {
      // Continuous emission
      const emissionInterval = 1000 / this.config.emissionRate;
      if (now - this.lastEmissionTime >= emissionInterval) {
        this.emitParticle();
        this.lastEmissionTime = now;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update life
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        // Remove dead particle
        this.particles.splice(i, 1);
        this.particlePool.release(particle);
        continue;
      }
      
      // Update position
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      
      // Apply gravity
      particle.vx += this.config.gravity.x * deltaTime;
      particle.vy += this.config.gravity.y * deltaTime;
      
      // Update rotation
      particle.rotation += particle.rotationSpeed * deltaTime;
      
      // Update opacity based on life
      const lifeRatio = particle.life / particle.maxLife;
      
      if (this.config.fadeIn && lifeRatio > 0.8) {
        particle.opacity = (1 - lifeRatio) / 0.2;
      } else if (this.config.fadeOut && lifeRatio < 0.2) {
        particle.opacity = lifeRatio / 0.2;
      } else {
        particle.opacity = 1;
      }
      
      // Type-specific updates
      this.updateParticleByType(particle, deltaTime);
    }
  }

  private updateParticleByType(particle: Particle, deltaTime: number): void {
    switch (particle.type) {
      case ParticleType.CURSOR:
        if (particle.data) {
          particle.data.blinkPhase = (particle.data.blinkPhase as number) + deltaTime * (particle.data.blinkRate as number);
          particle.opacity = Math.sin(particle.data.blinkPhase as number) > 0 ? 1 : 0.3;
        }
        break;
      
      case ParticleType.MAGIC:
        if (particle.data) {
          particle.data.sparklePhase = (particle.data.sparklePhase as number) + deltaTime * 2;
          particle.scale = 1 + Math.sin(particle.data.sparklePhase as number) * 0.2;
        }
        break;
      
      case ParticleType.SMOKE:
        particle.scale += deltaTime * 0.5;
        particle.opacity *= 0.99;
        break;
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  updateConfig(config: Partial<ParticleEmitterConfig>): void {
    Object.assign(this.config, config);
  }

  getConfig(): ParticleEmitterConfig {
    return { ...this.config };
  }

  clear(): void {
    this.particles.forEach(particle => this.particlePool.release(particle));
    this.particles.length = 0;
  }

  dispose(): void {
    this.clear();
    this.particlePool.clear();
  }
}

export class ParticleSystem {
  private emitters: Map<string, ParticleEmitter> = new Map();
  private effects: Map<string, ParticleEffect> = new Map();
  private activeEffects: Map<string, { effect: ParticleEffect; startTime: number }> = new Map();

  addEmitter(config: ParticleEmitterConfig): ParticleEmitter {
    const emitter = new ParticleEmitter(config);
    this.emitters.set(config.id, emitter);
    return emitter;
  }

  removeEmitter(id: string): void {
    const emitter = this.emitters.get(id);
    if (emitter) {
      emitter.dispose();
      this.emitters.delete(id);
    }
  }

  getEmitter(id: string): ParticleEmitter | undefined {
    return this.emitters.get(id);
  }

  addEffect(effect: ParticleEffect): void {
    this.effects.set(effect.id, effect);
  }

  playEffect(effectId: string, x?: number, y?: number): void {
    const effect = this.effects.get(effectId);
    if (!effect) return;

    // Create emitters for this effect instance
    const instanceId = `${effectId}-${Date.now()}`;
    effect.emitters.forEach((emitterConfig, index) => {
      const config = { 
        ...emitterConfig, 
        id: `${instanceId}-${index}`,
        x: x !== undefined ? x : emitterConfig.x,
        y: y !== undefined ? y : emitterConfig.y,
      };
      this.addEmitter(config);
    });

    this.activeEffects.set(instanceId, {
      effect,
      startTime: Date.now(),
    });
  }

  update(deltaTime: number): void {
    // Update all emitters
    this.emitters.forEach(emitter => emitter.update(deltaTime));

    // Check for completed effects
    const now = Date.now();
    this.activeEffects.forEach((activeEffect, instanceId) => {
      const elapsed = now - activeEffect.startTime;
      
      if (!activeEffect.effect.loop && elapsed >= activeEffect.effect.duration) {
        // Remove emitters for completed effect
        activeEffect.effect.emitters.forEach((_, index) => {
          this.removeEmitter(`${instanceId}-${index}`);
        });
        this.activeEffects.delete(instanceId);
      }
    });
  }

  getAllParticles(): Particle[] {
    const allParticles: Particle[] = [];
    this.emitters.forEach(emitter => {
      allParticles.push(...emitter.getParticles());
    });
    return allParticles;
  }

  clear(): void {
    this.emitters.forEach(emitter => emitter.dispose());
    this.emitters.clear();
    this.activeEffects.clear();
  }

  dispose(): void {
    this.clear();
    this.effects.clear();
  }
}

// Predefined particle effects for code animations
export const CODE_ANIMATION_EFFECTS: ParticleEffect[] = [
  {
    id: 'code-typing',
    name: 'Code Typing',
    description: 'Particles that simulate typing code',
    duration: 2000,
    loop: false,
    emitters: [
      {
        id: 'typing-cursor',
        x: 0,
        y: 0,
        particleType: ParticleType.CURSOR,
        emissionRate: 1,
        maxParticles: 1,
        particleLife: 2000,
        particleLifeVariance: 0,
        initialVelocity: { x: 0, y: 0 },
        velocityVariance: { x: 0, y: 0 },
        gravity: { x: 0, y: 0 },
        size: 2,
        sizeVariance: 0,
        color: [1, 1, 1, 1],
        colorVariance: [0, 0, 0, 0],
        fadeIn: false,
        fadeOut: false,
        enabled: true,
      },
    ],
  },
  {
    id: 'code-highlight',
    name: 'Code Highlight',
    description: 'Highlight effect for code changes',
    duration: 1000,
    loop: false,
    emitters: [
      {
        id: 'highlight-glow',
        x: 0,
        y: 0,
        particleType: ParticleType.HIGHLIGHT,
        emissionRate: 10,
        maxParticles: 20,
        particleLife: 1000,
        particleLifeVariance: 200,
        initialVelocity: { x: 0, y: -10 },
        velocityVariance: { x: 20, y: 5 },
        gravity: { x: 0, y: 0 },
        size: 4,
        sizeVariance: 2,
        color: [1, 1, 0, 0.5],
        colorVariance: [0.2, 0.2, 0, 0.2],
        fadeIn: true,
        fadeOut: true,
        enabled: true,
      },
    ],
  },
  {
    id: 'magic-transform',
    name: 'Magic Transform',
    description: 'Magical transformation effect',
    duration: 3000,
    loop: false,
    emitters: [
      {
        id: 'magic-sparks',
        x: 0,
        y: 0,
        particleType: ParticleType.MAGIC,
        emissionRate: 15,
        maxParticles: 50,
        particleLife: 2000,
        particleLifeVariance: 500,
        initialVelocity: { x: 0, y: 0 },
        velocityVariance: { x: 50, y: 50 },
        gravity: { x: 0, y: 20 },
        size: 3,
        sizeVariance: 2,
        color: [0.8, 0.4, 1, 1],
        colorVariance: [0.2, 0.2, 0, 0],
        fadeIn: true,
        fadeOut: true,
        enabled: true,
      },
    ],
  },
];
