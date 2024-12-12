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

export type LayoutProperty =
  | "minWidth"
  | "minHeight"
  | "idealWidth"
  | "idealHeight"
  | "maxWidth"
  | "maxHeight";

export type StaticLayoutValue = number | LayoutProperty;

export interface RenderInfo {
  renderSize: PIXI.IPointData;
}

export interface DynamicLayoutValueOptions extends RenderInfo {
  layoutOptions: Partial<LayoutOptions>;
  layoutItem: LayoutItem;
}

export type DynamicLayoutItemValue = (
  options: DynamicLayoutValueOptions,
) => StaticLayoutValue;

export type LayoutValue = StaticLayoutValue | DynamicLayoutItemValue;

export class LayoutOptions {
  minWidth: LayoutValue;
  minHeight: LayoutValue;

  idealWidth: LayoutValue;
  idealHeight: LayoutValue;

  maxWidth: LayoutValue;
  maxHeight: LayoutValue;

  paddingLeft: LayoutValue = 0;
  paddingRight: LayoutValue = 0;
  paddingTop: LayoutValue = 0;
  paddingBottom: LayoutValue = 0;
}

function safeParseLayoutProperty(
  layoutItem: LayoutItem,
  layoutOptions: Partial<LayoutOptions>,
  prop: keyof LayoutOptions,
  renderInfo: RenderInfo,
): number {
  return parseLayoutProperty(layoutItem, layoutOptions, prop, renderInfo) || 0;
}

// Parses a property in the layout item options as a number
function parseLayoutProperty(
  layoutItem: LayoutItem,
  layoutOptions: Partial<LayoutOptions>,
  prop: keyof LayoutOptions,
  renderInfo: RenderInfo,
): number | undefined {
  const propValue = layoutOptions[prop] as LayoutValue;

  // If property doesn't exist, return undefined
  if (typeof propValue === "undefined") return;

  // If property is a number, return it directly
  if (typeof propValue === "number") return propValue as number;

  // If property is a function (dynamic) call it and parse the result
  if (typeof propValue === "function") {
    const evaluatedValue = (propValue as DynamicLayoutItemValue)({
      layoutOptions: layoutOptions,
      layoutItem,
      ...renderInfo,
    });
    if (typeof evaluatedValue === "undefined") return 0;
    if (typeof evaluatedValue === "number") return evaluatedValue as number;
  }

  // Find matching property and return it
  const matchingProp = propValue as LayoutProperty;
  const matchingValue = layoutItem[matchingProp];
  if (typeof matchingValue !== "number") {
    throw new Error(
      `LayoutItem referencing property ${matchingProp} which is not a number. Value: ${matchingValue}`,
    );
  }

  return matchingValue;
}

export type LayoutItemChildChipOptions = Array<
  chip.ActivateChildChipOptions | chip.ChipResolvable
>;

export class Bounds {
  static fromRectangle(rect: PIXI.Rectangle) {
    return new Bounds(rect.x, rect.y, rect.width, rect.height);
  }

  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly width?: number,
    public readonly height?: number,
  ) {}

  isBoundedHorizontally() {
    return typeof this.width !== "undefined";
  }

  isBoundedVertically() {
    return typeof this.height !== "undefined";
  }
}

export interface RefreshInfo {
  readonly absoluteBounds: Bounds;
  readonly localBounds: Bounds;
}

/**
 * Emits:
 *  - updated() - something changed, requesting an update
 *  - willRefresh(RefreshInfo)
 *  - didRefresh(RefreshInfo)
 */
export interface LayoutItem extends chip.NodeEventSource {
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly idealWidth?: number;
  readonly idealHeight?: number;
  readonly maxWidth?: number;
  readonly maxHeight?: number;

  prepareRefresh(renderInfo: RenderInfo): void;
  refresh(refreshInfo: RefreshInfo): void;

  addChildLayoutItem(child: LayoutItem): void;
  removeChildLayoutItem(child: LayoutItem): void;
}

