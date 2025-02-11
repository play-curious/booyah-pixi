// import * as booyah from "booyah/dist/booyah";
// import * as util from "booyah/dist/util";
import * as PIXI from "pixi.js";
import * as booyah from "booyah";
import * as _ from "underscore";

import * as pixiApp from "./pixiApp";
import * as resolvable from "./resolvable";

export const widthLayoutProperties = [
  "minWidth",
  "idealWidth",
  "maxWidth",
] as const;

export const heightLayoutProperties = [
  "minHeight",
  "idealHeight",
  "maxHeight",
] as const;

export const paddingLayoutProperties = [
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "paddingBottom",
] as const;

export const naturalLayoutProperties = [
  "naturalInnerWidth",
  "naturalInnerHeight",
  "naturalOuterWidth",
  "naturalOuterHeight",
] as const;

export const boundingLayoutProperties = [
  ...widthLayoutProperties,
  ...heightLayoutProperties,
] as const;

export type BoundingLayoutProperty = (typeof boundingLayoutProperties)[number];

/**
 * A value for a layout property should either be a number of pixels or the
 * name of another layout property, that it will copy from
 * */
export interface RenderInfo {
  renderSize: PIXI.IPointData;
}

export interface LayoutValueResolvableContext<LayoutOptionsType>
  extends RenderInfo {
  layoutOptions: Partial<
    resolvable.ResolvableObject<
      LayoutOptionsType,
      LayoutValueResolvableContext<LayoutOptionsType>
    >
  >;
  layoutItem: LayoutItem;
}

export type Directions = "none" | "horizontally" | "vertically" | "both";

export type KeepAspectRatioValue = "none" | "min" | "max";

export class LayoutOptions {
  /** The layout item should not be smaller than this */
  minWidth?: number;
  /** The layout item should not be smaller than this */
  minHeight?: number;

  /** The layout item should ideally be at this size */
  idealWidth?: number;
  /** The layout item should ideall be this */
  idealHeight?: number;

  /** The layout item should not be larger than this */
  maxWidth?: number;
  /** The layout item should not be larger than this */
  maxHeight?: number;

  /** Padding on the side of the provided bounds */
  paddingLeft: number = 0;
  /** Padding on the side of the provided bounds */
  paddingRight: number = 0;
  /** Padding on the side of the provided bounds */
  paddingTop: number = 0;
  /** Padding on the side of the provided bounds */
  paddingBottom: number = 0;

  /**
   * When provided bounds are larger than ideal size,
   * the item will try to expand until reaching max size in these directions
   * */
  canShrink: Directions = "none";

  /**
   * When provided bounds are smaller than ideal size,
   * will try to shrink until reaching min size in these directions
   * */
  canGrow: Directions = "none";

  /**
   * If true, will try to scale the layout item to grow or shrink,
   * provided that `canGrow` or `canShrink` are true.
   * If false, item might be aligned within the bounds, but not scaled.
   */
  canScale = false;

  /**
   * Where the item should be aligned within the provided bounds.
   * If the space is unbounded, only `"left"` is allowed.
   */
  horizontalAlign: "left" | "right" | "center" = "left";
  /**
   * Where the item should be aligned within the provided bounds.
   * If the space is unbounded, only `"top"` is allowed.
   */
  verticalAlign: "top" | "bottom" | "middle" = "top";

  /**
   * Scale the horizontal and vertical axes by the same amount?
   *
   * - `no` - the axes scale seperately
   * - `min` - the min value is used, the item is fully within the box, with blank areas
   * - `max - the max vale is used, the item may overflow the box
   * */
  keepAspectRatio: KeepAspectRatioValue = "none";

  /** When aligning, adjust for non-zero anchor points */
  alignBasedOnAnchor = false;
}

export type LayoutItemChildChipOptions = Array<
  booyah.ActivateChildChipOptions | booyah.ChipResolvable
>;

/**
 * Either a bounded rectangle, where width and height are defined,
 * or an unbounded rectangle, with just a top-left position.
 */
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

/**
 * Info provided to `LayoutItem.resize()`.
 */
export interface ResizeInfo {
  /** Bounds relative to the screen */
  readonly absoluteBounds: Bounds;

  /** Bounds relative to the parent container */
  readonly localBounds: Bounds;
}

/**
 * Interface for an element that can be laid out on the screen.
 *
 * Accessing layout properties (minWidth, minHeight, idealWidth, etc.) is only
 * possible after calling `prepareResize()`
 *
 * Emits:
 *  - updated() - something changed, requesting an update
 *  - willResize(ResizeInfo)
 *  - didResize(ResizeInfo)
 */
export interface LayoutItem extends booyah.Chip {
  /**
   * The layout item should not be smaller than this.
   * Must call prepareResize() first.
   */
  readonly minWidth?: number;
  /**
   * The layout item should not be smaller than this.
   * Must call prepareResize() first.
   */
  readonly minHeight?: number;
  /**
   * The layout item should ideally by at least this size.
   * Must call prepareResize() first.
   */
  readonly idealWidth?: number;
  /**
   * The layout item should ideally by at least this size.
   * Must call prepareResize() first.
   */
  readonly idealHeight?: number;
  /**
   * The layout item should at most be this size.
   * Must call prepareResize() first.
   */
  readonly maxWidth?: number;
  /**
   * The layout item should at most be this size.
   * Must call prepareResize() first.
   */
  readonly maxHeight?: number;

  /**
   * Tells the LayoutItem that `resize()` will be called.
   * The LayoutItem should set its properties (minWidth, ...) at this time.
   * To do so, it has access to the size of the screen, but not the size of
   * its bounds, which will be given later when calling resize().
   */
  prepareResize(renderInfo: RenderInfo): void;

  /**
   * Tells the LayoutItem to place itself within the provided bounds.
   */
  resize(resizeInfo: ResizeInfo): void;

  /** Add a layout item as a child of this one*/
  addChildLayoutItem(child: LayoutItem): void;

  /** Remove a layout item as a child of this one */
  removeChildLayoutItem(child: LayoutItem): void;
}

export class LayoutItemBaseOptions<LayoutOptionsType extends LayoutOptions> {
  name?: string;
  layoutOptions?: Partial<
    resolvable.ResolvableObject<
      LayoutOptionsType,
      LayoutValueResolvableContext<LayoutOptionsType>
    >
  >;
  children: LayoutItemChildChipOptions = [];
}

