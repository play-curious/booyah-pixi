import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as chip from "booyah/src/chip";
import * as util from "booyah/src/util";

/** Returns the vector length of a a PIXI Point */
export function magnitude(a: PIXI.Point): number {
  return Math.sqrt(a.x * a.x + a.y * a.y);
}

/** Returns a copy of the PIXI Point x that has a magnitude between min and max */
export function clampMagnitude(
  a: PIXI.Point,
  min: number,
  max: number
): PIXI.Point {
  const mag = magnitude(a);
  if (mag < min) {
    return multiply(a, min / mag);
  } else if (mag > max) {
    return multiply(a, max / mag);
  } else {
    return a;
  }
}

/** Returns the distance between two PIXI Points */
export function distance(a: PIXI.Point, b: PIXI.Point): number {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return Math.sqrt(x * x + y * y);
}

/** Linear interpolation between points a and b, using the fraction p */
export function lerpPoint(a: PIXI.Point, b: PIXI.Point, p: number): PIXI.Point {
  const x = b.x - a.x;
  const y = b.y - a.y;
  return new PIXI.Point(a.x + p * x, a.y + p * y);
}

/** Returns the sum of PIXI points */
export function add(...points: PIXI.Point[]): PIXI.Point {
  const r = new PIXI.Point();
  for (const p of points) {
    r.x += p.x;
    r.y += p.y;
  }
  return r;
}

/** Returns the difference of PIXI points */
export function subtract(...points: PIXI.Point[]): PIXI.Point {
  const r = new PIXI.Point(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    r.x -= points[i].x;
    r.y -= points[i].y;
  }
  return r;
}

/** Returns the multiplication of a PIXI point by a scalar */
export function multiply(a: PIXI.Point, p: number): PIXI.Point {
  return new PIXI.Point(a.x * p, a.y * p);
}

/** Returns the division of a PIXI point by a scalar */
export function divide(a: PIXI.Point, p: number): PIXI.Point {
  return new PIXI.Point(a.x / p, a.y / p);
}

/** Returns a PIXI point with each element rounded down */
export function floor(p: PIXI.Point): PIXI.Point {
  return new PIXI.Point(Math.floor(p.x), Math.floor(p.y));
}

/** Returns a PIXI point with each element rounded */
export function round(p: PIXI.Point): PIXI.Point {
  return new PIXI.Point(Math.round(p.x), Math.round(p.y));
}

/** Returns a PIXI point that has the minimum of each component */
export function min(...points: PIXI.Point[]): PIXI.Point {
  const r = new PIXI.Point(Infinity, Infinity);
  for (const p of points) {
    r.x = Math.min(p.x, r.x);
    r.y = Math.min(p.y, r.y);
  }
  return r;
}

/** Returns a PIXI point that has the maximum of each component */
export function max(...points: PIXI.Point[]): PIXI.Point {
  const r = new PIXI.Point(-Infinity, -Infinity);
  for (const p of points) {
    r.x = Math.max(p.x, r.x);
    r.y = Math.max(p.y, r.y);
  }
  return r;
}

/** Returns true if the point p is between points min and max */
export function inRectangle(p: PIXI.Point, min: PIXI.Point, max: PIXI.Point) {
  return p.x >= min.x && p.x <= max.x && p.y >= min.y && p.y <= max.y;
}

/** Takes the mean of PIXI points */
export function average(...points: PIXI.Point[]): PIXI.Point {
  let sum = new PIXI.Point();
  for (const point of points) sum = add(sum, point);
  return divide(sum, points.length);
}

/**
 Returs a point along the line between a and b, moving at a given speed.
 Will not "overshoot" b.
 */
export function moveTowards(
  a: PIXI.Point,
  b: PIXI.Point,
  speed: number
): PIXI.Point {
  const d = distance(a, b);
  return lerpPoint(a, b, util.clamp(speed / d, 0, 1));
}

export const moveTowardsPoint = moveTowards;

/** Returns a random point between a amd b, with each component considered separately */
export function randomPointInRange(
  min: PIXI.Point,
  max: PIXI.Point
): PIXI.Point {
  return new PIXI.Point(
    util.randomInRange(min.x, max.x),
    util.randomInRange(min.y, max.y)
  );
}

/** Creates a vector pointing in the direction angle, with the length magnitude */
export function vectorFromAngle(angle: number, magnitude = 1): PIXI.Point {
  return new PIXI.Point(
    Math.cos(angle) * magnitude,
    Math.sin(angle) * magnitude
  );
}