export abstract class LayoutItemBase
  extends chip.Parallel
  implements LayoutItem
{
  protected abstract _layoutOptions: LayoutOptions;

  protected _lastRenderInfo?: RenderInfo;
  protected _lastRefreshInfo?: RefreshInfo;

  constructor(childChipOptions: LayoutItemChildChipOptions = []) {
    super(childChipOptions, { terminateOnCompletion: false });
  }

  addChildLayoutItem(child: LayoutItem): void {
    throw new Error(`${this.constructor.name} can't have child display items`);
  }

  removeChildLayoutItem(child: LayoutItem): void {
    throw new Error(`${this.constructor.name}  can't have child display items`);
  }

  prepareRefresh(renderInfo: RenderInfo): void {
    this._lastRenderInfo = renderInfo;
    this._onPrepareRefresh();
    // TODO: emit event?
  }

  protected _onPrepareRefresh() {
    // no op
  }

  protected _onRefresh(): void {
    // no op
  }

  refresh(refreshInfo: RefreshInfo): void {
    this._lastRefreshInfo = refreshInfo;
    this.emit("willRefresh", refreshInfo);

    if (
      typeof this.minWidth !== "undefined" &&
      typeof refreshInfo.absoluteBounds.width !== "undefined" &&
      refreshInfo.absoluteBounds.width < this.minWidth
    )
      console.error(
        `Insufficient width to layout item. Bounds.width = ${refreshInfo.absoluteBounds.width} and minWidth = ${this.minWidth}`,
      );
    if (
      typeof this.minHeight !== "undefined" &&
      typeof refreshInfo.absoluteBounds.height !== "undefined" &&
      refreshInfo.absoluteBounds.height < this.minHeight
    )
      console.error(
        `Insufficient height to layout item. Bounds.height = ${refreshInfo.absoluteBounds.height} and minHeight = ${this.minHeight}`,
      );

    this._onRefresh();

    this.emit("didRefresh", refreshInfo);
  }

  calculateInnerBounds(bounds: Bounds) {
    return new Bounds(
      bounds.x + this.paddingLeft,
      bounds.y + this.paddingTop,
      bounds.isBoundedHorizontally()
        ? bounds.width - this.paddingLeft - this.paddingRight
        : undefined,
      bounds.isBoundedHorizontally()
        ? bounds.height - this.paddingTop - this.paddingBottom
        : undefined,
    );
  }

  get minWidth(): number | undefined {
    return parseLayoutProperty(
      this,
      this._layoutOptions,
      "minWidth",
      this._lastRenderInfo,
    );
  }
  get minHeight(): number | undefined {
    return parseLayoutProperty(
      this,
      this._layoutOptions,
      "minHeight",
      this._lastRenderInfo,
    );
  }

  get idealWidth(): number | undefined {
    return parseLayoutProperty(
      this,
      this._layoutOptions,
      "idealWidth",
      this._lastRenderInfo,
    );
  }
  get idealHeight(): number | undefined {
    return parseLayoutProperty(
      this,
      this._layoutOptions,
      "idealHeight",
      this._lastRenderInfo,
    );
  }

  get maxWidth(): number | undefined {
    return parseLayoutProperty(
      this,
      this._layoutOptions,
      "maxWidth",
      this._lastRenderInfo,
    );
  }
  get maxHeight(): number | undefined {
    return parseLayoutProperty(
      this,
      this._layoutOptions,
      "maxHeight",
      this._lastRenderInfo,
    );
  }

  get paddingLeft(): number {
    return safeParseLayoutProperty(
      this,
      this._layoutOptions,
      "paddingLeft",
      this._lastRenderInfo,
    );
  }
  get paddingRight(): number {
    return safeParseLayoutProperty(
      this,
      this._layoutOptions,
      "paddingRight",
      this._lastRenderInfo,
    );
  }
  get paddingTop(): number {
    return safeParseLayoutProperty(
      this,
      this._layoutOptions,
      "paddingTop",
      this._lastRenderInfo,
    );
  }
  get paddingBottom(): number {
    return safeParseLayoutProperty(
      this,
      this._layoutOptions,
      "paddingBottom",
      this._lastRenderInfo,
    );
  }

  /** Request a new refresh cycle */
  requestRefresh() {
    this.emit("updated");
  }

  get layoutOptions() {
    return this._layoutOptions;
  }

  get parentLayoutItem() {
    return this._chipContext.layoutItem as LayoutItem | undefined;
  }

  get lastRefreshInfo() {
    return this._lastRefreshInfo;
  }

  get lastRenderInfo() {
    return this._lastRenderInfo;
  }
}

/** Just takes up space */
export class SpacerChip extends LayoutItemBase {
  protected _layoutOptions: LayoutOptions;

  constructor(options?: Partial<LayoutOptions>) {
    super();

    this._layoutOptions = util.fillInOptions(options, new LayoutOptions());
  }

  protected _onActivate(): void {
    this.parentLayoutItem?.addChildLayoutItem(this);
  }

  protected _onTerminate(): void {
    this.parentLayoutItem?.removeChildLayoutItem(this);
  }
}

class PixiAppChipOptions {
  /* Provide either a parent element or a canvas */
  parentElement?: HTMLElement;
  canvas?: PIXI.ICanvas;

  appOptions?: Partial<PIXI.IApplicationOptions & PIXI.IRendererOptions>;

  /** If true, set up a container to handle layout */
  addContainerChip = false;
}

export class PixiAppChip extends chip.Composite {
  private readonly _options: PixiAppChipOptions;

  private _pixiApplication: PIXI.Application;
  private _stackingContainerChip?: StackingContainerChip;
  private _refreshNeeded: boolean;

  constructor(options?: Partial<PixiAppChipOptions>) {
    super();

    this._options = chip.fillInOptions(options, new PixiAppChipOptions());
  }

  protected _onActivate(): void {
    this._refreshNeeded = false;

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

    if (this._options.addContainerChip) {
      this._activateChildChip(new StackingContainerChip(), {
        context: {
          pixiAppChip: this,
          pixiApplication: this._pixiApplication,
          container: this._pixiApplication.stage,
        },
        attribute: "_stackingContainerChip",
      });

      this._subscribe(this._stackingContainerChip, "updated", this._onResize);
    }

    // If PIXI handles resizing, listen to that event. Otherwise listen to the window
    if (this._pixiApplication.resizeTo) {
      this._subscribe(this._pixiApplication.renderer, "resize", this._onResize);
    } else {
      this._subscribe(window, "resize", this._onResize);
    }

    this._handleResize();
  }

  protected _onTick(): void {
    if (this._refreshNeeded) {
      this._handleResize();
      this._refreshNeeded = false;
    }

    this._pixiApplication.render();
  }

  protected _onTerminate(): void {
    this._pixiApplication.destroy(true);
  }

  get contextModification(): chip.ChipContextResolvable {
    if (this._stackingContainerChip) {
      return {
        pixiAppChip: this,
        pixiApplication: this._pixiApplication,
        ...this._stackingContainerChip.contextModification,
      };
    } else {
      return {
        pixiAppChip: this,
        pixiApplication: this._pixiApplication,
        container: this._pixiApplication.stage,
      };
    }
  }

  private _onResize() {
    this._refreshNeeded = true;
  }

