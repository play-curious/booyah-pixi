import * as chip from "booyah/dist/chip";
import * as util from "booyah/dist/util";
import * as PIXI from "pixi.js";
import * as _ from "underscore";

/** Returns the vector length of a a PIXI Point */
export function magnitude(a: PIXI.IPointData): number {
  return Math.sqrt(a.x * a.x + a.y * a.y);
}

/** Returns a copy of the PIXI Point x that has a magnitude between min and max */
export function clampMagnitude(
  a: PIXI.IPointData,
  min: number,
  max: number,
): PIXI.Point {
  const mag = magnitude(a);
  if (mag < min) {
    return multiply(a, min / mag);
  } else if (mag > max) {
    return multiply(a, max / mag);
  } else {
    return new PIXI.Point(a.x, a.y);
  }
}

/** Returns the distance between two PIXI Points */
export function distance(a: PIXI.IPointData, b: PIXI.IPointData): number {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return Math.sqrt(x * x + y * y);
}

/** Linear interpolation between points a and b, using the fraction p */
export function lerpPoint(
  a: PIXI.IPointData,
  b: PIXI.IPointData,
  p: number,
): PIXI.Point {
  const x = b.x - a.x;
  const y = b.y - a.y;
  return new PIXI.Point(a.x + p * x, a.y + p * y);
}

/** Returns the sum of PIXI points */
export function add(...points: PIXI.IPointData[]): PIXI.Point {
  const r = new PIXI.Point();
  for (const p of points) {
    r.x += p.x;
    r.y += p.y;
  }
  return r;
}

/** Returns the difference of PIXI points */
export function subtract(...points: PIXI.IPointData[]): PIXI.IPointData {
  const r = new PIXI.Point(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    r.x -= points[i].x;
    r.y -= points[i].y;
  }
  return r;
}

/** Returns the multiplication of a PIXI point by a scalar */
export function multiply(a: PIXI.IPointData, p: number): PIXI.Point {
  return new PIXI.Point(a.x * p, a.y * p);
}

/** Returns the division of a PIXI point by a scalar */
export function divide(a: PIXI.IPointData, p: number): PIXI.Point {
  return new PIXI.Point(a.x / p, a.y / p);
}

/** Returns a PIXI point with each element rounded down */
export function floor(p: PIXI.IPointData): PIXI.Point {
  return new PIXI.Point(Math.floor(p.x), Math.floor(p.y));
}

/** Returns a PIXI point with each element rounded */
export function round(p: PIXI.IPointData): PIXI.Point {
  return new PIXI.Point(Math.round(p.x), Math.round(p.y));
}

/** Returns a PIXI point that has the minimum of each component */
export function min(...points: PIXI.IPointData[]): PIXI.Point {
  const r = new PIXI.Point(Infinity, Infinity);
  for (const p of points) {
    r.x = Math.min(p.x, r.x);
    r.y = Math.min(p.y, r.y);
  }
  return r;
}

/** Returns a PIXI point that has the maximum of each component */
export function max(...points: PIXI.IPointData[]): PIXI.Point {
  const r = new PIXI.Point(-Infinity, -Infinity);
  for (const p of points) {
    r.x = Math.max(p.x, r.x);
    r.y = Math.max(p.y, r.y);
  }
  return r;
}

/** Returns true if the point p is between points min and max */
export function inRectangle(
  p: PIXI.IPointData,
  min: PIXI.IPointData,
  max: PIXI.IPointData,
) {
  return p.x >= min.x && p.x <= max.x && p.y >= min.y && p.y <= max.y;
}

/** Takes the mean of PIXI points */
export function average(...points: PIXI.IPointData[]): PIXI.Point {
  let sum = new PIXI.Point();
  for (const point of points) sum = add(sum, point);
  return divide(sum, points.length);
}

/**
 Returs a point along the line between a and b, moving at a given speed.
 Will not "overshoot" b.
 */