export abstract class LayoutItemBase<
    LayoutOptionsType extends LayoutOptions = LayoutOptions,
    OptionsType extends
      LayoutItemBaseOptions<LayoutOptionsType> = LayoutItemBaseOptions<LayoutOptionsType>,
  >
  extends booyah.Parallel
  implements LayoutItem
{
  protected _options: OptionsType;

  protected _layoutOptionsResolver: resolvable.Resolver<
    OptionsType["layoutOptions"],
    LayoutValueResolvableContext<OptionsType["layoutOptions"]>
  >;

  protected _lastRenderInfo?: RenderInfo;
  protected _lastResizeInfo?: ResizeInfo;
  protected _lengthsCache?: Partial<Record<string, number>>;

  constructor(options?: Partial<OptionsType>) {
    const filledOptions = booyah.fillInOptions(
      options,
      new LayoutItemBaseOptions(),
    );
    filledOptions.layoutOptions = booyah.fillInOptions(
      filledOptions.layoutOptions,
      new LayoutOptions() as LayoutOptionsType,
    );
    super(filledOptions.children, { terminateOnCompletion: false });

    this._options = filledOptions as OptionsType;

    this._layoutOptionsResolver = new resolvable.Resolver<
      OptionsType["layoutOptions"],
      LayoutValueResolvableContext<OptionsType["layoutOptions"]>
    >(this.layoutOptions);
  }

  addChildLayoutItem(child: LayoutItem): void {
    throw new Error(`${this.constructor.name} can't have child display items`);
  }

  removeChildLayoutItem(child: LayoutItem): void {
    throw new Error(`${this.constructor.name}  can't have child display items`);
  }

  prepareResize(renderInfo: RenderInfo): void {
    this._layoutOptionsResolver.invalidate();
    this._lastRenderInfo = renderInfo;

    this._prepareResizeChildren();
    this._cacheLengths();
    this._cacheLengthsChildren();
    this._fixCachedLengths();

    this._onPrepareResize();

    // TODO: emit event?
  }

  protected _cacheLengths() {
    this._lengthsCache = {};

    this._cachePaddingLengths();
    this._cacheIdealLengths();
    this._cacheMinLengths();
    this._cacheMaxLengths();
  }

  protected _cachePaddingLengths() {
    // Handle padding values
    for (const prop of paddingLayoutProperties) {
      this._lengthsCache[prop] = this._parseLayoutPropertyAsNumber(prop);
    }
  }

  protected _cacheIdealLengths() {
    this._lengthsCache.idealWidth =
      this._parseLayoutPropertyAsOptionalNumber("idealWidth");
    this._lengthsCache.idealHeight =
      this._parseLayoutPropertyAsOptionalNumber("idealHeight");
  }

  protected _cacheMinLengths() {
    const canShrink = this._parseLayoutProperty("canShrink") as Directions;

    if (canShrink === "horizontally" || canShrink === "both") {
      this._lengthsCache.minWidth =
        this._parseLayoutPropertyAsOptionalNumber("minWidth");
    } else {
      this._lengthsCache.minWidth = this._lengthsCache.idealWidth;
    }

    if (canShrink === "vertically" || canShrink === "both") {
      this._lengthsCache.minHeight =
        this._parseLayoutPropertyAsOptionalNumber("minHeight");
    } else {
      this._lengthsCache.minHeight = this._lengthsCache.idealHeight;
    }
  }

  protected _cacheMaxLengths() {
    const canGrow = this._parseLayoutProperty("canGrow") as Directions;

    if (canGrow === "horizontally" || canGrow === "both") {
      this._lengthsCache.maxWidth =
        this._parseLayoutPropertyAsOptionalNumber("maxWidth");
    } else {
      this._lengthsCache.maxWidth = this._lengthsCache.idealWidth;
    }

    if (canGrow === "vertically" || canGrow === "both") {
      this._lengthsCache.maxHeight =
        this._parseLayoutPropertyAsOptionalNumber("maxHeight");
    } else {
      this._lengthsCache.maxHeight = this._lengthsCache.idealHeight;
    }
  }

  protected _cacheLengthsChildren() {
    // no op
  }

  protected _fixCachedLengths() {
    // TODO: fix padding values?

    // Adjust width values
    if (typeof this._lengthsCache["minWidth"]) {
      // min <= ideal
      if (
        typeof this._lengthsCache["idealWidth"] !== "undefined" &&
        this._lengthsCache["idealWidth"] < this._lengthsCache["minWidth"]
      ) {
        this._lengthsCache["idealWidth"] = this._lengthsCache["minWidth"];
      }

      // min <= max
      if (
        typeof this._lengthsCache["maxWidth"] !== "undefined" &&
        this._lengthsCache["maxWidth"] < this._lengthsCache["minWidth"]
      ) {
        this._lengthsCache["maxWidth"] = this._lengthsCache["minWidth"];
      }
    }

    // ideal <= max
    if (
      typeof this._lengthsCache["idealWidth"] !== "undefined" &&
      typeof this._lengthsCache["maxWidth"] !== "undefined" &&
      this._lengthsCache["maxWidth"] < this._lengthsCache["idealWidth"]
    ) {
      this._lengthsCache["idealWidth"] = this._lengthsCache["maxWidth"];
    }

    // Adjust height values
    if (typeof this._lengthsCache["minHeight"]) {
      // min <= ideal
      if (
        typeof this._lengthsCache["idealHeight"] !== "undefined" &&
        this._lengthsCache["idealHeight"] < this._lengthsCache["minHeight"]
      ) {
        this._lengthsCache["idealHeight"] = this._lengthsCache["minHeight"];
      }

      // min <= max
      if (
        typeof this._lengthsCache["maxHeight"] !== "undefined" &&
        this._lengthsCache["maxHeight"] < this._lengthsCache["minHeight"]
      ) {
        this._lengthsCache["maxHeight"] = this._lengthsCache["minHeight"];
      }
    }

    // ideal <= max
    if (
      typeof this._lengthsCache["idealHeight"] !== "undefined" &&
      typeof this._lengthsCache["maxHeight"] !== "undefined" &&
      this._lengthsCache["maxHeight"] < this._lengthsCache["idealHeight"]
    ) {
      this._lengthsCache["idealHeight"] = this._lengthsCache["maxHeight"];
    }
  }

  protected _prepareResizeChildren() {
    // no op
  }

  protected _onPrepareResize() {
    // no op
  }

  resize(resizeInfo: ResizeInfo): void {
    this._lastResizeInfo = resizeInfo;
    this.emit("willResize", resizeInfo);

    this._validateBounds();
    this._determineScaleAndPosition();
    this._updateDynamicProperties();

    this._resizeChildren();

    this._onResize();

    this.emit("didResize", resizeInfo);
  }

  protected _validateBounds() {
    // Assert that widths make sense
    if (typeof this.minWidth !== "undefined") {
      if (
        typeof this.idealWidth !== "undefined" &&
        this.minWidth > this.idealWidth
      ) {
        console.error(
          `Bad widths on layout item. Min width ${this.minWidth} > ideal width ${this.idealWidth}`,
        );
      }

      if (
        typeof this.maxWidth !== "undefined" &&
        this.minWidth > this.maxWidth
      ) {
        console.error(
          `Bad widths on layout item. Min width ${this.minWidth} > max width ${this.maxWidth}`,
        );
      }
    }

    if (
      typeof this.idealWidth !== "undefined" &&
      typeof this.maxWidth !== "undefined" &&
      this.idealWidth > this.maxWidth
    ) {
      console.error(
        `Bad widths on layout item. Ideal width ${this.idealHeight} > max width ${this.maxWidth}`,
        this,
      );
    }

    // Assert that heights make sense
    if (typeof this.minHeight !== "undefined") {
      if (
        typeof this.idealHeight !== "undefined" &&
        this.minHeight > this.idealHeight
      ) {
        console.error(
          `Bad heights on layout item. Min height ${this.minHeight} > ideal height ${this.idealHeight}`,
          this,
        );
      }

      if (
        typeof this.maxHeight !== "undefined" &&
        this.minHeight > this.maxHeight
      ) {
        console.error(
          `Bad heights on layout item. Min height ${this.minHeight} > max height ${this.maxHeight}`,
          this,
        );
      }

      // Assert you have sufficient space
      if (
        typeof this.minWidth !== "undefined" &&
        typeof this._lastResizeInfo.absoluteBounds.width !== "undefined" &&
        this._lastResizeInfo.absoluteBounds.width < this.minWidth
      )
        console.error(
          `Insufficient width to layout item. Bounds.width = ${this._lastResizeInfo.absoluteBounds.width} and minWidth = ${this.minWidth}`,
          this,
        );
      if (
        typeof this.minHeight !== "undefined" &&
        typeof this._lastResizeInfo.absoluteBounds.height !== "undefined" &&
        this._lastResizeInfo.absoluteBounds.height < this.minHeight
      )
        console.error(
          `Insufficient height to layout item. Bounds.height = ${this._lastResizeInfo.absoluteBounds.height} and minHeight = ${this.minHeight}`,
          this,
        );
    }

    if (
      typeof this.idealHeight !== "undefined" &&
      typeof this.maxHeight !== "undefined" &&
      this.idealHeight > this.maxHeight
    ) {
      console.error(
        `Bad heights on layout item. Ideal height ${this.idealHeight} > max height ${this.maxHeight}`,
      );
    }
  }

  protected _determineScaleAndPosition() {
    // no op
  }

  protected _updateDynamicProperties() {
    // no op
  }

  protected _resizeChildren() {
    // no op
  }

  protected _onResize(): void {
    // no op
  }

  calculateInnerBounds(bounds: Bounds) {
    return new Bounds(
      bounds.x + this.paddingLeft,
      bounds.y + this.paddingTop,
      bounds.isBoundedHorizontally()
        ? bounds.width! - this.paddingLeft - this.paddingRight
        : undefined,
      bounds.isBoundedVertically()
        ? bounds.height! - this.paddingTop - this.paddingBottom
        : undefined,
    );
  }

  get minWidth(): number | undefined {
    return this._lengthsCache.minWidth;
  }
  get minHeight(): number | undefined {
    return this._lengthsCache.minHeight;
  }

  get idealWidth(): number | undefined {
    return this._lengthsCache.idealWidth;
  }
  get idealHeight(): number | undefined {
    return this._lengthsCache.idealHeight;
  }

  get maxWidth(): number | undefined {
    return this._lengthsCache.maxWidth;
  }
  get maxHeight(): number | undefined {
    return this._lengthsCache.maxHeight;
  }

  get paddingLeft(): number {
    return this._lengthsCache.paddingLeft;
  }
  get paddingRight(): number {
    return this._lengthsCache.paddingRight;
  }
  get paddingTop(): number {
    return this._lengthsCache.paddingTop;
  }
  get paddingBottom(): number {
    return this._lengthsCache.paddingBottom;
  }

  get horizontalPadding(): number {
    return this.paddingLeft + this.paddingRight;
  }
  get verticalPadding(): number {
    return this.paddingTop + this.paddingBottom;
  }

  /** Request a new resize cycle */
  requestResize() {
    this.emit("updated");
  }

  get layoutOptions() {
    return this._options.layoutOptions;
  }

  get parentLayoutItem() {
    return this._chipContext.layoutItem as LayoutItem | undefined;
  }

  get lastResizeInfo() {
    return this._lastResizeInfo;
  }

  get lastRenderInfo() {
    return this._lastRenderInfo;
  }

  protected _parseLayoutProperty(
    prop: keyof LayoutOptionsType,
  ): number | boolean | string | undefined {
    const resolvableContext: LayoutValueResolvableContext<
      OptionsType["layoutOptions"]
    > = {
      layoutOptions: this.layoutOptions,
      layoutItem: this,
      ...this.lastRenderInfo,
    };
    const value = this._layoutOptionsResolver.resolve(prop, resolvableContext);

    // if (typeof value === "string" && isReferencableLayoutProperty(value)) {
    //   // Find matching property and return it
    //   const matchingProp = value as keyof this;
    //   const matchingValue = this[matchingProp];

    //   if (
    //     typeof matchingValue !== "number" &&
    //     typeof matchingValue !== "undefined"
    //   ) {
    //     throw new Error(
    //       `LayoutItem referencing property ${new String(matchingProp)} which is not a number. Value: ${matchingValue}`,
    //     );
    //   }

    //   return matchingValue;
    // }

    // @ts-ignore
    return value;
  }

  protected _parseLayoutPropertyAsOptionalNumber(
    prop: keyof OptionsType["layoutOptions"],
  ): number | undefined {
    const value = this._parseLayoutProperty(prop);
    if (typeof value !== "number" && typeof value !== "undefined") {
      throw new Error(
        `Cannot parseLayoutPropertyAsNumber the value "${value}"`,
      );
    }
    return value;
  }

  protected _parseLayoutPropertyAsNumber(
    prop: keyof OptionsType["layoutOptions"],
  ): number {
    return this._parseLayoutPropertyAsOptionalNumber(prop) || 0;
  }
}

export class SpacerLayoutOptions extends LayoutOptions {
  canShrink: Directions = "both";
  canGrow: Directions = "both";
}

/** Just takes up space */
export class SpacerChip<
  LayoutOptionsType extends SpacerLayoutOptions = SpacerLayoutOptions,
  OptionsType extends
    LayoutItemBaseOptions<LayoutOptionsType> = LayoutItemBaseOptions<LayoutOptionsType>,