  private _handleResize() {
    this.emit("willResize");

    if (this._stackingContainerChip) {
      this._stackingContainerChip.prepareRefresh({
        renderSize: this.renderSize,
      });

      const screenBounds = Bounds.fromRectangle(this._pixiApplication.screen);
      this._stackingContainerChip.refresh({
        absoluteBounds: screenBounds,
        localBounds: screenBounds,
      });
    }

    this.emit("didResize");
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
  displayObject: DisplayObjectType;
  children: Array<chip.ActivateChildChipOptions | chip.ChipResolvable> = [];
  properties?: DisplayObjectProperties<DisplayObjectType> = {};
  onResize?: (
    options: DisplayObjectValueFunctionOptions<DisplayObjectType>,
  ) => unknown;
  layoutOptions?: Partial<LayoutOptions>;

  addToParentLayoutItem = true;
  addToContainer = true;
}

export abstract class DisplayObjectChip<
  DisplayObjectType extends PIXI.DisplayObject,
> extends LayoutItemBase {
  protected abstract readonly _options: DisplayObjectChipOptions<DisplayObjectType>;

  private _propertiesToUpdateOnResize: Array<keyof DisplayObjectType>;

  protected _onActivate() {
    super._onActivate();

    this._propertiesToUpdateOnResize = [];

    const valueFunctionOptions = {
      displayObject: this._options.displayObject,
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
        this._options.displayObject,
        property as keyof DisplayObjectType,
        value,
      );
    }

    if (
      !this._options.hasOwnProperty("addToContainer") ||
      this._options.addToContainer
    ) {
      this._chipContext.container.addChild(this._options.displayObject);
    }

    // Optionally participate in the layout
    if (this._options.addToParentLayoutItem && this.parentLayoutItem) {
      // When _onRefresh() is called, it will call _updateProperties()
      this.parentLayoutItem.addChildLayoutItem(this);
    } else {
      // Call _updateProperties() directly
      this._subscribe(this.pixiAppChip, "didResize", this._updateProperties);
    }
  }

  protected _onTerminate() {
    if (this._options.addToParentLayoutItem && this.parentLayoutItem) {
      this.parentLayoutItem.removeChildLayoutItem(this);
    }

    if (
      !this._options.hasOwnProperty("addToContainer") ||
      this._options.addToContainer
    ) {
      this._chipContext.container.removeChild(this._options.displayObject);
    }

    super._onTerminate();
  }

  protected _updateProperties() {
    const valueFunctionOptions = {
      displayObject: this._options.displayObject,
      pixiAppChip: this.pixiAppChip,
      renderSize: this.pixiAppChip.renderSize,
    };

    // TODO: optionally update ideal size

    for (const property of this._propertiesToUpdateOnResize) {
      const f = this._options.properties[
        property
      ] as DisplayObjectValueFunction<
        DisplayObjectType,
        keyof DisplayObjectType
      >;
      const value = f(valueFunctionOptions);
      updateProperty(this._options.displayObject, property, value);
    }

    this._options.onResize?.({
      displayObject: this._options.displayObject,
      pixiAppChip: this.pixiAppChip,
      renderSize: this.pixiAppChip.renderSize,
    });
  }

  get pixiAppChip() {
    return this._chipContext.pixiAppChip as PixiAppChip;
  }

  protected get _layoutOptions() {
    return this._options.layoutOptions as LayoutOptions;
  }

  get displayObject() {
    return this._options.displayObject;
  }
}

export class DisplayLeafLayoutOptions extends LayoutOptions {
  keepAspectRatio = false;

  horizontalAlign: "left" | "right" | "center" = "left";
  verticalAlign: "top" | "bottom" | "middle" = "top";

  /** When aligning, adjust for non-zero anchor points */
  alignBasedOnAnchor = true;
}

export class DisplayLeafChipOptions<
  DisplayObjectType extends PIXI.DisplayObject,
> extends DisplayObjectChipOptions<DisplayObjectType> {
  layoutOptions?: Partial<DisplayLeafLayoutOptions>;
}

export class DisplayLeafChip<
  DisplayObjectType extends PIXI.DisplayObject,
