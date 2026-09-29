export interface SandPoint { x: number; y: number }
export const SAND_WRITING_LIFETIME = 7;
const MAX_POINTS = 8192;
const MAX_STROKES = 128;

/** Normalized pond coordinates keep handwriting in place when the view resizes.
 * The entire inscription lasts seven wall-clock seconds after the last mark.
 */
export class SandWriting {
  public strokes: SandPoint[][] = [];
  public revision = 0;
  private active: SandPoint[] | null = null;
  private lastMark = -Infinity;
  private pointCount = 0;

  public begin(point: SandPoint, now: number): void {
    this.expire(now);
    this.active = [];
    this.strokes.push(this.active);
    this.append(point, now);
  }

  public append(point: SandPoint, now: number): void {
    if (!this.active || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    this.active.push({ x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)) });
    this.pointCount++;
    this.lastMark = now;
    while ((this.pointCount > MAX_POINTS || this.strokes.length > MAX_STROKES) && this.strokes.length > 1) {
      this.pointCount -= this.strokes.shift()!.length;
    }
    if (this.active.length > MAX_POINTS) {
      this.active.shift();
      this.pointCount--;
    }
    this.revision++;
  }

  public end(): void { this.active = null; }

  public expire(now: number): void {
    if (this.strokes.length && now - this.lastMark >= SAND_WRITING_LIFETIME) this.clear();
  }

  public clear(): void {
    this.strokes = [];
    this.active = null;
    this.pointCount = 0;
    this.revision++;
  }
}