> extends LayoutItemBase<LayoutOptionsType, OptionsType> {
  constructor(options?: Partial<LayoutItemBaseOptions<LayoutOptionsType>>) {
    const filledOptions = booyah.fillInOptions(
      options,
      new LayoutItemBaseOptions<LayoutOptionsType>(),
    );
    filledOptions.layoutOptions = booyah.fillInOptions(
      filledOptions.layoutOptions,
      new SpacerLayoutOptions() as LayoutOptionsType,
    );
    super(filledOptions as OptionsType);
  }

  protected _onActivate(): void {
    this.parentLayoutItem?.addChildLayoutItem(this);
  }

  protected _onTerminate(): void {
    this.parentLayoutItem?.removeChildLayoutItem(this);
  }
}

// /** Options provided to all the value functions on resize */
// export interface DisplayObjectValueFunctionOptions<
//   DisplayObjectType extends PIXI.DisplayObject,
// > {
//   displayObject: DisplayObjectType;
//   pixiAppChip: pixiApp.PixiAppChip;
//   renderSize: PIXI.IPointData;
// }

/** When resolving pixi display objects, accept numbers or IPointData for points */
export type DisplayObjectValueType<
  DisplayObjectType extends PIXI.DisplayObject,
  Property extends keyof DisplayObjectType,
> = DisplayObjectType[Property] extends PIXI.ObservablePoint
  ? PIXI.IPointData | number
  : DisplayObjectType[Property];

export type DisplayObjectTypeMap<DisplayObjectType extends PIXI.DisplayObject> =
  {
    [Property in keyof DisplayObjectType]: DisplayObjectValueType<
      DisplayObjectType,
      Property
    >;
  };

export type ResolvablePixiDisplayObject<
  DisplayObjectType extends PIXI.Container,
  LayoutOptionsType,
> = resolvable.ResolvableObject<
  DisplayObjectTypeMap<DisplayObjectType>,
  LayoutValueResolvableContext<LayoutOptionsType>
>;

export class DisplayObjectChipOptions<
  DisplayObjectType extends PIXI.Container,
  LayoutOptionsType extends LayoutOptions,
> extends LayoutItemBaseOptions<LayoutOptionsType> {
  displayObject!: DisplayObjectType;
  properties?: Partial<
    ResolvablePixiDisplayObject<DisplayObjectType, LayoutOptionsType>
  > = {};
  onResize?: (
    context: LayoutValueResolvableContext<LayoutOptionsType>,
  ) => unknown;

  addToParentLayoutItem = true;
  addToContainer = true;

  // /** When scaling, always scale by the same amount on both axes */
  // keepAspectRatio = false;

  // /** When aligning, adjust for non-zero anchor points */
  // alignBasedOnAnchor = true;

  /**
   * Create an intermediate container that can be manipulated
   * relative to the position provided by the layout
   * */
  makeOffsetContainer = true;

  /**
   * The height and width of the display object, when scaled to 1.
   * If not provided, will be calculated by calling `getLocalBounds()`
   * Does not include padding.
   */
  naturalInnerSize?: PIXI.IPointData;

  /**
   * The anchor position of the display object
   * If not provided, will be calculated by calling `getLocalBounds()`
   */
  anchorPosition?: PIXI.IPoint;
}

export abstract class DisplayObjectChip<
  DisplayObjectType extends PIXI.Container,
  LayoutOptionsType extends LayoutOptions = LayoutOptions,
  OptionsType extends DisplayObjectChipOptions<
    DisplayObjectType,
    LayoutOptionsType
  > = DisplayObjectChipOptions<DisplayObjectType, LayoutOptionsType>,
> extends LayoutItemBase<LayoutOptionsType, OptionsType> {
  protected _propertiesResolver: resolvable.Resolver<
    ResolvablePixiDisplayObject<DisplayObjectType, LayoutOptionsType>,
    LayoutValueResolvableContext<LayoutOptionsType>
  >;

  protected _offsetContainer?: PIXI.Container;
  protected _naturalInnerSize: PIXI.IPointData;
  protected _anchorPosition: PIXI.IPointData;

  constructor(options: OptionsType) {
    super(options);

    this._propertiesResolver = new resolvable.Resolver(options.properties);

    if (this._options.makeOffsetContainer) {
      this._offsetContainer = new PIXI.Container();
      this._offsetContainer.addChild(this.displayObject);
    }

    if (typeof this._options.naturalInnerSize === "undefined") {
      this.updateNaturalInnerSize();
    } else {
      this._naturalInnerSize = this._options.naturalInnerSize;
    }

    if (typeof this._options.anchorPosition === "undefined") {
      this.updateAnchorPosition();
    } else {
      this._anchorPosition = this._options.anchorPosition;
    }
  }

  protected _onActivate() {
    super._onActivate();

    // Set initial values for properties
    const resolvableContext: LayoutValueResolvableContext<LayoutOptionsType> = {
      layoutOptions: this.layoutOptions,
      layoutItem: this,
      renderSize: this.pixiAppChip.renderSize,
    };

    // Set name of DisplayObject, if provided
    if (this._options.name) {
      this.displayObject.name = this._options.name;
    }

    for (const prop of this._propertiesResolver.properties) {
      this.updateProperty(
        prop,
        // @ts-ignore
        this._propertiesResolver.resolve(prop, resolvableContext),
      );
    }

    if (
      !this._options.hasOwnProperty("addToContainer") ||
      this._options.addToContainer
    ) {
      const containerToAdd = this._options.makeOffsetContainer
        ? this._offsetContainer
        : this._options.displayObject;
      this._chipContext.container.addChild(containerToAdd);
    }

    // Optionally participate in the layout
    if (this._options.addToParentLayoutItem && this.parentLayoutItem) {
      // When _onResize() is called, it will call _updateProperties()
      this.parentLayoutItem.addChildLayoutItem(this);
    } else {
      // Call _updateProperties() directly
      this._subscribe(
        this.pixiAppChip,
        "didResize",
        this._updateDynamicProperties,
      );
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
      this._chipContext.container.removeChild(
        this._offsetContainer || this._options.displayObject,
      );
    }

    super._onTerminate();
  }

  // protected _onResize(): void {
  //   // this._determineScaleAndPosition();

  //   // this._updateDynamicProperties();
  // }

  protected _determineScaleAndPosition() {
    const innerBounds = this.calculateInnerBounds(
      this.lastResizeInfo!.localBounds,
    );

    // let horizontalScale = 1;
    // let verticalScale = 1;

    // Reason in inner sizes, without padding
    const idealInnerWidth = this.idealWidth
      ? this.idealWidth - (this.paddingLeft + this.paddingRight)
      : 0;
    const idealInnerHeight = this.idealHeight
      ? this.idealHeight - (this.paddingTop + this.paddingBottom)
      : 0;

    let finalInnerWidth = idealInnerWidth;
    let finalInnerHeight = idealInnerHeight;

    if (innerBounds.isBoundedHorizontally()) {
      if (
        this._parseLayoutProperty("canShrink") &&
        innerBounds.width! < idealInnerWidth
      ) {
        // Shrink, but not beyond the min size
        if (typeof this.minWidth !== "undefined") {
          const minInnerWidth =
            this.minWidth - (this.paddingLeft + this.paddingRight);
          finalInnerWidth = Math.max(innerBounds.width!, minInnerWidth);
        } else {
          finalInnerWidth = innerBounds.width!;
        }
      } else if (
        this._parseLayoutProperty("canGrow") &&
        innerBounds.width! > idealInnerWidth
      ) {
        // Grow, but not beyond the max size
        if (typeof this.maxWidth !== "undefined") {
          const maxInnerWidth =
            this.maxWidth - (this.paddingLeft + this.paddingRight);
          finalInnerWidth = Math.min(maxInnerWidth, innerBounds.width!);
        } else {
          finalInnerWidth = innerBounds.width!;
        }
      }
    }

    if (innerBounds.isBoundedVertically()) {
      if (
        this._parseLayoutProperty("canShrink") &&
        innerBounds.height! < idealInnerHeight
      ) {
        // Shrink, but not beyond the min size
        if (typeof this.minHeight !== "undefined") {
          const minInnerHeight =
            this.minHeight - (this.paddingTop + this.paddingBottom);
          finalInnerHeight = Math.max(innerBounds.height!, minInnerHeight);
        } else {
          finalInnerHeight = innerBounds.height!;
        }
      } else if (
        this._parseLayoutProperty("canGrow") &&
        innerBounds.height! > idealInnerHeight
      ) {
        // Grow, but not beyond the max size
        if (typeof this.maxHeight !== "undefined") {
          const maxInnerHeight =
            this.maxHeight - (this.paddingTop + this.paddingBottom);
          finalInnerHeight = Math.min(maxInnerHeight, innerBounds.height!);
        } else {
          finalInnerHeight = innerBounds.height!;
        }
      }
    }

    if (this._parseLayoutProperty("canScale")) {
      this._setInnerSize(finalInnerWidth, finalInnerHeight);
    }

    // if (this._options.layoutOptions.keepAspectRatio) {
    //   const minScale = Math.min(horizontalScale, verticalScale);
    //   horizontalScale = minScale;
    //   verticalScale = minScale;
    // }

    // const scaledWidth = idealInnerWidth * horizontalScale;
    // const scaledHeight = idealInnerHeight * verticalScale;
    // this._setSize({
    //   scaledWidth,
    //   scaledHeight,
    //   horizontalScale,
    //   verticalScale,
    // });

    const position = new PIXI.Point(innerBounds.x, innerBounds.y);

    // If the object has an non-zero anchor point, adjust the position
    if (this._options.layoutOptions.alignBasedOnAnchor) {
      position.x -= this._anchorPosition.x;
      position.y -= this._anchorPosition.y;
    }

    // Handle horizontal alignment
    if (innerBounds.isBoundedHorizontally()) {
      if (
        this._options.layoutOptions.horizontalAlign !== "left" &&
        innerBounds.width! > finalInnerWidth
      ) {
        const extraSpace = innerBounds.width! - finalInnerWidth;
        if (this._options.layoutOptions.horizontalAlign === "right") {
          position.x += extraSpace;
        } else if (this._options.layoutOptions.horizontalAlign === "center") {
          position.x += extraSpace / 2;
        }
      }
    } else if (this._options.layoutOptions.horizontalAlign !== "left") {
      console.error(
        `DisplayObjectLeafChip: Within unbounded layout, cannot horizontally align as requested: ${this._options.layoutOptions.horizontalAlign}`,
      );
    }

    // Handle vertical alignment
    if (innerBounds.isBoundedVertically()) {
      if (
        this._options.layoutOptions.verticalAlign !== "top" &&
        innerBounds.height! > finalInnerHeight
      ) {
        const extraSpace = innerBounds.height! - finalInnerHeight;
        if (this._options.layoutOptions.verticalAlign === "bottom") {
          position.y += extraSpace;
        } else if (this._options.layoutOptions.verticalAlign === "middle") {
          position.y += extraSpace / 2;
        }
      }
    } else if (this._options.layoutOptions.verticalAlign !== "top") {
      console.error(
        `DisplayObjectLeafChip: Within unbounded layout, cannot vertically align as requested: ${this._options.layoutOptions.verticalAlign}`,
      );
    }

    this._setPosition(position, finalInnerWidth, finalInnerHeight);
  }

  protected _updateDynamicProperties() {
    this._propertiesResolver.invalidate();

    // Update dynamic properties
    const resolvableContext: LayoutValueResolvableContext<LayoutOptionsType> = {
      layoutOptions: this.layoutOptions,
      layoutItem: this,
      ...this.lastRenderInfo!,
    };

    for (const prop of this._propertiesResolver.dynamicProperties) {
      this.updateProperty(
        prop,
        // @ts-ignore
        this._propertiesResolver.resolve(prop, resolvableContext),
      );
    }

    this._options.onResize?.(resolvableContext);
  }

  get pixiAppChip() {
    return this._chipContext.pixiAppChip as pixiApp.PixiAppChip;
  }

  get displayObject() {
    return this._options.displayObject;
  }

  get name() {
    return this._options.name;
  }

  updateProperty<Property extends keyof DisplayObjectType>(
    property: Property,
    value: DisplayObjectValueType<DisplayObjectType, Property>,
  ) {
    if (this.displayObject[property] instanceof PIXI.ObservablePoint) {
      if (typeof value === "number") {
        (this.displayObject[property] as PIXI.ObservablePoint).set(
          value as number,
        );
      } else {
        // Assume it's a IPointData
        (this.displayObject[property] as PIXI.ObservablePoint).copyFrom(
          value as PIXI.IPointData,
        );
      }
    } else {
      this.displayObject[property] = value as DisplayObjectType[Property];
    }
  }

  get offsetContainer(): PIXI.Container | undefined {
    return this._offsetContainer;
  }

  /** Recalculate the size of the display object based on `getLocalBounds()`  */
  updateNaturalInnerSize() {
    const pixiLocalBounds = this._options.displayObject.getLocalBounds();

    this.naturalInnerSize = new PIXI.Point(
      pixiLocalBounds.width,
      pixiLocalBounds.height,
    );
  }

  get naturalInnerSize() {
    return this._naturalInnerSize;
  }

  set naturalInnerSize(value: PIXI.IPointData) {
    this._naturalInnerSize = value;
    this.requestResize();
  }

  /** Recalculate the anchor position based on `getLocalBounds()`  */
  updateAnchorPosition() {
    const pixiLocalBounds = this._options.displayObject.getLocalBounds();
    this.anchorPosition = new PIXI.Point(pixiLocalBounds.x, pixiLocalBounds.y);
  }

  get anchorPosition() {
    return this._anchorPosition;
  }

  set anchorPosition(value: PIXI.IPointData) {
    this._anchorPosition = value;
    this.requestResize();
  }

  get contextModification() {
    if (!this._options.makeOffsetContainer) return super.contextModification;

    const parentValue = super.contextModification;
    return Object.assign({}, parentValue, {
      container: this._offsetContainer,
    });
  }

  protected _setInnerSize(innerWidth: number, innerHeight: number) {
    let horizontalScale = innerWidth / this._naturalInnerSize.x;
    let verticalScale = innerHeight / this._naturalInnerSize.y;

    if (this._options.layoutOptions.keepAspectRatio === "min") {
      const minScale = Math.min(horizontalScale, verticalScale);
      horizontalScale = minScale;
      verticalScale = minScale;
    } else if (this._options.layoutOptions.keepAspectRatio === "max") {
      const maxScale = Math.max(horizontalScale, verticalScale);
      horizontalScale = maxScale;
      verticalScale = maxScale;
    }

    this._options.displayObject.scale.set(horizontalScale, verticalScale);
  }

  protected _setPosition(
    position: PIXI.IPointData,
    finalInnerWidth: number,
    finalInnerHeight: number,
  ) {
    this._options.displayObject.position.copyFrom(position);
  }

  get naturalInnerWidth() {
    return this._naturalInnerSize.x;
  }
  get naturalInnerHeight() {
    return this._naturalInnerSize.y;
  }

  get naturalOuterWidth() {
    return this._naturalInnerSize.x + this.horizontalPadding;
  }
  get naturalOuterHeight() {
    return this._naturalInnerSize.y + this.verticalPadding;
  }
}