> extends DisplayObjectChip<DisplayObjectType> {
  protected readonly _options: DisplayLeafChipOptions<DisplayObjectType>;

  // Cache of the local bounds so as not to recalculate it
  private _localBounds?: Bounds;
  private _idealWidth?: number;
  private _idealHeight?: number;

  // private _propertiesToUpdateOnResize: Array<keyof DisplayObjectType>;

  constructor(options: Partial<DisplayLeafChipOptions<DisplayObjectType>>) {
    const filledOptions = chip.fillInOptions(
      options,
      new DisplayLeafChipOptions<DisplayObjectType>(),
    );
    super(options.children);

    filledOptions.layoutOptions = chip.fillInOptions(
      filledOptions.layoutOptions,
      new DisplayLeafLayoutOptions(),
    );
    this._options = filledOptions;
  }

  protected override _onPrepareRefresh() {
    // The first time, possibly calculate ideal sizes
    if (
      typeof this._idealWidth !== "undefined" &&
      typeof this._idealHeight !== "undefined"
    )
      return;

    this.updateIdealSize();
  }

  protected override _onRefresh(): void {
    if (!this.displayObject.parent)
      throw new Error("Cannot layout display object without a parent");

    let horizontalScale = 1;
    let verticalScale = 1;

    // Reason in inner sizes, without padding
    const idealInnerWidth = this.idealWidth
      ? this.idealWidth - (this.paddingLeft + this.paddingRight)
      : 0;
    const idealInnerHeight = this.idealHeight
      ? this.idealHeight - (this.paddingTop + this.paddingBottom)
      : 0;

    const innerBounds = this.calculateInnerBounds(
      this.lastRefreshInfo.localBounds,
    );

    if (innerBounds.isBoundedHorizontally()) {
      if (innerBounds.width < idealInnerWidth) {
        // Shrink, but not beyond the min size
        if (typeof this.minWidth !== "undefined") {
          const minInnerWidth =
            this.minWidth - (this.paddingLeft + this.paddingRight);
          horizontalScale =
            Math.max(innerBounds.width, minInnerWidth) / idealInnerWidth;
        } else {
          horizontalScale = innerBounds.width / idealInnerWidth;
        }
      } else if (innerBounds.width > idealInnerWidth) {
        // Grow, but not beyond the max size
        if (typeof this.maxWidth !== "undefined") {
          const maxInnerWidth =
            this.maxWidth - (this.paddingLeft + this.paddingRight);
          horizontalScale =
            Math.min(maxInnerWidth, innerBounds.width) / idealInnerWidth;
        } else {
          horizontalScale = innerBounds.width / idealInnerWidth;
        }
      }
    }

    if (innerBounds.isBoundedVertically()) {
      if (innerBounds.height < idealInnerHeight) {
        // Shrink, but not beyond the min size
        if (typeof this.minHeight !== "undefined") {
          const minInnerHeight =
            this.minHeight - (this.paddingTop + this.paddingBottom);
          verticalScale =
            Math.max(innerBounds.height, minInnerHeight) / idealInnerHeight;
        } else {
          verticalScale = innerBounds.height / idealInnerHeight;
        }
      } else if (innerBounds.height > idealInnerHeight) {
        // Grow, but not beyond the max size
        if (typeof this.maxHeight !== "undefined") {
          const maxInnerHeight =
            this.maxHeight - (this.paddingTop + this.paddingBottom);
          verticalScale =
            Math.min(maxInnerHeight, innerBounds.height) / idealInnerHeight;
        } else {
          verticalScale = innerBounds.height / idealInnerHeight;
        }
      }
    }

    if (this._options.layoutOptions.keepAspectRatio) {
      const minScale = Math.min(horizontalScale, verticalScale);
      horizontalScale = minScale;
      verticalScale = minScale;
    }

    const scaledWidth = idealInnerWidth * horizontalScale;
    const scaledHeight = idealInnerHeight * verticalScale;
    this._setSize({
      scaledWidth,
      scaledHeight,
      horizontalScale,
      verticalScale,
    });

    const position = new PIXI.Point(innerBounds.x, innerBounds.y);

    // If the object has an non-zero anchor point, adjust the position
    if (this._options.layoutOptions.alignBasedOnAnchor) {
      position.x -= this._localBounds.x;
      position.y -= this._localBounds.y;
    }

    // Handle horizontal alignment
    if (innerBounds.isBoundedHorizontally()) {
      if (
        this._options.layoutOptions.horizontalAlign !== "left" &&
        innerBounds.width > scaledWidth
      ) {
        const extraSpace = innerBounds.width - scaledWidth;
        if (this._options.layoutOptions.horizontalAlign === "right") {
          position.x += extraSpace;
        } else if (this._options.layoutOptions.horizontalAlign === "center") {
          position.x += extraSpace / 2;
        }
      }
    } else if (this._options.layoutOptions.horizontalAlign !== "left") {
      console.error(
        `DisplayLeafChip: Within unbounded layout, cannot horizontally align as requested: ${this._options.layoutOptions.horizontalAlign}`,
      );
    }

    // Handle vertical alignment
    if (innerBounds.isBoundedVertically()) {
      if (
        this._options.layoutOptions.verticalAlign !== "top" &&
        innerBounds.height > scaledHeight
      ) {
        const extraSpace = innerBounds.height - scaledHeight;
        if (this._options.layoutOptions.verticalAlign === "bottom") {
          position.y += extraSpace;
        } else if (this._options.layoutOptions.verticalAlign === "middle") {
          position.y += extraSpace / 2;
        }
      }

      this._setPosition(position);

      this._updateProperties();
    } else if (this._options.layoutOptions.verticalAlign !== "top") {
      console.error(
        `DisplayLeafChip: Within unbounded layout, cannot vertically align as requested: ${this._options.layoutOptions.verticalAlign}`,
      );
    }
  }

  updateIdealSize() {
    this._localBounds = Bounds.fromRectangle(
      this._options.displayObject.getLocalBounds(),
    );

    if (typeof this._options.layoutOptions.idealWidth === "undefined") {
      this._idealWidth =
        this._localBounds.width + this.paddingLeft + this.paddingRight;
    } else {
      this._idealWidth = parseLayoutProperty(
        this,
        this._options.layoutOptions,
        "idealWidth",
        this._lastRenderInfo,
      );
    }

    if (typeof this._options.layoutOptions.idealHeight === "undefined") {
      this._idealHeight =
        this._localBounds.height + this.paddingTop + this.paddingBottom;
    } else {
      this._idealHeight = parseLayoutProperty(
        this,
        this._options.layoutOptions,
        "idealHeight",
        this._lastRenderInfo,
      );
    }
  }

  get idealWidth() {
    return this._idealWidth;
  }
  get idealHeight() {
    return this._idealHeight;
  }

  protected _setSize({
    horizontalScale,
    verticalScale,
  }: {
    scaledWidth: number;
    scaledHeight: number;
    horizontalScale: number;
    verticalScale: number;
  }) {
    this._options.displayObject.scale.set(horizontalScale, verticalScale);
  }

  protected _setPosition(position: PIXI.IPointData) {
    this._options.displayObject.position.copyFrom(position);
  }
}

export class SpriteChipLayoutOptions extends DisplayLeafLayoutOptions {
  keepAspectRatio = true;

  maxWidth: LayoutValue = "idealWidth";
  maxHeight: LayoutValue = "idealHeight";
}

export class SpriteChipOptions extends DisplayLeafChipOptions<PIXI.Sprite> {
  texture?: PIXI.Texture | string;
}

export class SpriteChip extends DisplayLeafChip<PIXI.Sprite> {
  constructor(options: Partial<SpriteChipOptions>) {
    const filledOptions = chip.fillInOptions(options, new SpriteChipOptions());
    filledOptions.layoutOptions = chip.fillInOptions(
      filledOptions.layoutOptions,
      new SpriteChipLayoutOptions(),
    );

    if (!filledOptions.displayObject) {
      if (!options.texture) {
        throw new Error("Missing display object or texture for SpriteChip");
      }

      if (typeof options.texture === "string") {
        const resolvedTexture = PIXI.Assets.get<PIXI.Texture>(options.texture);
        if (!resolvedTexture)
          throw new Error(
            `Cannot find texture asset for SpriteChip "${options.texture}"`,
          );

        options.texture = resolvedTexture;
      }

      filledOptions.displayObject = new PIXI.Sprite(options.texture);
    }

    super(filledOptions);
  }
}

export class NineSliceWidths {
  left = 0;
  top = 0;
  right = 0;
  bottom = 0;
}

export class NineSlicePlaneChipOptions extends DisplayLeafChipOptions<PIXI.NineSlicePlane> {
  texture?: PIXI.Texture | string;
  nineSliceWidths?: Partial<NineSliceWidths>;
}