export function moveTowards(
  a: PIXI.IPointData,
  b: PIXI.IPointData,
  speed: number,
): PIXI.Point {
  const d = distance(a, b);
  return lerpPoint(a, b, util.clamp(speed / d, 0, 1));
}

export const moveTowardsPoint = moveTowards;

/** Returns a random point between a amd b, with each component considered separately */
export function randomPointInRange(
  min: PIXI.IPointData,
  max: PIXI.IPointData,
): PIXI.Point {
  return new PIXI.Point(
    util.randomInRange(min.x, max.x),
    util.randomInRange(min.y, max.y),
  );
}

/** Creates a vector pointing in the direction angle, with the length magnitude */
export function vectorFromAngle(angle: number, magnitude = 1): PIXI.IPointData {
  return new PIXI.Point(
    Math.cos(angle) * magnitude,
    Math.sin(angle) * magnitude,
  );
}

/* Returns true if point is within distance d of otherPoints */
export function withinDistanceOfPoints(
  point: PIXI.IPointData,
  d: number,
  otherPoints: PIXI.IPointData[],
): boolean {
  for (const otherPoint of otherPoints) {
    if (distance(point, otherPoint) <= d) return true;
  }
  return false;
}

interface PixiAppChipOptions {
  /* Provide either a parent element or a canvas */
  parentElement?: HTMLElement;
  canvas?: PIXI.ICanvas;

  appOptions?: Partial<PIXI.IApplicationOptions & PIXI.IRendererOptions>;
}

export class PixiAppChip extends chip.Composite {
  private _pixiApplication: PIXI.Application;

  constructor(private readonly _options?: PixiAppChipOptions) {
    super();
  }

  protected _onActivate(): void {
    const appOptions = this._options?.appOptions || {};
    appOptions.autoStart = false;
    if (this._options.canvas) {
      appOptions.view = this._options.canvas;
    }

    this._pixiApplication = new PIXI.Application(appOptions);
    if (!this._options.canvas) {
      const parent = this._options?.parentElement || document.body;
      parent.appendChild(this._pixiApplication.view as unknown as Node);
    }

    this._subscribe(window, "resize", this._onResize);
  }

  protected _onTick(): void {
    this._pixiApplication.render();
  }

  protected _onTerminate(): void {
    this._pixiApplication.destroy(true);
  }

  get contextModification(): chip.ChipContextResolvable {
    return {
      pixiAppChip: this,
      pixiApplication: this._pixiApplication,
      container: this._pixiApplication.stage,
    };
  }

  private _onResize() {
    this.emit("resize");
  }

  get renderSize() {
    const renderer = this._pixiApplication.renderer;
    return new PIXI.Point(renderer.width, renderer.height);
  }

  get pixiApplication() {
    return this._pixiApplication;
  }
}

/** Options provided to all the value functions on resize */
export interface DisplayObjectValueFunctionOptions<
  DisplayObjectType extends PIXI.DisplayObject,
> {
  displayObject: DisplayObjectType;
  pixiAppChip: PixiAppChip;
  renderSize: PIXI.IPointData;
}

/**
 * The acceptable values for the property.
 * Points can be set with a single number.
 */
export type DisplayObjectValueType<
  DisplayObjectType extends PIXI.DisplayObject,
  Property extends keyof DisplayObjectType,
> = DisplayObjectType[Property] extends PIXI.ObservablePoint
  ? PIXI.IPointData | number
  : DisplayObjectType[Property];

export type DisplayObjectValueFunction<
  DisplayObjectType extends PIXI.DisplayObject,
  Property extends keyof DisplayObjectType,
> = (
  options: DisplayObjectValueFunctionOptions<DisplayObjectType>,
) => DisplayObjectValueType<DisplayObjectType, Property>;

export type DisplayObjectValueResolvable<
  DisplayObjectType extends PIXI.DisplayObject,
  Property extends keyof DisplayObjectType,
> =
  | DisplayObjectValueType<DisplayObjectType, Property>
  | DisplayObjectValueFunction<DisplayObjectType, Property>;