export class DisplayObjectLeafChipLayoutOptions extends LayoutOptions {
  canScale = true;
  alignBasedOnAnchor = true;
}

/**
 * An object that is at the end of a PIXI scene graph, such as a Sprite.
 * Any layout items placed beneath a leaf will not be laid out.
 */
export class DisplayObjectLeafChipOptions<
  DisplayObjectType extends PIXI.Container,
  LayoutOptionsType extends
    DisplayObjectLeafChipLayoutOptions = DisplayObjectLeafChipLayoutOptions,
> extends DisplayObjectChipOptions<DisplayObjectType, LayoutOptionsType> {}

export class DisplayObjectLeafChip<
  DisplayObjectType extends PIXI.Container,
  LayoutOptionsType extends LayoutOptions = LayoutOptions,
  OptionsType extends DisplayObjectLeafChipOptions<
    DisplayObjectType,
    LayoutOptionsType
  > = DisplayObjectLeafChipOptions<DisplayObjectType, LayoutOptionsType>,
> extends DisplayObjectChip<DisplayObjectType, LayoutOptionsType, OptionsType> {
  constructor(
    options?: Partial<
      DisplayObjectLeafChipOptions<DisplayObjectType, LayoutOptionsType>
    >,
  ) {
    const filledOptions = booyah.fillInOptions(
      options,
      new DisplayObjectLeafChipOptions<DisplayObjectType, LayoutOptionsType>(),
    );
    filledOptions.layoutOptions = booyah.fillInOptions(
      options.layoutOptions,
      new DisplayObjectLeafChipLayoutOptions() as LayoutOptionsType,
    );

    super(filledOptions as OptionsType);
  }

  protected _cacheIdealLengths(): void {
    this._lengthsCache.idealWidth =
      this._parseLayoutPropertyAsOptionalNumber("idealWidth") ??
      this.naturalOuterWidth;
    this._lengthsCache.idealHeight =
      this._parseLayoutPropertyAsOptionalNumber("idealHeight") ??
      this.naturalOuterHeight;
  }

  // protected override _onResize(): void {
  //   if (!this.displayObject.parent)
  //     throw new Error("Cannot layout display object without a parent");

  //   let horizontalScale = 1;
  //   let verticalScale = 1;

  //   // Reason in inner sizes, without padding
  //   const idealInnerWidth = this.idealWidth
  //     ? this.idealWidth - (this.paddingLeft + this.paddingRight)
  //     : 0;
  //   const idealInnerHeight = this.idealHeight
  //     ? this.idealHeight - (this.paddingTop + this.paddingBottom)
  //     : 0;

  //   const innerBounds = this.calculateInnerBounds(
  //     this.lastResizeInfo!.localBounds,
  //   );

  //   if (innerBounds.isBoundedHorizontally()) {
  //     if (innerBounds.width! < idealInnerWidth) {
  //       // Shrink, but not beyond the min size
  //       if (typeof this.minWidth !== "undefined") {
  //         const minInnerWidth =
  //           this.minWidth - (this.paddingLeft + this.paddingRight);
  //         horizontalScale =
  //           Math.max(innerBounds.width!, minInnerWidth) / idealInnerWidth;
  //       } else {
  //         horizontalScale = innerBounds.width! / idealInnerWidth;
  //       }
  //     } else if (innerBounds.width! > idealInnerWidth) {
  //       // Grow, but not beyond the max size
  //       if (typeof this.maxWidth !== "undefined") {
  //         const maxInnerWidth =
  //           this.maxWidth - (this.paddingLeft + this.paddingRight);
  //         horizontalScale =
  //           Math.min(maxInnerWidth, innerBounds.width!) / idealInnerWidth;
  //       } else {
  //         horizontalScale = innerBounds.width! / idealInnerWidth;
  //       }
  //     }
  //   }

  //   if (innerBounds.isBoundedVertically()) {
  //     if (innerBounds.height! < idealInnerHeight) {
  //       // Shrink, but not beyond the min size
  //       if (typeof this.minHeight !== "undefined") {
  //         const minInnerHeight =
  //           this.minHeight - (this.paddingTop + this.paddingBottom);
  //         verticalScale =
  //           Math.max(innerBounds.height!, minInnerHeight) / idealInnerHeight;
  //       } else {
  //         verticalScale = innerBounds.height! / idealInnerHeight;
  //       }
  //     } else if (innerBounds.height! > idealInnerHeight) {
  //       // Grow, but not beyond the max size
  //       if (typeof this.maxHeight !== "undefined") {
  //         const maxInnerHeight =
  //           this.maxHeight - (this.paddingTop + this.paddingBottom);
  //         verticalScale =
  //           Math.min(maxInnerHeight, innerBounds.height!) / idealInnerHeight;
  //       } else {
  //         verticalScale = innerBounds.height! / idealInnerHeight;
  //       }
  //     }
  //   }

  //   if (this._options.layoutOptions.keepAspectRatio) {
  //     const minScale = Math.min(horizontalScale, verticalScale);
  //     horizontalScale = minScale;
  //     verticalScale = minScale;
  //   }

  //   const scaledWidth = idealInnerWidth * horizontalScale;
  //   const scaledHeight = idealInnerHeight * verticalScale;
  //   this._setSize({
  //     scaledWidth,
  //     scaledHeight,
  //     horizontalScale,
  //     verticalScale,
  //   });

  //   const position = new PIXI.Point(innerBounds.x, innerBounds.y);

  //   // If the object has an non-zero anchor point, adjust the position
  //   if (this._options.layoutOptions.alignBasedOnAnchor) {
  //     position.x -= this._localBounds!.x;
  //     position.y -= this._localBounds!.y;
  //   }

  //   // Handle horizontal alignment
  //   if (innerBounds.isBoundedHorizontally()) {
  //     if (
  //       this._options.layoutOptions.horizontalAlign !== "left" &&
  //       innerBounds.width! > scaledWidth
  //     ) {
  //       const extraSpace = innerBounds.width! - scaledWidth;
  //       if (this._options.layoutOptions.horizontalAlign === "right") {
  //         position.x += extraSpace;
  //       } else if (this._options.layoutOptions.horizontalAlign === "center") {
  //         position.x += extraSpace / 2;
  //       }
  //     }
  //   } else if (this._options.layoutOptions.horizontalAlign !== "left") {
  //     console.error(
  //       `DisplayObjectLeafChip: Within unbounded layout, cannot horizontally align as requested: ${this._options.layoutOptions.horizontalAlign}`,
  //     );
  //   }

  //   // Handle vertical alignment
  //   if (innerBounds.isBoundedVertically()) {
  //     if (
  //       this._options.layoutOptions.verticalAlign !== "top" &&
  //       innerBounds.height! > scaledHeight
  //     ) {
  //       const extraSpace = innerBounds.height! - scaledHeight;
  //       if (this._options.layoutOptions.verticalAlign === "bottom") {
  //         position.y += extraSpace;
  //       } else if (this._options.layoutOptions.verticalAlign === "middle") {
  //         position.y += extraSpace / 2;
  //       }
  //     }
  //   } else if (this._options.layoutOptions.verticalAlign !== "top") {
  //     console.error(
  //       `DisplayObjectLeafChip: Within unbounded layout, cannot vertically align as requested: ${this._options.layoutOptions.verticalAlign}`,
  //     );
  //   }

  //   this._setPosition(position);

  //   super._onResize();
  // }

  // protected _setSize({
  //   horizontalScale,
  //   verticalScale,
  // }: {
  //   scaledWidth: number;
  //   scaledHeight: number;
  //   horizontalScale: number;
  //   verticalScale: number;
  // }) {
  //   this._options.displayObject.scale.set(horizontalScale, verticalScale);
  // }

  // protected _setPosition(position: PIXI.IPointData) {
  //   this._options.displayObject.position.copyFrom(position);
  // }

  // updateNaturalSize() {
  //   this._localBounds = Bounds.fromRectangle(
  //     this._options.displayObject.getLocalBounds(),
  //   );

  //   if (typeof this._options.layoutOptions.idealWidth === "undefined") {
  //     this._pixiIdealWidth =
  //       this._localBounds.width! + this.paddingLeft + this.paddingRight;
  //   } else {
  //     this._pixiIdealWidth = this.parseLayoutPropertyAsNumber("idealWidth");
  //   }

  //   if (typeof this._options.layoutOptions.idealHeight === "undefined") {
  //     this._pixiIdealHeight =
  //       this._localBounds.height! + this.paddingTop + this.paddingBottom;
  //   } else {
  //     this._pixiIdealHeight = this.parseLayoutPropertyAsNumber("idealHeight");
  //   }
  // }

  // get idealWidth() {
  //   return (
  //     super.idealWidth ?? this._pixiIdealWidth ?? this._lengthsCache.idealWidth
  //   );
  // }

  // // Can't use a regular setter because this is a read-only property in a superclass
  // setIdealWidth(value: number) {
  //   this._pixiIdealWidth = value;
  //   this.requestResize();
  // }

  // get idealHeight() {
  //   return (
  //     super.idealHeight ??
  //     this._pixiIdealHeight ??
  //     this._lengthsCache.idealHeight
  //   );
  // }

  // // Can't use a regular setter because this is a read-only property in a superclass
  // setIdealHeight(value: number) {
  //   this._pixiIdealHeight = value;
  //   this.requestResize();
  // }

  // get minWidth() {
  //   return super.minWidth ?? this._lengthsCache.minWidth;
  // }
  // get minHeight() {
  //   return super.minHeight ?? this._lengthsCache.minHeight;
  // }

  // get maxWidth() {
  //   return super.maxWidth ?? this._lengthsCache.maxWidth;
  // }
  // get maxHeight() {
  //   return super.maxHeight ?? this._lengthsCache.maxHeight;
  // }
}