export class NineSlicePlaneChip extends DisplayLeafChip<PIXI.NineSlicePlane> {
  constructor(options: Partial<NineSlicePlaneChipOptions>) {
    const filledOptions = chip.fillInOptions(
      options,
      new NineSlicePlaneChipOptions(),
    );

    if (!filledOptions.displayObject) {
      if (!options.texture) {
        throw new Error(
          "Missing display object or texture for NineSlicePlaneChip",
        );
      }

      if (typeof options.texture === "string") {
        const resolvedTexture = PIXI.Assets.get<PIXI.Texture>(options.texture);
        if (!resolvedTexture)
          throw new Error(
            `Cannot find texture asset for nine slice plane "${options.texture}"`,
          );

        options.texture = resolvedTexture;
      }

      if (options.nineSliceWidths) {
        filledOptions.displayObject = new PIXI.NineSlicePlane(
          options.texture,
          options.nineSliceWidths.left,
          options.nineSliceWidths.top,
          options.nineSliceWidths.right,
          options.nineSliceWidths.bottom,
        );
      } else {
        filledOptions.displayObject = new PIXI.NineSlicePlane(options.texture);
      }
    }

    super(filledOptions);
  }

  protected _setSize({
    scaledWidth,
    scaledHeight,
  }: {
    scaledWidth: number;
    scaledHeight: number;
  }) {
    this._options.displayObject.width = scaledWidth;
    this._options.displayObject.height = scaledHeight;
  }
}

export class TextChipLayoutOptions extends DisplayLeafLayoutOptions {
  keepAspectRatio = true;

  minWidth: LayoutValue = "idealWidth";
  minHeight: LayoutValue = "idealHeight";
  maxWidth: LayoutValue = "idealWidth";
  maxHeight: LayoutValue = "idealHeight";
}

export class TextChipOptions extends DisplayLeafChipOptions<PIXI.Text> {
  message?: string;
  style?: Partial<PIXI.ITextStyle> | PIXI.TextStyle;
}

export class TextChip extends DisplayLeafChip<PIXI.Text> {
  constructor(options: Partial<TextChipOptions>) {
    const filledOptions = chip.fillInOptions(options, new TextChipOptions());
    filledOptions.layoutOptions = chip.fillInOptions(
      filledOptions.layoutOptions,
      new TextChipLayoutOptions(),
    );

    if (!filledOptions.displayObject) {
      filledOptions.displayObject = new PIXI.Text(
        options.message || "",
        options.style,
      );
    }

    super(filledOptions);
  }
}

/**
 * Manages a container that will be layed out, but will not act as a parent for other layout children
 * */
export class ContainerLeafChip extends DisplayLeafChip<PIXI.Container> {
  constructor(options: Partial<DisplayLeafChipOptions<PIXI.Container>>) {
    const filledOptions = chip.fillInOptions(
      options,
      new DisplayLeafChipOptions<PIXI.Container>(),
    );

    if (!filledOptions.displayObject) {
      filledOptions.displayObject = new PIXI.Container();
    }

    super(filledOptions);
  }

  get contextModification(): chip.ChipContextResolvable {
    return {
      container: this.displayObject,
    };
  }
}

export abstract class ContainerBase extends DisplayObjectChip<PIXI.Container> {
  protected _childLayoutItems: Array<LayoutItem>;

  protected _onActivate(): void {
    this._childLayoutItems = [];

    super._onActivate();
  }

  addChildLayoutItem(child: LayoutItem): void {
    const index = this._childLayoutItems.indexOf(child);
    if (index !== -1)
      throw new Error("Cannot add duplicate child display item");

    this._childLayoutItems.push(child);

    this._subscribe(child, "updated", this.requestRefresh);
    this.requestRefresh();
  }

  removeChildLayoutItem(child: LayoutItem): void {
    const index = this._childLayoutItems.indexOf(child);
    if (index === -1)
      throw new Error("Cannot find child display item to remove");

    this._childLayoutItems.splice(index, 1);
    this._unsubscribe(child);

    this.requestRefresh();
  }

  override prepareRefresh(renderInfo: RenderInfo): void {
    super.prepareRefresh(renderInfo);

    for (const child of this._childLayoutItems)
      child.prepareRefresh(this._lastRenderInfo);
  }

  override refresh(refreshInfo: RefreshInfo): void {
    // Position the container and adjust local bounds
    this.displayObject.position.set(
      refreshInfo.localBounds.x,
      refreshInfo.localBounds.y,
    );

    const childLocalBounds = new Bounds(
      0,
      0,
      refreshInfo.localBounds.width,
      refreshInfo.localBounds.height,
    );

    super.refresh({
      localBounds: childLocalBounds,
      absoluteBounds: refreshInfo.absoluteBounds,
    });
  }

  get contextModification(): chip.ChipContextResolvable {
    return {
      layoutItem: this,
      container: this._options.displayObject,
    };
  }

  aggregateChildValues(
    prop:
      | "minWidth"
      | "minHeight"
      | "idealWidth"
      | "idealHeight"
      | "maxWidth"
      | "maxHeight",
    operation: "sum" | "max",
  ) {
    return this._childLayoutItems.reduce((agg, child) => {
      const childValue = child[prop] || 0;
      if (operation === "sum") return agg + childValue;
      else return Math.max(agg, childValue);
    }, 0);
  }
}

export class StackingContainerChip extends ContainerBase {
  protected readonly _options: DisplayObjectChipOptions<PIXI.Container>;

  constructor(options?: Partial<DisplayObjectChipOptions<PIXI.Container>>) {
    const filledOptions = chip.fillInOptions(
      options,
      new DisplayObjectChipOptions<PIXI.Container>(),
    );
    super(filledOptions.children);

    filledOptions.layoutOptions = chip.fillInOptions(
      filledOptions.layoutOptions,
      new LayoutOptions(),
    );

    if (!filledOptions.displayObject) {
      filledOptions.displayObject = new PIXI.Container();
    }

    this._options = filledOptions;
  }