/* Returns true if point is within distance d of otherPoints */
export function withinDistanceOfPoints(
  point: PIXI.Point,
  d: number,
  otherPoints: PIXI.Point[]
): boolean {
  for (const otherPoint of otherPoints) {
    if (distance(point, otherPoint) <= d) return true;
  }
  return false;
}

export class DisplayObjectChip<
  DisplayObjectType extends PIXI.DisplayObject
> extends chip.ChipBase {
  constructor(public readonly displayObject: DisplayObjectType) {
    super();
  }

  _onActivate() {
    this._chipContext.container.addChild(this.displayObject);
  }

  _onTerminate() {
    this._chipContext.container.removeChild(this.displayObject);
  }
}

/** 
  Manages an animated sprite in PIXI, pausing the sprite during pauses.

  When the animation completes (if the animation is not set to loop, then this will request a signal)

 Emits:
 - beforeTearDown
*/
export class AnimatedSpriteChipOptions {
  behaviorOnComplete: "loop" | "remove" | "keepLastFrame" = "remove";
  behaviorOnStart: "play" | "stop" = "play";
  animationName?: string;
  animationSpeed?: number;
  position?: PIXI.IPointData | number;
  anchor?: PIXI.IPointData | number;
  scale?: PIXI.IPointData | number;
  rotation?: number;
  alpha?: number;
  startingFrame?: number;
}

export class AnimatedSpriteChip extends chip.ChipBase {
  private _options: AnimatedSpriteChipOptions;

  private _pixiSprite: PIXI.AnimatedSprite;
  private _wasPlaying: boolean;

  constructor(
    private readonly _spritesheet: PIXI.Spritesheet,
    options?: Partial<AnimatedSpriteChipOptions>
  ) {
    super();

    this._options = chip.fillInOptions(
      options,
      new AnimatedSpriteChipOptions()
    );
  }

  _onActivate() {
    this._wasPlaying = false;

    let textures: PIXI.Texture[];
    if (this._options.animationName) {
      // Use the specified animation
      if (!_.has(this._spritesheet.animations, this._options.animationName)) {
        throw new Error(
          `Can't find animation "${this._options.animationName}" in spritesheet`
        );
      }

      textures = this._spritesheet.animations[this._options.animationName];
    } else {
      // Take all the textures in the sheet
      textures = Object.values(this._spritesheet.textures);
    }

    this._pixiSprite = new PIXI.AnimatedSprite(textures, false);
    this._chipContext.container.addChild(this._pixiSprite);

    if (this._options.behaviorOnComplete == "loop") {
      this._pixiSprite.loop = true;
    } else if (this._options.behaviorOnComplete == "keepLastFrame") {
      // PIXI.AnimatedSprite loops by default
      this._pixiSprite.loop = false;
    } else if (this._options.behaviorOnComplete == "remove") {
      // PIXI.AnimatedSprite loops by default
      this._pixiSprite.loop = false;
      this._pixiSprite.onComplete = this._onAnimationComplete.bind(this);
    }

    // Set numerical properties
    for (const prop of ["animationSpeed", "rotation", "alpha"]) {
      // @ts-ignore
      if (_.has(this._options, prop))
        // @ts-ignore
        this._pixiSprite[prop] = this._options[prop];
    }

    // Set Point properties
    for (const prop of ["position", "anchor", "scale"]) {
      // @ts-ignore
      if (_.has(this._options, prop)) {
        // @ts-ignore
        const value = this._options[prop];
        if (typeof value === "number") {
          // @ts-ignore
          this._pixiSprite[prop].set(value);
        } else {
          // @ts-ignore
          this._pixiSprite[prop] = value;
        }
      }
    }

    this._pixiSprite.gotoAndStop(this._options.startingFrame ?? 0);

    if (this._options.behaviorOnStart == "play") {
      this._pixiSprite.play();
    }
  }

  _onTick() {
    this._pixiSprite.update(this._lastTickInfo.timeSinceLastTick);
  }

  protected _onPause(): void {
    this._wasPlaying = this._pixiSprite.playing;
    this._pixiSprite.stop();
  }

  protected _onResume(): void {
    if (this._wasPlaying) this._pixiSprite.play();
  }

  _onTerminate() {
    this._chipContext.container.removeChild(this._pixiSprite);
    delete this._pixiSprite;
  }

  private _onAnimationComplete() {
    this._outputSignal = chip.makeSignal();
  }

  get pixiSprite() {
    return this._pixiSprite;
  }
}