export class SpriteChipLayoutOptions extends DisplayObjectLeafChipLayoutOptions {
  keepAspectRatio: KeepAspectRatioValue = "min";

  // canGrow: Directions = "none";
  canShrink: Directions = "both";
}

export class SpriteChipOptions extends DisplayObjectLeafChipOptions<PIXI.Sprite> {
  /** Either the texture itself, or a name to search for in PIXI.Assets */
  texture?: PIXI.Texture | string;
}

/** A chip to display a PIXI.Sprite */
export class SpriteChip extends DisplayObjectLeafChip<PIXI.Sprite> {
  constructor(options?: Partial<SpriteChipOptions>) {
    const filledOptions = booyah.fillInOptions(
      options,
      new SpriteChipOptions(),
    );
    filledOptions.layoutOptions = booyah.fillInOptions(
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

export class NineSlicePlaneChipLayoutOptions extends DisplayObjectLeafChipLayoutOptions {
  canShrink: Directions = "both";
  canGrow: Directions = "both";
}

export class NineSlicePlaneChipOptions extends DisplayObjectLeafChipOptions<PIXI.NineSlicePlane> {
  /** Either the texture itself, or a name to search for in PIXI.Assets */
  texture?: PIXI.Texture | string;

  /** The nine-slice widths. Otherwise it will use those encoded in the spritesheet (e.g. using TexturePacker) */
  nineSliceWidths?: Partial<NineSliceWidths>;
}

/** A chip to display a PIXI.NineSlicePlane */
export class NineSlicePlaneChip extends DisplayObjectLeafChip<PIXI.NineSlicePlane> {
  constructor(options: Partial<NineSlicePlaneChipOptions>) {
    const filledOptions = booyah.fillInOptions(
      options,
      new NineSlicePlaneChipOptions(),
    );
    filledOptions.layoutOptions = booyah.fillInOptions(
      filledOptions.layoutOptions,
      new NineSlicePlaneChipLayoutOptions(),
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

  protected _setInnerSize(innerWidth: number, innerHeight: number) {
    if (this._options.layoutOptions.keepAspectRatio !== "none") {
      let horizontalScale = innerWidth / this._naturalInnerSize.x;
      let verticalScale = innerHeight / this._naturalInnerSize.y;

      const scale =
        this._options.layoutOptions.keepAspectRatio === "min"
          ? Math.min(horizontalScale, verticalScale)
          : Math.max(horizontalScale, verticalScale);
      innerWidth = scale * this._naturalInnerSize.x;
      innerHeight = scale * this._naturalInnerSize.y;
    }

    this._options.displayObject.width = innerWidth;
    this._options.displayObject.height = innerHeight;
  }
}

/** A chip to display a PIXI.Text */
export class TextChipLayoutOptions extends DisplayObjectLeafChipLayoutOptions {
  keepAspectRatio: KeepAspectRatioValue = "min";

  // canGrow: Directions = "none";
  // canShrink: Directions = "none";
}

export class TextChipOptions extends DisplayObjectLeafChipOptions<PIXI.Text> {
  text?: string;
  style?: Partial<PIXI.ITextStyle> | PIXI.TextStyle;
}

export class TextChip extends DisplayObjectLeafChip<PIXI.Text> {
  constructor(options: Partial<TextChipOptions>) {
    const filledOptions = booyah.fillInOptions(options, new TextChipOptions());
    filledOptions.layoutOptions = booyah.fillInOptions(
      filledOptions.layoutOptions,
      new TextChipLayoutOptions(),
    );

    if (!filledOptions.displayObject) {
      filledOptions.displayObject = new PIXI.Text(
        options.text || "",
        options.style,
      );
    }

    super(filledOptions);
  }
}

/**
 * Manages a PIXI.Container that will be layed out, but will not act as a parent for other layout children
 * */
export class ContainerLeafChip extends DisplayObjectLeafChip<PIXI.Container> {
  constructor(options?: Partial<DisplayObjectLeafChipOptions<PIXI.Container>>) {
    const filledOptions = booyah.fillInOptions(
      options,
      new DisplayObjectLeafChipOptions<PIXI.Container>(),
    );

    if (!filledOptions.displayObject) {
      filledOptions.displayObject = new PIXI.Container();
    }

    super(filledOptions);
  }

  get contextModification(): booyah.ChipContextResolvable {
    return {
      container: this.displayObject,
    };
  }
}

/**
 * Manages a PIXI.Container that participates in the layout
 */
export abstract class ContainerBase<
  LayoutOptionsType extends LayoutOptions = LayoutOptions,
  OptionsType extends DisplayObjectChipOptions<
    PIXI.Container,
    LayoutOptionsType
  > = DisplayObjectChipOptions<PIXI.Container, LayoutOptionsType>,
> extends DisplayObjectChip<PIXI.Container, LayoutOptionsType, OptionsType> {
  protected _childLayoutItems?: Array<LayoutItem>;
  protected _childResizeInfo?: ResizeInfo;

  // protected _aggregatedChildValues?: Partial<
  //   Record<ReferencableLayoutProperty, number>
  // >;

  constructor(
    options?: Partial<
      DisplayObjectChipOptions<PIXI.Container, LayoutOptionsType>
    >,
  ) {
    const filledOptions = booyah.fillInOptions(
      options,
      new DisplayObjectChipOptions<PIXI.Container, LayoutOptionsType>(),
    ) as OptionsType;
    if (!filledOptions.displayObject) {
      filledOptions.displayObject = new PIXI.Container();
    }

    super(filledOptions);
  }

  protected _onActivate(): void {
    this._childLayoutItems = [];
    // this._aggregatedChildValues = {};

    super._onActivate();
  }

  addChildLayoutItem(child: LayoutItem): void {
    const index = this._childLayoutItems!.indexOf(child);
    if (index !== -1)
      throw new Error("Cannot add duplicate child display item");

    this._childLayoutItems!.push(child);

    this._subscribe(child, "updated", this.requestResize);
    this.requestResize();
  }

  removeChildLayoutItem(child: LayoutItem): void {
    const index = this._childLayoutItems!.indexOf(child);
    if (index === -1)
      throw new Error("Cannot find child display item to remove");

    this._childLayoutItems!.splice(index, 1);
    this._unsubscribe(child);

    this.requestResize();
  }

  protected _prepareResizeChildren(): void {
    for (const child of this._childLayoutItems!) {
      child.prepareResize(this._lastRenderInfo);
    }
  }

  protected override _cacheLengthsChildren(): void {
    // Start with ideal lengths
    if (typeof this._lengthsCache.idealWidth === "undefined") {
      let value = this._aggregateIdealWidth();
      if (typeof value !== "undefined") {
        this._lengthsCache.idealWidth = value + this.horizontalPadding;
      }
    }
    if (typeof this._lengthsCache.idealHeight === "undefined") {
      let value = this._aggregateIdealHeight();
      if (typeof value !== "undefined") {
        this._lengthsCache.idealHeight = value + this.verticalPadding;
      }
    }

    // Tackle min lengths
    {
      // If we can't shrink in a direction, but no min length is given, use min length of children
      const canShrink = this._parseLayoutProperty("canShrink") as Directions;
      if (
        canShrink !== "horizontally" &&
        canShrink !== "both" &&
        typeof this._lengthsCache.minWidth === "undefined"
      ) {
        let value = this._aggregateMinWidth();
        if (typeof value !== "undefined") {
          this._lengthsCache.minWidth = value + this.horizontalPadding;
        }
      }

      if (
        canShrink !== "vertically" &&
        canShrink !== "both" &&
        typeof this._lengthsCache.minHeight === "undefined"
      ) {
        let value = this._aggregateMinHeight();
        if (typeof value !== "undefined") {
          this._lengthsCache.minHeight = value + this.verticalPadding;
        }
      }
    }

    // Tackle max lengths
    {
      const canGrow = this._parseLayoutProperty("canGrow") as Directions;

      if (
        canGrow !== "horizontally" &&
        canGrow !== "both" &&
        typeof this._lengthsCache.maxWidth === "undefined"
      ) {
        let value = this._aggregateMaxWidth();
        if (typeof value !== "undefined") {
          this._lengthsCache.maxWidth = value + this.horizontalPadding;
        }
      }

      if (
        canGrow !== "vertically" &&
        canGrow !== "both" &&
        typeof this._lengthsCache.maxHeight === "undefined"
      ) {
        let value = this._aggregateMaxHeight();
        if (typeof value !== "undefined") {
          this._lengthsCache.maxHeight = value + this.verticalPadding;
        }
      }
    }

    // // Tackle min lengths
    // {
    //   const canShrink = this._parseLayoutProperty("canShrink") as Directions;

    //   if (typeof this._lengthsCache.minWidth === "undefined") {
    //     if (canShrink === "horizontally" || canShrink === "both") {
    //       let value = this._aggregateMinWidth();
    //       if (typeof value !== "undefined") {
    //         this._lengthsCache.minWidth = value + this.horizontalPadding;
    //       }
    //     } else {
    //       this._lengthsCache.minWidth = this._lengthsCache.idealWidth;
    //     }
    //   }

    //   if (typeof this._lengthsCache.minHeight === "undefined") {
    //     if (canShrink === "vertically" || canShrink === "both") {
    //       let value = this._aggregateMinHeight();
    //       if (typeof value !== "undefined") {
    //         this._lengthsCache.minHeight = value + this.verticalPadding;
    //       }
    //     } else {
    //       this._lengthsCache.minHeight = this._lengthsCache.idealHeight;
    //     }
    //   }
    // }

    // // Tackle max lengths
    // {
    //   const canGrow = this._parseLayoutProperty("canGrow") as Directions;

    //   if (typeof this._lengthsCache.maxWidth === "undefined") {
    //     if (canGrow === "horizontally" || canGrow === "both") {
    //       let value = this._aggregateMaxWidth();
    //       if (typeof value !== "undefined") {
    //         this._lengthsCache.maxWidth = value + this.horizontalPadding;
    //       }
    //     } else {
    //       this._lengthsCache.maxWidth = this._lengthsCache.idealWidth;
    //     }
    //   }

    //   if (typeof this._lengthsCache.maxHeight === "undefined") {
    //     if (canGrow === "vertically" || canGrow === "both") {
    //       let value = this._aggregateMaxHeight();
    //       if (typeof value !== "undefined") {
    //         this._lengthsCache.maxHeight = value + this.verticalPadding;
    //       }
    //     } else {
    //       this._lengthsCache.maxHeight = this._lengthsCache.idealHeight;
    //     }
    //   }
    // }

    // // Handle width values
    // for (const prop of widthLayoutProperties) {
    //   if (typeof this._lengthsCache[prop] === "undefined") {
    //     const methodName =
    //       `_aggregate${booyah.uppercaseFirstLetter(prop)}` as keyof this;

    //     let value = (this[methodName] as () => number | undefined)();

    //     if (typeof value !== "undefined") {
    //       // Include padding
    //       value += this.horizontalPadding;
    //       this._lengthsCache[prop] = value;
    //     }
    //   }
    // }

    // // Handle height values
    // for (const prop of heightLayoutProperties) {
    //   if (typeof this._lengthsCache[prop] === "undefined") {
    //     const methodName =
    //       `_aggregate${booyah.uppercaseFirstLetter(prop)}` as keyof this;

    //     let value = (this[methodName] as () => number | undefined)();

    //     // Include padding
    //     if (typeof value !== "undefined") {
    //       value += this.verticalPadding;
    //       this._lengthsCache[prop] = value;
    //     }
    //   }
    // }
  }

  // override prepareResize(renderInfo: RenderInfo): void {
  //   super.prepareResize(renderInfo);

  //   for (const child of this._childLayoutItems!)
  //     child.prepareResize(renderInfo);

  //   this._aggregatedChildValues = {};

  //   // Handle width values
  //   for (const prop of widthLayoutProperties) {
  //     if (typeof super[prop] === "undefined") {
  //       const methodName =
  //         `_aggregate${booyah.uppercaseFirstLetter(prop)}` as keyof this;

  //       let value = (this[methodName] as () => number | undefined)();

  //       // Include padding
  //       if (typeof value !== "undefined") {
  //         value += this.paddingLeft + this.paddingRight;
  //       }

  //       this._aggregatedChildValues[prop] = value;
  //     }
  //   }

  //   // Adjust width values
  //   if (typeof this._aggregatedChildValues["minWidth"]) {
  //     // min <= ideal
  //     if (
  //       typeof this._aggregatedChildValues["idealWidth"] !== "undefined" &&
  //       this._aggregatedChildValues["idealWidth"] <
  //         this._aggregatedChildValues["minWidth"]
  //     ) {
  //       this._aggregatedChildValues["idealWidth"] =
  //         this._aggregatedChildValues["minWidth"];
  //     }

  //     // min <= max
  //     if (
  //       typeof this._aggregatedChildValues["maxWidth"] !== "undefined" &&
  //       this._aggregatedChildValues["maxWidth"] <
  //         this._aggregatedChildValues["minWidth"]
  //     ) {
  //       this._aggregatedChildValues["maxWidth"] =
  //         this._aggregatedChildValues["minWidth"];
  //     }
  //   }

  //   // ideal <= max
  //   if (
  //     typeof this._aggregatedChildValues["idealWidth"] !== "undefined" &&
  //     typeof this._aggregatedChildValues["maxWidth"] !== "undefined" &&
  //     this._aggregatedChildValues["maxWidth"] <
  //       this._aggregatedChildValues["idealWidth"]
  //   ) {
  //     this._aggregatedChildValues["idealWidth"] =
  //       this._aggregatedChildValues["maxWidth"];
  //   }

  //   // Handle height values
  //   for (const prop of heightLayoutProperties) {
  //     if (typeof super[prop] === "undefined") {
  //       const methodName =
  //         `_aggregate${booyah.uppercaseFirstLetter(prop)}` as keyof this;

  //       let value = (this[methodName] as () => number | undefined)();

  //       // Include padding
  //       if (typeof value !== "undefined") {
  //         value += this.paddingTop + this.paddingBottom;
  //       }

  //       this._aggregatedChildValues[prop] = value;
  //     }
  //   }

  //   // Adjust height values
  //   if (typeof this._aggregatedChildValues["minHeight"]) {
  //     // min <= ideal
  //     if (
  //       typeof this._aggregatedChildValues["idealHeight"] !== "undefined" &&
  //       this._aggregatedChildValues["idealHeight"] <
  //         this._aggregatedChildValues["minHeight"]
  //     ) {
  //       this._aggregatedChildValues["idealHeight"] =
  //         this._aggregatedChildValues["minHeight"];
  //     }

  //     // min <= max
  //     if (
  //       typeof this._aggregatedChildValues["maxHeight"] !== "undefined" &&
  //       this._aggregatedChildValues["maxHeight"] <
  //         this._aggregatedChildValues["minHeight"]
  //     ) {
  //       this._aggregatedChildValues["maxHeight"] =
  //         this._aggregatedChildValues["minHeight"];
  //     }
  //   }

  //   // ideal <= max
  //   if (
  //     typeof this._aggregatedChildValues["idealHeight"] !== "undefined" &&
  //     typeof this._aggregatedChildValues["maxHeight"] !== "undefined" &&
  //     this._aggregatedChildValues["maxHeight"] <
  //       this._aggregatedChildValues["idealHeight"]
  //   ) {
  //     this._aggregatedChildValues["idealHeight"] =
  //       this._aggregatedChildValues["maxHeight"];
  //   }
  // }

  /** Override teses method to set the child values for the container */
  protected _aggregateMinWidth(): number | undefined {
    return;
  }
  protected _aggregateMinHeight(): number | undefined {
    return;
  }
  protected _aggregateIdealWidth(): number | undefined {
    return;
  }
  protected _aggregateIdealHeight(): number | undefined {
    return;
  }
  protected _aggregateMaxWidth(): number | undefined {
    return;
  }
  protected _aggregateMaxHeight(): number | undefined {
    return;
  }

  // override resize(resizeInfo: ResizeInfo): void {
  //   // TODO: make this logic common across all layout items

  //   const innerBounds = this.calculateInnerBounds(resizeInfo.localBounds);

  //   const position = new PIXI.Point(innerBounds.x, innerBounds.y);
  //   let actualWidth = innerBounds.width!;
  //   let actualHeight = innerBounds.height;

  //   // Handle horizontal alignment
  //   if (innerBounds.isBoundedHorizontally()) {
  //     if (
  //       this._options.layoutOptions.horizontalAlign !== "left" &&
  //       innerBounds.width! > this.maxWidth
  //     ) {
  //       actualWidth = this.maxWidth;
  //       const extraSpace = innerBounds.width! - this.maxWidth;
  //       if (this._options.layoutOptions.horizontalAlign === "right") {
  //         position.x += extraSpace;
  //       } else if (this._options.layoutOptions.horizontalAlign === "center") {
  //         position.x += extraSpace / 2;
  //       }
  //     }
  //   } else if (this._options.layoutOptions.horizontalAlign !== "left") {
  //     console.error(
  //       `ContainerBase: Within unbounded layout, cannot horizontally align as requested: ${this._options.layoutOptions.horizontalAlign}`,
  //     );
  //   }

  //   // Handle vertical alignment
  //   if (innerBounds.isBoundedVertically()) {
  //     if (
  //       this._options.layoutOptions.verticalAlign !== "top" &&
  //       innerBounds.height! > this.maxHeight
  //     ) {
  //       actualHeight = this.maxHeight;
  //       const extraSpace = innerBounds.height! - this.maxHeight;
  //       if (this._options.layoutOptions.verticalAlign === "bottom") {
  //         position.y += extraSpace;
  //       } else if (this._options.layoutOptions.verticalAlign === "middle") {
  //         position.y += extraSpace / 2;
  //       }
  //     }
  //   } else if (this._options.layoutOptions.verticalAlign !== "top") {
  //     console.error(
  //       `ContainerBase: Within unbounded layout, cannot vertically align as requested: ${this._options.layoutOptions.verticalAlign}`,
  //     );
  //   }

  //   // Position the container and adjust local bounds
  //   this.displayObject.position.set(position.x, position.y);

  //   const childLocalBounds = new Bounds(0, 0, actualWidth, actualHeight);

  //   super.resize({
  //     localBounds: childLocalBounds,
  //     absoluteBounds: new Bounds(
  //       resizeInfo.absoluteBounds.x + position.x,
  //       resizeInfo.absoluteBounds.y + position.y,
  //       actualWidth,
  //       actualHeight,
  //     ),
  //   });
  // }

  protected override _setPosition(
    position: PIXI.IPointData,
    finalInnerWidth: number,
    finalInnerHeight: number,
  ) {
    // Position the container and adjust local bounds
    this.displayObject.position.copyFrom(position);

    const childLocalBounds = new Bounds(
      0,
      0,
      finalInnerWidth,
      finalInnerHeight,
    );

    this._childResizeInfo = {
      localBounds: childLocalBounds,
      absoluteBounds: new Bounds(
        this._lastResizeInfo.absoluteBounds.x + position.x,
        this._lastResizeInfo.absoluteBounds.y + position.y,
        finalInnerWidth,
        finalInnerHeight,
      ),
    };
  }

  get contextModification(): booyah.ChipContextResolvable {
    return {
      layoutItem: this,
      container: this._options.displayObject,
    };
  }

  aggregateChildValues(
    prop: BoundingLayoutProperty,
    operation: "sum" | "max",
    undefinedHandling: "treatAsZero" | "returnUndefined",
  ): number | undefined {
    let agg: number | undefined = undefined;
    for (const child of this._childLayoutItems!) {
      let childValue = child[prop];
      if (typeof child[prop] === "undefined") {
        if (undefinedHandling === "returnUndefined") {
          return undefined;
        } else {
          childValue = 0;
        }
      }

      if (typeof agg === "undefined") {
        agg = childValue;
      } else if (operation === "sum") {
        agg += childValue;
      } else {
        agg = Math.max(agg, childValue);
      }
    }
    return agg;
  }

  // get minWidth() {
  //   return super.minWidth ?? this._aggregatedChildValues.minWidth;
  // }
  // get minHeight() {
  //   return super.minHeight ?? this._aggregatedChildValues.minHeight;
  // }

  // get idealWidth() {
  //   return super.idealWidth ?? this._aggregatedChildValues.idealWidth;
  // }
  // get idealHeight() {
  //   return super.idealHeight ?? this._aggregatedChildValues.idealHeight;
  // }

  // get maxWidth() {
  //   return super.maxWidth ?? this._aggregatedChildValues.maxWidth;
  // }
  // get maxHeight() {
  //   return super.maxHeight ?? this._aggregatedChildValues.maxHeight;
  // }
}

/**
 * Puts of its children layouts one on top of the other
 */
export class StackingContainerChip extends ContainerBase {
  // protected _onResize(): void {
  //   const childResizeInfo: ResizeInfo = {
  //     absoluteBounds: this.calculateInnerBounds(
  //       this.lastResizeInfo!.absoluteBounds,
  //     ),
  //     localBounds: this.calculateInnerBounds(this.lastResizeInfo!.localBounds),
  //   };

  //   // Resize all children
  //   for (const child of this._childLayoutItems!) {
  //     child.resize(this._lastResizeInfo);
  //   }

  //   super._onResize();
  // }

  protected _resizeChildren(): void {
    for (const child of this._childLayoutItems!) {
      child.resize(this._childResizeInfo);
    }
  }

  protected override _aggregateMinWidth() {
    return this.aggregateChildValues("minWidth", "max", "treatAsZero");
  }
  protected override _aggregateMinHeight() {
    return this.aggregateChildValues("minHeight", "max", "treatAsZero");
  }

  protected override _aggregateIdealWidth() {
    return this.aggregateChildValues("idealWidth", "max", "treatAsZero");
  }
  protected override _aggregateIdealHeight() {
    return this.aggregateChildValues("idealHeight", "max", "treatAsZero");
  }

  protected override _aggregateMaxWidth() {
    return this.aggregateChildValues("maxWidth", "max", "returnUndefined");
  }
  protected override _aggregateMaxHeight() {
    return this.aggregateChildValues("maxHeight", "max", "returnUndefined");
  }
}

export class DirectionalContainerLayoutOptions extends LayoutOptions {
  /** Layout children along this axis */
  direction: "horizontal" | "vertical" = "horizontal";

  /**
   *  What to do with extra space:
   *  - `atStart` - all at the start (left or top)
   *  - `atEnd` - all at the end (right or bottom)
   *  - `atStartAndEnd` - shared between the start and end
   *  - `between` - between the items
   *  - `around` - between the items, and also at the ends
   */
  distributeSpace:
    | "atStart"
    | "atEnd"
    | "atStartAndEnd"
    | "between"
    | "around" = "atEnd";

  /**
   * Gap
   */
  gap = 0;
}

export class DirectionalContainerOptions extends DisplayObjectChipOptions<
  PIXI.Container,
  DirectionalContainerLayoutOptions
> {}

/**
 * Lays out children along an axis, either vertical or horizontal
 */
export class DirectionalContainerChip extends ContainerBase<DirectionalContainerLayoutOptions> {
  constructor(options?: Partial<DirectionalContainerOptions>) {
    const filledOptions = booyah.fillInOptions(
      options,
      new DirectionalContainerOptions(),
    );
    filledOptions.layoutOptions = booyah.fillInOptions(
      filledOptions.layoutOptions,
      new DirectionalContainerLayoutOptions(),
    );
    if (!filledOptions.displayObject) {
      filledOptions.displayObject = new PIXI.Container();
    }
    super(filledOptions);
  }

  protected _resizeChildren(): void {
    if (this._parseLayoutProperty("direction") === "horizontal") {
      if (this._lastResizeInfo!.localBounds.isBoundedHorizontally()) {
        this._resizeChildrenInBoundedLayout();
      } else {
        this._resizeChildrenInUnboundedLayout();
      }
    } else {
      if (this._lastResizeInfo!.localBounds.isBoundedVertically()) {
        this._resizeChildrenInBoundedLayout();
      } else {
        this._resizeChildrenInUnboundedLayout();
      }
    }
  }

  private _resizeChildrenInBoundedLayout(): void {
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
    const gap = this._parseLayoutPropertyAsNumber("gap");

    // Do a first pass to gather minimum space and element types
    const lengths: Array<number> = [];
    let childIndexesToGrow: Array<number> = [];

    let minUsedSpace = 0;
    for (let i = 0; i < this._childLayoutItems!.length; i++) {
      // Account for the gap
      if (i > 0) minUsedSpace += gap;

      const child = this._childLayoutItems![i];

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

    // const innerLocalBounds = this.calculateInnerBounds(
    //   this.lastResizeInfo!.localBounds,
    // );
    // const innerAbsoluteBounds = this.calculateInnerBounds(
    //   this.lastResizeInfo!.absoluteBounds,
    // );
    const innerLocalBounds = this._childResizeInfo!.localBounds;
    const innerAbsoluteBounds = this._childResizeInfo!.absoluteBounds;

    // Do a second pass to bring elements to their ideal lengths
    let availableExtraSpace = innerLocalBounds[lengthProp]! - minUsedSpace;
    while (availableExtraSpace > 1 && childIndexesToGrow.length > 0) {
      const extraSpacePerChild =
        availableExtraSpace / childIndexesToGrow.length;
      for (let i = 0; i < childIndexesToGrow.length; i++) {
        const childIndex = childIndexesToGrow[i];
        const child = this._childLayoutItems![childIndex];
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

      for (let i = 0; i < this._childLayoutItems!.length; i++) {
        const child = this._childLayoutItems![i];

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
        const child = this._childLayoutItems![childIndex];

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
      axisOffset += availableExtraSpace / this._childLayoutItems!.length / 2;
    }

    for (let i = 0; i < this._childLayoutItems!.length; i++) {
      // Handle gap
      if (i > 0) axisOffset += gap;

      const child = this._childLayoutItems![i];

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
      child.resize({
        absoluteBounds: itemAbsoluteBounds,
        localBounds: itemLocalBounds,
      });

      // Add space used to y offset
      axisOffset += lengths[i];

      // Distribute extra space between items
      if (this._options.layoutOptions.distributeSpace === "between") {
        if (this._childLayoutItems!.length > 1)
          axisOffset +=
            availableExtraSpace / (this._childLayoutItems!.length - 1);
      } else if (this._options.layoutOptions.distributeSpace === "around") {
        axisOffset += availableExtraSpace / this._childLayoutItems!.length;
      }
    }

    // super._onResize();
  }

  private _resizeChildrenInUnboundedLayout(): void {
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
      this._childResizeInfo!.localBounds,
    );
    const innerAbsoluteBounds = this.calculateInnerBounds(
      this._childResizeInfo!.absoluteBounds,
    );

    let axisOffset = 0;
    for (let i = 0; i < this._childLayoutItems!.length; i++) {
      // Handle gap
      if (i > 0) axisOffset += this._parseLayoutPropertyAsNumber("gap");

      const child = this._childLayoutItems![i];
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
      child.resize({
        absoluteBounds: itemAbsoluteBounds,
        localBounds: itemLocalBounds,
      });

      // Add space used to offset
      axisOffset += childIdealLength;
    }
  }

  protected override _aggregateMinWidth() {
    if (this._options.layoutOptions.direction === "horizontal") {
      const childrenSum = this.aggregateChildValues(
        "minWidth",
        "sum",
        "treatAsZero",
      );
      if (typeof childrenSum === "undefined") return;

      return childrenSum + this._calcuateGapSum();
    } else {
      return this.aggregateChildValues("minWidth", "max", "treatAsZero");
    }
  }
  protected override _aggregateMinHeight() {
    if (this._options.layoutOptions.direction === "vertical") {
      const childrenSum = this.aggregateChildValues(
        "minHeight",
        "sum",
        "treatAsZero",
      );
      if (typeof childrenSum === "undefined") return;

      return childrenSum + this._calcuateGapSum();
    } else {
      return this.aggregateChildValues("minHeight", "max", "treatAsZero");
    }
  }

  protected override _aggregateIdealWidth() {
    if (this._options.layoutOptions.direction === "horizontal") {
      const childrenSum = this.aggregateChildValues(
        "idealWidth",
        "sum",
        "treatAsZero",
      );
      if (typeof childrenSum === "undefined") return;

      return childrenSum + this._calcuateGapSum();
    } else {
      return this.aggregateChildValues("idealWidth", "max", "treatAsZero");
    }
  }
  protected override _aggregateIdealHeight() {
    if (this._options.layoutOptions.direction === "vertical") {
      const childrenSum = this.aggregateChildValues(
        "idealHeight",
        "sum",
        "treatAsZero",
      );
      if (typeof childrenSum === "undefined") return;

      return childrenSum + this._calcuateGapSum();
    } else {
      return this.aggregateChildValues("idealHeight", "max", "treatAsZero");
    }
  }

  protected override _aggregateMaxWidth() {
    if (this._options.layoutOptions.direction === "horizontal") {
      const childrenSum = this.aggregateChildValues(
        "maxWidth",
        "sum",
        "returnUndefined",
      );
      if (typeof childrenSum === "undefined") return;

      return childrenSum + this._calcuateGapSum();
    } else {
      return this.aggregateChildValues("maxWidth", "max", "returnUndefined");
    }
  }

  protected override _aggregateMaxHeight() {
    if (this._options.layoutOptions.direction === "vertical") {
      const childrenSum = this.aggregateChildValues(
        "maxHeight",
        "sum",
        "returnUndefined",
      );
      if (typeof childrenSum === "undefined") return;

      return childrenSum + this._calcuateGapSum();
    } else {
      return this.aggregateChildValues("maxHeight", "max", "returnUndefined");
    }
  }

  private _calcuateGapSum() {
    return this._childLayoutItems!.length > 1
      ? (this._childLayoutItems!.length - 1) *
          this._parseLayoutPropertyAsNumber("gap")
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
export class AnimatedSpriteChipOptions extends DisplayObjectLeafChipOptions<PIXI.AnimatedSprite> {
  spritesheet!: PIXI.Spritesheet | string;
  behaviorOnComplete: "loop" | "remove" | "keepLastFrame" = "remove";
  behaviorOnStart: "play" | "stop" = "play";
  animationName?: string;
  // If provided, will calculate the animation speed to achieve this number of frames-per-second
  fps?: number;
  startingFrame?: number;
  prepare?: boolean;
}

export class AnimatedSpriteChip extends DisplayObjectLeafChip<
  PIXI.AnimatedSprite,
  LayoutOptions,
  AnimatedSpriteChipOptions
> {
  // private readonly _options: AnimatedSpriteChipOptions;

  private _animatedSprite?: PIXI.AnimatedSprite;
  private _wasPlaying?: boolean;
  private _wasAdded?: boolean;
  private _propertiesToUpdateOnResize?: Array<keyof PIXI.AnimatedSprite>;

  constructor(options?: Partial<AnimatedSpriteChipOptions>) {
    const filledOptions = booyah.fillInOptions(
      options,
      new AnimatedSpriteChipOptions(),
    );

    if (typeof filledOptions.spritesheet === "undefined") {
      throw new Error("AnimatedSpriteChip requires a spritesheet");
    }
    if (typeof filledOptions.spritesheet === "string") {
      const resolvedSpritesheet = PIXI.Assets.get<PIXI.Spritesheet>(
        filledOptions.spritesheet,
      );
      if (!resolvedSpritesheet)
        throw new Error(
          `Cannot find spritesheet for AnimatedSpriteChip "${filledOptions.spritesheet}"`,
        );

      filledOptions.spritesheet = resolvedSpritesheet;
    }

    super(filledOptions);
  }

  protected _onActivate(): void {
    super._onActivate();

    this._wasPlaying = false;

    // Any conversion has already been handled in the constructor
    const spritesheet = this._options.spritesheet as PIXI.Spritesheet;

    let textures: PIXI.Texture[];
    if (this._options.animationName) {
      // Use the specified animation
      if (!_.has(spritesheet.data.animations, this._options.animationName)) {
        throw new Error(
          `Can't find animation "${this._options.animationName}" in spritesheet`,
        );
      }

      if (spritesheet.linkedSheets.length === 0) {
        // PIXI will have loaded the textures directly into the spritesheet object
        textures = spritesheet.animations[this._options.animationName];
      } else {
        // Assemble textures from the linked sheets
        const allSheets = [spritesheet, ...spritesheet.linkedSheets];
        textures = spritesheet.data.animations![
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
      textures = Object.values(spritesheet.textures);
    }

    // Don't have the sprite auto-update
    this._animatedSprite = new PIXI.AnimatedSprite(textures, false);

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

    if (typeof this._options.fps !== "undefined") {
      this._animatedSprite.animationSpeed = this._options.fps / 1000;
    }

    // Setup event handlers
    this._animatedSprite.onFrameChange = this._onFrameChange.bind(this);
    this._animatedSprite.onLoop = this._onLoop.bind(this);
    this._animatedSprite.onComplete = this._onComplete.bind(this);

    this.restart();
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
    this._animatedSprite!.gotoAndStop(this._options.startingFrame ?? 0);

    if (this._options.behaviorOnStart === "play") {
      this._animatedSprite!.play();
    }
  }
}

export class LayoutTest extends booyah.Composite {
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
            x: ({ renderSize }) => renderSize.x - 100,
          },
          layoutOptions: {
            // maxWidth: 100,
            // minWidth: "idealWidth",
            // maxWidth: "idealWidth",
            verticalAlign: "top",
            paddingTop: 10,
            paddingRight: 15,
          },
        }),
      );
    }

    containerChip.addChildChip(
      new SpacerChip({ layoutOptions: { minWidth: 10, maxWidth: 10 } }),
    );

    {
      const green = new PIXI.Graphics();
      green.beginFill(0x00ff00);
      green.drawRoundedRect(0, 0, 50, 100, 10);
      green.endFill();

      containerChip.addChildChip(
        new DisplayObjectLeafChip({
          displayObject: green,
          layoutOptions: {
            maxWidth: 200,
            keepAspectRatio: "min",
            // idealWidth: "maxWidth",
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