  protected _onRefresh(): void {
    // Refresh all children
    const childRefreshInfo: RefreshInfo = {
      absoluteBounds: this.calculateInnerBounds(
        this.lastRefreshInfo.absoluteBounds,
      ),
      localBounds: this.calculateInnerBounds(this.lastRefreshInfo.localBounds),
    };
    for (const child of this._childLayoutItems) child.refresh(childRefreshInfo);
  }

  get minWidth() {
    return super.minWidth ?? this.aggregateChildValues("minWidth", "max");
  }
  get minHeight() {
    return super.minHeight ?? this.aggregateChildValues("minHeight", "max");
  }

  get idealWidth() {
    return super.idealWidth ?? this.aggregateChildValues("idealWidth", "max");
  }
  get idealHeight() {
    return super.idealHeight ?? this.aggregateChildValues("idealHeight", "max");
  }

  get maxWidth() {
    return super.minWidth ?? this.aggregateChildValues("maxWidth", "max");
  }
  get maxHeight() {
    return super.minHeight ?? this.aggregateChildValues("maxHeight", "max");
  }
}

export class DirectionalContainerLayoutOptions extends LayoutOptions {
  direction: "horizontal" | "vertical" = "horizontal";

  distributeSpace:
    | "atStart"
    | "atEnd"
    | "atStartAndEnd"
    | "between"
    | "around" = "atEnd";

  gap = 0;
}

export class DirectionalContainerOptions extends DisplayObjectChipOptions<PIXI.Container> {
  layoutOptions?: Partial<DirectionalContainerLayoutOptions>;
}

export class DirectionalContainerChip extends ContainerBase {
  protected readonly _options: DirectionalContainerOptions;

  constructor(options?: Partial<DirectionalContainerOptions>) {
    const filledOptions = chip.fillInOptions(
      options,
      new DirectionalContainerOptions(),
    );
    super(filledOptions.children);

    filledOptions.layoutOptions = chip.fillInOptions(
      filledOptions.layoutOptions,
      new DirectionalContainerLayoutOptions(),
    );

    if (!filledOptions.displayObject) {
      filledOptions.displayObject = new PIXI.Container();
    }

    this._options = filledOptions;
  }

  protected _onRefresh(): void {
    if (this._options.layoutOptions.direction === "horizontal") {
      if (this._lastRefreshInfo.localBounds.isBoundedHorizontally()) {
        this._handleBoundedLayout();
      } else {
        this._handleUnboundedLayout();
      }
    } else {
      if (this._lastRefreshInfo.localBounds.isBoundedVertically()) {
        this._handleBoundedLayout();
      } else {
        this._handleUnboundedLayout();
      }
    }
  }

  private _handleBoundedLayout(): void {
    // Determine which properties will be used depending on the direction
    const minLengthProp =
      this._options.layoutOptions.direction === "vertical"
        ? "minHeight"
        : "minWidth";
    const idealLengthProp =
      this._options.layoutOptions.direction === "vertical"
        ? "idealHeight"
        : "idealWidth";
    const maxLengthProp =
      this._options.layoutOptions.direction === "vertical"
        ? "maxHeight"
        : "maxWidth";
    const lengthProp =
      this._options.layoutOptions.direction === "vertical" ? "height" : "width";

    // Do a first pass to gather minimum space and element types
    const lengths: Array<number> = [];
    let childIndexesToGrow: Array<number> = [];

    let minUsedSpace = 0;
    for (let i = 0; i < this._childLayoutItems.length; i++) {
      // Account for the gap
      if (i > 0) minUsedSpace += this._options.layoutOptions.gap;

      const child = this._childLayoutItems[i];

      const childMinLength = child[minLengthProp] || 0;
      minUsedSpace += childMinLength;
      lengths.push(childMinLength);

      // Prepare the next step by identifying those items with larger ideal lengths
      const childIdealLength = child[idealLengthProp];
      if (
        typeof childIdealLength !== "undefined" &&
        childIdealLength > childMinLength
      ) {
        childIndexesToGrow.push(i);
      }
    }

    const innerLocalBounds = this.calculateInnerBounds(
      this.lastRefreshInfo.localBounds,
    );
    const innerAbsoluteBounds = this.calculateInnerBounds(
      this.lastRefreshInfo.absoluteBounds,
    );

    // Do a second pass to bring elements to their ideal lengths
    let availableExtraSpace = innerLocalBounds[lengthProp] - minUsedSpace;
    while (availableExtraSpace > 1 && childIndexesToGrow.length > 0) {
      const extraSpacePerChild =
        availableExtraSpace / childIndexesToGrow.length;
      for (let i = 0; i < childIndexesToGrow.length; i++) {
        const childIndex = childIndexesToGrow[i];
        const child = this._childLayoutItems[childIndex];
        const childIdealLength = child[idealLengthProp] || 0;

        // Expand the element, but not beyond the ideal length
        const spaceToGive = Math.min(
          extraSpacePerChild,
          childIdealLength - lengths[childIndex],
        );
        lengths[childIndex] += spaceToGive;
        availableExtraSpace -= spaceToGive;

        if (lengths[childIndex] >= childIdealLength) {
          // Remove the child from the array of indexes to grow. Keep i at the same value for the next loop
          childIndexesToGrow.splice(i, 1);
          i--;
        }
      }
    }

    // Identify elements that can still grow (no max length, or max length greater than current)
    if (availableExtraSpace > 1) {
      childIndexesToGrow = [];

      for (let i = 0; i < this._childLayoutItems.length; i++) {
        const child = this._childLayoutItems[i];

        if (
          typeof child[maxLengthProp] === "undefined" ||
          child[maxLengthProp] > lengths[i]
        ) {
          childIndexesToGrow.push(i);
        }
      }
    }

    // Do extra passes, giving space to growing elements
    while (availableExtraSpace > 1 && childIndexesToGrow.length > 0) {
      const extraSpacePerChild =
        availableExtraSpace / childIndexesToGrow.length;
      for (let i = 0; i < childIndexesToGrow.length; i++) {
        const childIndex = childIndexesToGrow[i];
        const child = this._childLayoutItems[childIndex];

        if (typeof child[maxLengthProp] !== "undefined") {
          // Expand the element, but not beyond the max length
          const spaceToGive = Math.min(
            extraSpacePerChild,
            child[maxLengthProp] - lengths[childIndex],
          );
          lengths[childIndex] += spaceToGive;
          availableExtraSpace -= spaceToGive;

          if (lengths[childIndex] >= child[maxLengthProp]) {
            // Remove the child from the array of indexes to grow. Keep i at the same value for the next loop
            childIndexesToGrow.splice(i, 1);
            i--;
          }
        } else {
          // Increase the length in an unbounded way
          lengths[childIndex] += extraSpacePerChild;
          availableExtraSpace -= extraSpacePerChild;
        }
      }
    }

    // Distribute any extra space around or between elements at the same time as you assign lengths
    let axisOffset = 0;

    if (this._options.layoutOptions.distributeSpace === "atStart") {
      axisOffset += availableExtraSpace;
    } else if (
      this._options.layoutOptions.distributeSpace === "atStartAndEnd"
    ) {
      axisOffset += availableExtraSpace / 2;
    } else if (this._options.layoutOptions.distributeSpace === "around") {
      axisOffset += availableExtraSpace / this._childLayoutItems.length / 2;
    }

    for (let i = 0; i < this._childLayoutItems.length; i++) {
      // Handle gap
      if (i > 0) axisOffset += this._options.layoutOptions.gap;

      const child = this._childLayoutItems[i];

      let itemLocalBounds: Bounds;
      let itemAbsoluteBounds: Bounds;
      if (this._options.layoutOptions.direction === "vertical") {
        itemLocalBounds = new Bounds(
          innerLocalBounds.x,
          innerLocalBounds.y + axisOffset,
          innerLocalBounds.width,
          lengths[i],
        );
        itemAbsoluteBounds = new Bounds(
          innerAbsoluteBounds.x,
          innerAbsoluteBounds.y + axisOffset,
          innerAbsoluteBounds.width,
          lengths[i],
        );
      } else {
        itemLocalBounds = new Bounds(
          innerLocalBounds.x + axisOffset,
          innerLocalBounds.y,
          lengths[i],
          innerLocalBounds.height,
        );
        itemAbsoluteBounds = new Bounds(
          innerAbsoluteBounds.x + axisOffset,
          innerAbsoluteBounds.y,
          lengths[i],
          innerAbsoluteBounds.height,
        );
      }

      // Update item
      child.refresh({
        absoluteBounds: itemAbsoluteBounds,
        localBounds: itemLocalBounds,
      });

      // Add space used to y offset
      axisOffset += lengths[i];

      // Distribute extra space between items
      if (this._options.layoutOptions.distributeSpace === "between") {
        if (this._childLayoutItems.length > 1)
          axisOffset +=
            availableExtraSpace / (this._childLayoutItems.length - 1);
      } else if (this._options.layoutOptions.distributeSpace === "around") {
        axisOffset += availableExtraSpace / this._childLayoutItems.length;
      }
    }
  }