export function isDisplayObjectValueFunction<
  DisplayObjectType extends PIXI.DisplayObject,
  Property extends keyof DisplayObjectType,
>(
  resolvable: DisplayObjectValueResolvable<DisplayObjectType, Property>,
): resolvable is DisplayObjectValueFunction<DisplayObjectType, Property> {
  return typeof resolvable === "function";
}

export type DisplayObjectProperties<
  DisplayObjectType extends PIXI.DisplayObject,
> = {
  [Property in keyof DisplayObjectType]?: DisplayObjectValueResolvable<
    DisplayObjectType,
    Property
  >;
};

export class DisplayObjectChipOptions<
  DisplayObjectType extends PIXI.DisplayObject,
> {
  properties?: DisplayObjectProperties<DisplayObjectType> = {};
  onResize?: (
    options: DisplayObjectValueFunctionOptions<DisplayObjectType>,
  ) => unknown;
  addToContainer = true;
}

export class DisplayObjectChip<
  DisplayObjectType extends PIXI.DisplayObject,
> extends chip.ChipBase {
  private readonly _options: DisplayObjectChipOptions<DisplayObjectType>;

  private _propertiesToUpdateOnResize: Array<keyof DisplayObjectType>;

  constructor(
    public readonly displayObject: DisplayObjectType,
    options?: Partial<DisplayObjectChipOptions<DisplayObjectType>>,
  ) {
    super();

    this._options = chip.fillInOptions(
      options,
      new DisplayObjectChipOptions<DisplayObjectType>(),
    );
  }

  _onActivate() {
    this._propertiesToUpdateOnResize = [];

    const valueFunctionOptions = {
      displayObject: this.displayObject,
      pixiAppChip: this.pixiAppChip,
      renderSize: this.pixiAppChip.renderSize,
    };

    for (const property in this._options.properties) {
      const resolvable = this._options.properties[
        property
      ] as DisplayObjectValueResolvable<
        DisplayObjectType,
        keyof DisplayObjectType
      >;
      let value: DisplayObjectValueType<
        DisplayObjectType,
        keyof DisplayObjectType
      >;
      if (isDisplayObjectValueFunction(resolvable)) {
        this._propertiesToUpdateOnResize.push(property);
        value = (
          resolvable as DisplayObjectValueFunction<
            DisplayObjectType,
            keyof DisplayObjectType
          >
        )(valueFunctionOptions);
      } else {
        value = resolvable;
      }

      updateProperty(
        this.displayObject,
        property as keyof DisplayObjectType,
        value,
      );
    }

    if (
      !this._options.hasOwnProperty("addToContainer") ||
      this._options.addToContainer
    ) {
      this._chipContext.container.addChild(this.displayObject);
    }

    this._options.onResize?.({
      displayObject: this.displayObject,
      pixiAppChip: this.pixiAppChip,
      renderSize: this.pixiAppChip.renderSize,
    });

    this._subscribe(this.pixiAppChip, "resize", this._onResize);
  }

  _onTerminate() {
    if (
      !this._options.hasOwnProperty("addToContainer") ||
      this._options.addToContainer
    ) {
      this._chipContext.container.removeChild(this.displayObject);
    }
  }

  private _onResize() {
    const valueFunctionOptions = {
      displayObject: this.displayObject,
      pixiAppChip: this.pixiAppChip,
      renderSize: this.pixiAppChip.renderSize,
    };

    for (const property of this._propertiesToUpdateOnResize) {
      const f = this._options.properties[
        property
      ] as DisplayObjectValueFunction<
        DisplayObjectType,
        keyof DisplayObjectType
      >;
      const value = f(valueFunctionOptions);
      updateProperty(this.displayObject, property, value);
    }
  }

  get pixiAppChip() {
    return this._chipContext.pixiAppChip;
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
  // If provided, will calculate the animation speed to achieve this number of frames-per-second
  fps?: number;
  startingFrame?: number;
  prepare?: boolean;

  properties: DisplayObjectProperties<PIXI.AnimatedSprite> = {};
  onResize?: (
    options: DisplayObjectValueFunctionOptions<PIXI.AnimatedSprite>,
  ) => unknown;
}

export class AnimatedSpriteChip extends chip.ChipBase {
  private readonly _options: AnimatedSpriteChipOptions;

  private _animatedSprite?: PIXI.AnimatedSprite;
  private _wasPlaying: boolean;
  private _wasAdded?: boolean;
  private _propertiesToUpdateOnResize: Array<keyof PIXI.AnimatedSprite>;

  constructor(
    private readonly _spritesheet: PIXI.Spritesheet,
    options?: Partial<AnimatedSpriteChipOptions>,
  ) {
    super();

    this._options = chip.fillInOptions(
      options,
      new AnimatedSpriteChipOptions(),
    );
  }

  _onActivate() {
    this._wasPlaying = false;

    let textures: PIXI.Texture[];
    if (this._options.animationName) {
      // Use the specified animation
      if (
        !_.has(this._spritesheet.data.animations, this._options.animationName)
      ) {
        throw new Error(
          `Can't find animation "${this._options.animationName}" in spritesheet`,
        );
      }

      if (this._spritesheet.linkedSheets.length === 0) {
        // PIXI will have loaded the textures directly into the spritesheet object
        textures = this._spritesheet.animations[this._options.animationName];
      } else {
        // Assemble textures from the linked sheets
        const allSheets = [
          this._spritesheet,
          ...this._spritesheet.linkedSheets,
        ];
        textures = this._spritesheet.data.animations![
          this._options.animationName
        ].map((imageName) => {
          // Linear search for the texture
          for (const sheet of allSheets) {
            if (imageName in sheet.textures) return sheet.textures[imageName];
          }

          throw new Error(
            `Cannot find image "${imageName}" needed for animation "${this._options.animationName}"`,
          );
        });
      }
    } else {
      // Take all the textures in the sheet
      textures = Object.values(this._spritesheet.textures);
    }

    // Don't have the sprite auto-update
    this._animatedSprite = new PIXI.AnimatedSprite(textures, false);

    // Update properties and keep track of which ones to update on resize
    this._propertiesToUpdateOnResize = [];

    const valueFunctionOptions = {
      displayObject: this._animatedSprite,
      pixiAppChip: this.pixiAppChip,
      renderSize: this.pixiAppChip.renderSize,
    };
    for (const property in this._options.properties) {
      const resolvable = this._options.properties[
        property as keyof PIXI.AnimatedSprite
      ] as DisplayObjectValueResolvable<
        PIXI.AnimatedSprite,
        keyof PIXI.AnimatedSprite
      >;
      let value: DisplayObjectValueType<
        PIXI.AnimatedSprite,
        keyof PIXI.AnimatedSprite
      >;
      if (isDisplayObjectValueFunction(resolvable)) {
        this._propertiesToUpdateOnResize.push(
          property as keyof PIXI.AnimatedSprite,
        );
        value = (
          resolvable as DisplayObjectValueFunction<
            PIXI.AnimatedSprite,
            keyof PIXI.AnimatedSprite
          >
        )(valueFunctionOptions);
      } else {
        value = resolvable;
      }

      updateProperty(
        this._animatedSprite,
        property as keyof PIXI.AnimatedSprite,
        value,
      );
    }

    // If requested, use the PIXI Prepare plugin to make sure the animation is loaded before adding it to the stage
    if (this._options.prepare) {
      this._wasAdded = false;
      this._chipContext.pixiApplication.renderer.prepare.upload(
        this._animatedSprite,
        () => {
          if (this.chipState === "inactive") return;

          this._chipContext.container.addChild(this._animatedSprite);
          this._wasAdded = true;
        },
      );
    } else {
      this._chipContext.container.addChild(this._animatedSprite);
      this._wasAdded = true;
    }

    this._chipContext.container.addChild(this._animatedSprite);

    if (this._options.behaviorOnComplete == "loop") {
      this._animatedSprite.loop = true;
    } else if (this._options.behaviorOnComplete == "keepLastFrame") {
      // PIXI.AnimatedSprite loops by default
      this._animatedSprite.loop = false;
    } else if (this._options.behaviorOnComplete == "remove") {
      // PIXI.AnimatedSprite loops by default
      this._animatedSprite.loop = false;
      this._animatedSprite.onComplete = this._onAnimationComplete.bind(this);
    }

    if ("fps" in this._options) {
      this._animatedSprite.animationSpeed = this._options.fps / 1000;
    }

    this._animatedSprite.gotoAndStop(this._options.startingFrame ?? 0);

    if (this._options.behaviorOnStart == "play") {
      this._animatedSprite.play();
    }

    this._options.onResize?.({
      displayObject: this._animatedSprite,
      pixiAppChip: this.pixiAppChip,
      renderSize: this.pixiAppChip.renderSize,
    });

    this._subscribe(this.pixiAppChip, "resize", this._onResize);
  }

  _onTick() {
    this._animatedSprite!.update(this._lastTickInfo.timeSinceLastTick);
  }

  protected _onPause(): void {
    this._wasPlaying = this._animatedSprite!.playing;
    this._animatedSprite!.stop();
  }

  protected _onResume(): void {
    if (this._wasPlaying) this._animatedSprite!.play();
  }

  _onTerminate() {
    if (this._wasAdded) {
      this._chipContext.container.removeChild(this._animatedSprite);
      this._wasAdded = false;
    }
    delete this._animatedSprite;
  }

  private _onAnimationComplete() {
    this._terminateSelf();
  }

  private _onResize() {
    const valueFunctionOptions = {
      displayObject: this._animatedSprite,
      pixiAppChip: this.pixiAppChip,
      renderSize: this.pixiAppChip.renderSize,
    };

    for (const property of this._propertiesToUpdateOnResize) {
      const f = this._options.properties[
        property
      ] as DisplayObjectValueFunction<
        PIXI.AnimatedSprite,
        keyof PIXI.AnimatedSprite
      >;
      const value = f(valueFunctionOptions);
      updateProperty(this.animatedSprite, property, value);
    }
  }

  get animatedSprite() {
    return this._animatedSprite;
  }

  get pixiAppChip() {
    return this._chipContext.pixiAppChip;
  }
}

export interface LoaderOptions {
  initOptions?: PIXI.AssetInitOptions;
  bundlesToLoad?: string[];
  bundlesToBackgroundLoad?: string[];
}

export class Loader extends chip.Composite {
  constructor(private readonly _options: LoaderOptions = {}) {
    super();
  }

  protected _onActivate(): void {
    this._startLoading();
  }

  private async _startLoading() {
    if (this._options.initOptions) {
      await PIXI.Assets.init(this._options.initOptions);
    }

    if (this._options.bundlesToLoad) {
      await PIXI.Assets.loadBundle(
        this._options.bundlesToLoad,
        this._onProgress.bind(this),
      );
    }

    if (this._options.bundlesToBackgroundLoad) {
      PIXI.Assets.loadBundle(this._options.bundlesToLoad);
    }

    this._terminateSelf();
  }

  private _onProgress(progress: number) {
    this.emit("progress", progress);
  }
}

function updateProperty<
  DisplayObjectType extends PIXI.DisplayObject,
  Property extends keyof DisplayObjectType,
>(
  displayObject: DisplayObjectType,
  property: Property,
  value: DisplayObjectValueType<DisplayObjectType, Property>,
) {
  if (displayObject[property] instanceof PIXI.ObservablePoint) {
    if (typeof value === "number") {
      (displayObject[property] as PIXI.ObservablePoint).set(value as number);
    } else {
      // Assume it's a point
      (displayObject[property] as PIXI.ObservablePoint).copyFrom(
        value as PIXI.IPointData,
      );
    }
  } else {
    // @ts-ignore
    displayObject[property] = value;
  }
}
