/**
 * A tiny 1D spring in Apple's terms (damping ratio + response), per the apple-design skill §4.
 *
 * - Always animates from the current (presentation) value, so it can be interrupted
 *   and re-targeted at any moment without a jump (§3).
 * - Re-targeting keeps the current velocity, so reversals blend instead of hitting a wall.
 * - Accepts an initial velocity for drag → animation handoff (§5).
 */
export interface SpringOptions {
  /** 1 = critically damped (no overshoot); < 1 bounces. */
  damping?: number;
  /** Seconds to (roughly) reach the target. Not a duration. */
  response?: number;
}

export class Spring {
  value: number;
  velocity = 0;
  target: number;
  private damping = 1;
  private response = 0.35;
  private frame = 0;
  private last = 0;

  constructor(
    initial: number,
    private onUpdate: (value: number) => void,
  ) {
    this.value = initial;
    this.target = initial;
  }

  /** Jump without animating (drag tracking, reduced motion). Kills velocity. */
  set(value: number) {
    this.stop();
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.onUpdate(value);
  }

  /** Spring to `target` from wherever the value is right now. */
  to(target: number, opts: SpringOptions & { velocity?: number } = {}) {
    this.target = target;
    this.damping = opts.damping ?? 1;
    this.response = opts.response ?? 0.35;
    if (opts.velocity !== undefined) this.velocity = opts.velocity;
    if (!this.frame) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  stop() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  get animating() {
    return this.frame !== 0;
  }

  private tick = (now: number) => {
    // Clamp dt so a background tab doesn't explode the integration.
    let dt = Math.min((now - this.last) / 1000, 1 / 30);
    this.last = now;
    // Apple's response/damping → stiffness/damping coefficient with unit mass.
    const stiffness = Math.pow((2 * Math.PI) / this.response, 2);
    const friction = (4 * Math.PI * this.damping) / this.response;
    const step = 1 / 240;
    while (dt > 0) {
      const h = Math.min(step, dt);
      const force = -stiffness * (this.value - this.target) - friction * this.velocity;
      this.velocity += force * h;
      this.value += this.velocity * h;
      dt -= h;
    }
    if (Math.abs(this.value - this.target) < 0.0005 && Math.abs(this.velocity) < 0.005) {
      this.value = this.target;
      this.velocity = 0;
      this.frame = 0;
      this.onUpdate(this.value);
      return;
    }
    this.onUpdate(this.value);
    this.frame = requestAnimationFrame(this.tick);
  };
}

/** Apple's momentum projection (§6): where a flick would come to rest. */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past a boundary (§9). */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