  private _handleUnboundedLayout(): void {
    if (this._options.layoutOptions.distributeSpace !== "atEnd") {
      console.error(
        `DirectionalContainer: Within unbounded layout, cannot distribute space as requested: ${this._options.layoutOptions.distributeSpace}`,
      );
    }

    const idealLengthProp =
      this._options.layoutOptions.direction === "vertical"
        ? "idealHeight"
        : "idealWidth";
    const lengthProp =
      this._options.layoutOptions.direction === "vertical" ? "height" : "width";

    const innerLocalBounds = this.calculateInnerBounds(
      this.lastRefreshInfo.localBounds,
    );
    const innerAbsoluteBounds = this.calculateInnerBounds(
      this.lastRefreshInfo.absoluteBounds,
    );

    let axisOffset = 0;
    for (let i = 0; i < this._childLayoutItems.length; i++) {
      // Handle gap
      if (i > 0) axisOffset += this._options.layoutOptions.gap;

      const child = this._childLayoutItems[i];
      const childIdealLength = child[idealLengthProp] || 0;

      let itemLocalBounds: Bounds;
      let itemAbsoluteBounds: Bounds;
      if (this._options.layoutOptions.direction === "vertical") {
        itemLocalBounds = new Bounds(
          innerLocalBounds.x,
          innerLocalBounds.y + axisOffset,
          innerLocalBounds.width,
          childIdealLength,
        );
        itemAbsoluteBounds = new Bounds(
          innerAbsoluteBounds.x,
          innerAbsoluteBounds.y + axisOffset,
          innerAbsoluteBounds.width,
          childIdealLength,
        );
      } else {
        itemLocalBounds = new Bounds(
          innerLocalBounds.x + axisOffset,
          innerLocalBounds.y,
          childIdealLength,
          innerLocalBounds.height,
        );
        itemAbsoluteBounds = new Bounds(
          innerAbsoluteBounds.x + axisOffset,
          innerAbsoluteBounds.y,
          childIdealLength,
          innerAbsoluteBounds.height,
        );
      }

      // Update item
      child.refresh({
        absoluteBounds: itemAbsoluteBounds,
        localBounds: itemLocalBounds,
      });

      // Add space used to offset
      axisOffset += childIdealLength;
    }
  }

  get minWidth() {
    if (typeof super.minWidth !== "undefined") return super.minWidth;

    if (this._options.layoutOptions.direction === "horizontal") {
      const childrenSum = this.aggregateChildValues("minWidth", "sum");
      return childrenSum + this._calcuateGapSum();
    } else {
      return this.aggregateChildValues("minWidth", "max");
    }
  }
  get minHeight() {
    if (typeof super.minHeight !== "undefined") return super.minWidth;

    if (this._options.layoutOptions.direction === "vertical") {
      const childrenSum = this.aggregateChildValues("minHeight", "sum");
      return childrenSum + this._calcuateGapSum();
    } else {
      return this.aggregateChildValues("minHeight", "max");
    }
  }

  get idealWidth() {
    if (typeof super.idealWidth !== "undefined") return super.idealWidth;

    if (this._options.layoutOptions.direction === "horizontal") {
      const childrenSum = this.aggregateChildValues("idealWidth", "sum");
      return childrenSum + this._calcuateGapSum();
    } else {
      return this.aggregateChildValues("idealWidth", "max");
    }
  }
  get idealHeight() {
    if (typeof super.idealHeight !== "undefined") return super.minWidth;

    if (this._options.layoutOptions.direction === "vertical") {
      const childrenSum = this.aggregateChildValues("idealHeight", "sum");
      return childrenSum + this._calcuateGapSum();
    } else {
      return this.aggregateChildValues("idealHeight", "max");
    }
  }

  get maxWidth() {
    if (typeof super.maxWidth !== "undefined") return super.maxWidth;

    if (this._options.layoutOptions.direction === "horizontal") {
      const childrenSum = this.aggregateChildValues("maxWidth", "sum");
      return childrenSum + this._calcuateGapSum();
    } else {
      return this.aggregateChildValues("maxWidth", "max");
    }
  }

  get maxHeight() {
    if (typeof super.maxHeight !== "undefined") return super.minWidth;

    if (this._options.layoutOptions.direction === "vertical") {
      const childrenSum = this.aggregateChildValues("maxHeight", "sum");
      return childrenSum + this._calcuateGapSum();
    } else {
      return this.aggregateChildValues("maxHeight", "max");
    }
  }

  private _calcuateGapSum() {
    return this._childLayoutItems.length > 1
      ? (this._childLayoutItems.length - 1) * this._options.layoutOptions.gap
      : 0;
  }
}

/** 
  Manages an animated sprite in PIXI, pausing the sprite during pauses.

  When the animation completes (if the animation is not set to loop, then this will request a signal)

  "Forwards" the following events emitted by PIXI.AnimatedSprite:
  - complete - When animation completes
  - loop - When animation loops
  - frameChange(currentFrame: number) - When frame changes 
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
    }

    if ("fps" in this._options) {
      this._animatedSprite.animationSpeed = this._options.fps / 1000;
    }

    // Setup event handlers
    this._animatedSprite.onFrameChange = this._onFrameChange.bind(this);
    this._animatedSprite.onLoop = this._onLoop.bind(this);
    this._animatedSprite.onComplete = this._onComplete.bind(this);

    this.restart();

    this._options.onResize?.({
      displayObject: this._animatedSprite,
      pixiAppChip: this.pixiAppChip,
      renderSize: this.pixiAppChip.renderSize,
    });

    this._subscribe(this.pixiAppChip, "didResize", this._onResize);
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

  private _onComplete() {
    this.emit("complete");

    if (this._options.behaviorOnComplete == "remove") {
      this._terminateSelf();
    }
  }

  private _onLoop() {
    this.emit("loop");
  }

  private _onFrameChange(currentFrame: number) {
    this.emit("frameChange", currentFrame);
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

  /**
   * Sends the animation back to the starting frame (0 by default).
   * If the behaviorOnStart is set to play, will do so
   */
  restart() {
    this._animatedSprite.gotoAndStop(this._options.startingFrame ?? 0);

    if (this._options.behaviorOnStart === "play") {
      this._animatedSprite.play();
    }
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

export class LayoutTest extends chip.Composite {
  protected _onActivate(): void {
    this._addHorizontalLayout();
  }

  private _addHorizontalLayout() {
    const containerChip = new DirectionalContainerChip({
      layoutOptions: {
        distributeSpace: "between",
        paddingBottom: 10,
      },
    });
    this._activateChildChip(containerChip);

    {
      const sprite = new PIXI.Graphics();
      sprite.beginFill(0xff0000);
      sprite.drawRoundedRect(0, 0, 100, 100, 10);
      sprite.endFill();

      const baseRenderTexture = new PIXI.BaseRenderTexture({
        width: 100,
        height: 100,
      });
      const renderTexture = new PIXI.RenderTexture(baseRenderTexture);
      this.chipContext.pixiApplication.renderer.render(sprite, {
        renderTexture,
      });

      containerChip.addChildChip(
        new SpriteChip({
          texture: renderTexture,
          properties: {
            x: ({ displayObject }) => displayObject.x,
          },
          layoutOptions: {
            // maxWidth: 100,
            minWidth: "idealWidth",
            maxWidth: "idealWidth",
            verticalAlign: "top",
            paddingTop: 10,
            paddingRight: 15,
          },
        }),
      );
    }

    containerChip.addChildChip(new SpacerChip({ minWidth: 10, maxWidth: 10 }));

    {
      const green = new PIXI.Graphics();
      green.beginFill(0x00ff00);
      green.drawRoundedRect(0, 0, 50, 100, 10);
      green.endFill();

      containerChip.addChildChip(
        new DisplayLeafChip({
          displayObject: green,
          layoutOptions: {
            maxWidth: 200,
            keepAspectRatio: true,
            idealWidth: "maxWidth",
          },
        }),
      );
    }

    {
      // Render a rounded rect to a texture, use that as the basis from the 9-slice
      const sprite = new PIXI.Graphics();
      sprite.beginFill(0x0000ff);
      sprite.drawRoundedRect(0, 0, 100, 50, 10);
      sprite.endFill();

      const baseRenderTexture = new PIXI.BaseRenderTexture({
        width: 100,
        height: 50,
      });
      const renderTexture = new PIXI.RenderTexture(baseRenderTexture);
      this.chipContext.pixiApplication.renderer.render(sprite, {
        renderTexture,
      });

      const nineSlicePlane = new PIXI.NineSlicePlane(
        renderTexture,
        10,
        10,
        10,
        10,
      );

      containerChip.addChildChip(
        new NineSlicePlaneChip({
          displayObject: nineSlicePlane,
          layoutOptions: {
            verticalAlign: "middle",
            maxHeight: 200,
          },
        }),
      );
    }
  }
}
