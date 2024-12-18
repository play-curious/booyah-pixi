import * as chip from "booyah/dist/chip";
import * as util from "booyah/dist/util";
import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as pixiApp from "./pixiApp";
import * as resolvable from "./resolvable";

export const layoutProperties = [
  "minWidth",
  "minHeight",
  "idealWidth",
  "idealHeight",
  "maxWidth",
  "maxHeight",
] as const;

export type LayoutProperty = (typeof layoutProperties)[number];

export function isLayoutProperty(value: string): value is LayoutProperty {
  return layoutProperties.includes(value as LayoutProperty);
}

export type LayoutValue = number | LayoutProperty;

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

export class LayoutOptionsBase {
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

export interface ResizeInfo {
  readonly absoluteBounds: Bounds;
  readonly localBounds: Bounds;
}

/**
 * Emits:
 *  - updated() - something changed, requesting an update
 *  - willResize(ResizeInfo)
 *  - didResize(ResizeInfo)
 */
export interface LayoutItem extends chip.NodeEventSource {
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly idealWidth?: number;
  readonly idealHeight?: number;
  readonly maxWidth?: number;
  readonly maxHeight?: number;

  prepareResize(renderInfo: RenderInfo): void;
  resize(resizeInfo: ResizeInfo): void;

  addChildLayoutItem(child: LayoutItem): void;
  removeChildLayoutItem(child: LayoutItem): void;
}

export class LayoutItemBaseOptions<LayoutOptionsType> {
  layoutOptions: Partial<
    resolvable.ResolvableObject<
      LayoutOptionsType,
      LayoutValueResolvableContext<LayoutOptionsType>
    >
  > = {};
  children: LayoutItemChildChipOptions = [];
}

export abstract class LayoutItemBase<
    LayoutOptionsType extends LayoutOptionsBase = LayoutOptionsBase,
    OptionsType extends
      LayoutItemBaseOptions<LayoutOptionsType> = LayoutItemBaseOptions<LayoutOptionsType>,
  >
  extends chip.Parallel
  implements LayoutItem
{
  // protected abstract _layoutOptions: resolvable.ResolvableObject<LayoutOptions, LayoutValueResolvableContext>;
  protected _options: OptionsType;

  protected _layoutOptionsResolver: resolvable.Resolver<
    OptionsType["layoutOptions"],
    LayoutValueResolvableContext<OptionsType["layoutOptions"]>
  >;

  protected _lastRenderInfo?: RenderInfo;
  protected _lastResizeInfo?: ResizeInfo;

  constructor(options?: Partial<OptionsType>) {
    const filledOptions = chip.fillInOptions(
      options,
      new LayoutItemBaseOptions(),
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
    this._lastRenderInfo = renderInfo;
    this._onPrepareResize();

    // TODO: emit event?
  }

  protected _onPrepareResize() {
    // no op
  }

  protected _onResize(): void {
    // no op
  }

  resize(resizeInfo: ResizeInfo): void {
    this._layoutOptionsResolver.invalidate();
    this._lastResizeInfo = resizeInfo;
    this.emit("willResize", resizeInfo);

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
        typeof resizeInfo.absoluteBounds.width !== "undefined" &&
        resizeInfo.absoluteBounds.width < this.minWidth
      )
        console.error(
          `Insufficient width to layout item. Bounds.width = ${resizeInfo.absoluteBounds.width} and minWidth = ${this.minWidth}`,
          this,
        );
      if (
        typeof this.minHeight !== "undefined" &&
        typeof resizeInfo.absoluteBounds.height !== "undefined" &&
        resizeInfo.absoluteBounds.height < this.minHeight
      )
        console.error(
          `Insufficient height to layout item. Bounds.height = ${resizeInfo.absoluteBounds.height} and minHeight = ${this.minHeight}`,
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

    this._onResize();

    this.emit("didResize", resizeInfo);
  }

  calculateInnerBounds(bounds: Bounds) {
    return new Bounds(
      bounds.x + this.paddingLeft,
      bounds.y + this.paddingTop,
      bounds.isBoundedHorizontally()
        ? bounds.width - this.paddingLeft - this.paddingRight
        : undefined,
      bounds.isBoundedVertically()
        ? bounds.height - this.paddingTop - this.paddingBottom
        : undefined,
    );
  }

  get minWidth(): number | undefined {
    return this.parseLayoutPropertyAsNumber("minWidth");
  }
  get minHeight(): number | undefined {
    return this.parseLayoutPropertyAsNumber("minHeight");
  }

  get idealWidth(): number | undefined {
    return this.parseLayoutPropertyAsNumber("idealWidth");
  }
  get idealHeight(): number | undefined {
    return this.parseLayoutPropertyAsNumber("idealHeight");
  }

  get maxWidth(): number | undefined {
    return this.parseLayoutPropertyAsNumber("maxWidth");
  }
  get maxHeight(): number | undefined {
    return this.parseLayoutPropertyAsNumber("maxHeight");
  }

  get paddingLeft(): number {
    return this.safeParseLayoutPropertyAsNumber("paddingLeft");
  }
  get paddingRight(): number {
    return this.safeParseLayoutPropertyAsNumber("paddingRight");
  }
  get paddingTop(): number {
    return this.safeParseLayoutPropertyAsNumber("paddingTop");
  }
  get paddingBottom(): number {
    return this.safeParseLayoutPropertyAsNumber("paddingBottom");
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

  parseLayoutProperty(
    prop: keyof OptionsType["layoutOptions"],
  ): number | string | undefined {
    const resolvableContext: LayoutValueResolvableContext<
      OptionsType["layoutOptions"]
    > = {
      layoutOptions: this.layoutOptions,
      layoutItem: this,
      ...this.lastRenderInfo,
    };
    const value = this._layoutOptionsResolver.resolve(prop, resolvableContext);

    if (typeof value === "string" && isLayoutProperty(value)) {
      // Find matching property and return it
      const matchingProp = value as LayoutProperty;
      const matchingValue = this[matchingProp];

      if (
        typeof matchingValue !== "number" &&
        typeof matchingValue !== undefined
      ) {
        throw new Error(
          `LayoutItem referencing property ${matchingProp} which is not a number. Value: ${matchingValue}`,
        );
      }

      return matchingValue;
    }

    return value;
  }

  parseLayoutPropertyAsNumber(
    prop: keyof OptionsType["layoutOptions"],
  ): number | undefined {
    const value = this.parseLayoutProperty(prop);
    if (typeof value === "string")
      throw new Error(
        `Cannot parseLayoutPropertyAsNumber the string "${value}"`,
      );
    return value;
  }

  safeParseLayoutPropertyAsNumber(
    prop: keyof OptionsType["layoutOptions"],
  ): number {
    return this.parseLayoutPropertyAsNumber(prop) || 0;
  }
}

/** Just takes up space */
export class SpacerChip extends LayoutItemBase {
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
  LayoutOptionsType extends LayoutOptionsBase,
> extends LayoutItemBaseOptions<LayoutOptionsType> {
  displayObject: DisplayObjectType;
  properties?: Partial<
    ResolvablePixiDisplayObject<DisplayObjectType, LayoutOptionsType>
  > = {};
  onResize?: (
    context: LayoutValueResolvableContext<LayoutOptionsType>,
  ) => unknown;

  addToParentLayoutItem = true;
  addToContainer = true;

  /**
   * Create an intermediate container that can be manipulated
   * relative to the position provided by the layout
   * */
  makeOffsetContainer = true;
}

export abstract class DisplayObjectChip<
  DisplayObjectType extends PIXI.Container,
  LayoutOptionsType extends LayoutOptionsBase = LayoutOptionsBase,
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

  constructor(options: OptionsType) {
    super(options);

    this._propertiesResolver = new resolvable.Resolver(options.properties);

    if (this._options.makeOffsetContainer) {
      this._offsetContainer = new PIXI.Container();
      this._offsetContainer.addChild(this.displayObject);
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

    for (const prop of this._propertiesResolver.properties) {
      this.updateProperty(
        prop,
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

  protected _onResize(): void {
    this._updateDynamicProperties();
  }

  protected _updateDynamicProperties() {
    this._propertiesResolver.invalidate();

    // Update dynamic properties
    const resolvableContext: LayoutValueResolvableContext<LayoutOptionsType> = {
      layoutOptions: this.layoutOptions,
      layoutItem: this,
      ...this.lastRenderInfo,
    };

    for (const prop of this._propertiesResolver.dynamicProperties) {
      this.updateProperty(
        prop,
        this._propertiesResolver.resolve(prop, resolvableContext),
      );
    }

    this._options.onResize?.(resolvableContext);
  }

  get pixiAppChip() {
    return this._chipContext.pixiAppChip as pixiApp.PixiAppChip;
  }

  protected get _layoutOptions() {
    return this._options.layoutOptions as LayoutOptionsBase;
  }

  get displayObject() {
    return this._options.displayObject;
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

  get contextModification() {
    if (!this._options.makeOffsetContainer) return super.contextModification;

    const parentValue = super.contextModification;
    return Object.assign({}, parentValue, {
      container: this._offsetContainer,
    });
  }
}

export class DisplayLeafLayoutOptions extends LayoutOptionsBase {
  keepAspectRatio = false;

  horizontalAlign: "left" | "right" | "center" = "left";
  verticalAlign: "top" | "bottom" | "middle" = "top";

  /** When aligning, adjust for non-zero anchor points */
  alignBasedOnAnchor = true;
}

export class DisplayLeafChipOptions<
  DisplayObjectType extends PIXI.Container,
  LayoutOptionsType extends DisplayLeafLayoutOptions = DisplayLeafLayoutOptions,
> extends DisplayObjectChipOptions<DisplayObjectType, LayoutOptionsType> {}

export class DisplayLeafChip<
  DisplayObjectType extends PIXI.Container,
  LayoutOptionsType extends DisplayLeafLayoutOptions = DisplayLeafLayoutOptions,
  OptionsType extends DisplayLeafChipOptions<
    DisplayObjectType,
    LayoutOptionsType
  > = DisplayLeafChipOptions<DisplayObjectType, LayoutOptionsType>,
> extends DisplayObjectChip<DisplayObjectType, LayoutOptionsType, OptionsType> {
  private _idealWidth?: number;
  private _idealHeight?: number;

  // Cache of the local bounds so as not to recalculate it
  private _localBounds?: Bounds;

  constructor(
    options: Partial<
      DisplayLeafChipOptions<DisplayObjectType, LayoutOptionsType>
    >,
  ) {
    const filledOptions = chip.fillInOptions(
      options,
      new DisplayLeafChipOptions<DisplayObjectType, LayoutOptionsType>(),
    );
    filledOptions.layoutOptions = chip.fillInOptions(
      filledOptions.layoutOptions,
      new DisplayLeafLayoutOptions(),
    ) as resolvable.ResolvableObject<
      LayoutOptionsType,
      LayoutValueResolvableContext<LayoutOptionsType>
    >;
    super(filledOptions as OptionsType);
  }

  protected override _onPrepareResize() {
    // The first time, possibly calculate ideal sizes
    if (
      typeof this._idealWidth !== "undefined" &&
      typeof this._idealHeight !== "undefined"
    )
      return;

    this.updateIdealSize();
  }

  protected override _onResize(): void {
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
      this.lastResizeInfo.localBounds,
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

      this._updateDynamicProperties();
    } else if (this._options.layoutOptions.verticalAlign !== "top") {
      console.error(
        `DisplayLeafChip: Within unbounded layout, cannot vertically align as requested: ${this._options.layoutOptions.verticalAlign}`,
      );
    }

    super._onResize();
  }

  updateIdealSize() {
    this._localBounds = Bounds.fromRectangle(
      this._options.displayObject.getLocalBounds(),
    );

    if (typeof this._options.layoutOptions.idealWidth === "undefined") {
      this._idealWidth =
        this._localBounds.width + this.paddingLeft + this.paddingRight;
    } else {
      this._idealWidth = this.parseLayoutPropertyAsNumber("idealWidth");
    }

    if (typeof this._options.layoutOptions.idealHeight === "undefined") {
      this._idealHeight =
        this._localBounds.height + this.paddingTop + this.paddingBottom;
    } else {
      this._idealHeight = this.parseLayoutPropertyAsNumber("idealHeight");
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

export abstract class ContainerBase<
  LayoutOptionsType extends LayoutOptionsBase = LayoutOptionsBase,
  OptionsType extends DisplayObjectChipOptions<
    PIXI.Container,
    LayoutOptionsType
  > = DisplayObjectChipOptions<PIXI.Container, LayoutOptionsType>,
> extends DisplayObjectChip<PIXI.Container, LayoutOptionsType, OptionsType> {
  protected _childLayoutItems: Array<LayoutItem>;

  constructor(
    options?: Partial<
      DisplayObjectChipOptions<PIXI.Container, LayoutOptionsType>
    >,
  ) {
    const filledOptions = chip.fillInOptions(
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

    super._onActivate();
  }

  addChildLayoutItem(child: LayoutItem): void {
    const index = this._childLayoutItems.indexOf(child);
    if (index !== -1)
      throw new Error("Cannot add duplicate child display item");

    this._childLayoutItems.push(child);

    this._subscribe(child, "updated", this.requestResize);
    this.requestResize();
  }

  removeChildLayoutItem(child: LayoutItem): void {
    const index = this._childLayoutItems.indexOf(child);
    if (index === -1)
      throw new Error("Cannot find child display item to remove");

    this._childLayoutItems.splice(index, 1);
    this._unsubscribe(child);

    this.requestResize();
  }

  override prepareResize(renderInfo: RenderInfo): void {
    super.prepareResize(renderInfo);

    for (const child of this._childLayoutItems)
      child.prepareResize(this._lastRenderInfo);
  }

  override resize(resizeInfo: ResizeInfo): void {
    // Position the container and adjust local bounds
    this.displayObject.position.set(
      resizeInfo.localBounds.x,
      resizeInfo.localBounds.y,
    );

    const childLocalBounds = new Bounds(
      0,
      0,
      resizeInfo.localBounds.width,
      resizeInfo.localBounds.height,
    );

    super.resize({
      localBounds: childLocalBounds,
      absoluteBounds: resizeInfo.absoluteBounds,
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
  protected _onResize(): void {
    // Resize all children
    const childResizeInfo: ResizeInfo = {
      absoluteBounds: this.calculateInnerBounds(
        this.lastResizeInfo.absoluteBounds,
      ),
      localBounds: this.calculateInnerBounds(this.lastResizeInfo.localBounds),
    };
    for (const child of this._childLayoutItems) child.resize(childResizeInfo);
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

export class DirectionalContainerLayoutOptions extends LayoutOptionsBase {
  direction: "horizontal" | "vertical" = "horizontal";

  distributeSpace:
    | "atStart"
    | "atEnd"
    | "atStartAndEnd"
    | "between"
    | "around" = "atEnd";

  gap = 0;
}

export class DirectionalContainerOptions extends DisplayObjectChipOptions<
  PIXI.Container,
  DirectionalContainerLayoutOptions
> {}

export class DirectionalContainerChip extends ContainerBase<DirectionalContainerLayoutOptions> {
  constructor(options?: Partial<DirectionalContainerOptions>) {
    const filledOptions = chip.fillInOptions(
      options,
      new DirectionalContainerOptions(),
    );
    filledOptions.layoutOptions = chip.fillInOptions(
      filledOptions.layoutOptions,
      new DirectionalContainerLayoutOptions(),
    );
    if (!filledOptions.displayObject) {
      filledOptions.displayObject = new PIXI.Container();
    }
    super(filledOptions);
  }

  protected _onResize(): void {
    if (this.parseLayoutProperty("direction") === "horizontal") {
      if (this._lastResizeInfo.localBounds.isBoundedHorizontally()) {
        this._handleBoundedLayout();
      } else {
        this._handleUnboundedLayout();
      }
    } else {
      if (this._lastResizeInfo.localBounds.isBoundedVertically()) {
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
    const gap = this.safeParseLayoutPropertyAsNumber("gap");

    // Do a first pass to gather minimum space and element types
    const lengths: Array<number> = [];
    let childIndexesToGrow: Array<number> = [];

    let minUsedSpace = 0;
    for (let i = 0; i < this._childLayoutItems.length; i++) {
      // Account for the gap
      if (i > 0) minUsedSpace += gap;

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
      this.lastResizeInfo.localBounds,
    );
    const innerAbsoluteBounds = this.calculateInnerBounds(
      this.lastResizeInfo.absoluteBounds,
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
      if (i > 0) axisOffset += gap;

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
      child.resize({
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
      this.lastResizeInfo.localBounds,
    );
    const innerAbsoluteBounds = this.calculateInnerBounds(
      this.lastResizeInfo.absoluteBounds,
    );

    let axisOffset = 0;
    for (let i = 0; i < this._childLayoutItems.length; i++) {
      // Handle gap
      if (i > 0) axisOffset += this.safeParseLayoutPropertyAsNumber("gap");

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
      child.resize({
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
      ? (this._childLayoutItems.length - 1) *
          this.safeParseLayoutPropertyAsNumber("gap")
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
export class AnimatedSpriteChipOptions extends DisplayLeafChipOptions<PIXI.AnimatedSprite> {
  spritesheet: PIXI.Spritesheet | string;
  behaviorOnComplete: "loop" | "remove" | "keepLastFrame" = "remove";
  behaviorOnStart: "play" | "stop" = "play";
  animationName?: string;
  // If provided, will calculate the animation speed to achieve this number of frames-per-second
  fps?: number;
  startingFrame?: number;
  prepare?: boolean;
}

export class AnimatedSpriteChip extends DisplayLeafChip<
  PIXI.AnimatedSprite,
  DisplayLeafLayoutOptions,
  AnimatedSpriteChipOptions
> {
  // private readonly _options: AnimatedSpriteChipOptions;

  private _animatedSprite?: PIXI.AnimatedSprite;
  private _wasPlaying: boolean;
  private _wasAdded?: boolean;
  private _propertiesToUpdateOnResize: Array<keyof PIXI.AnimatedSprite>;

  constructor(options?: Partial<AnimatedSpriteChipOptions>) {
    const filledOptions = chip.fillInOptions(
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
          `Cannot find spritesheet for AnimatedSpriteChip "${options.spritesheet}"`,
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

    if ("fps" in this._options) {
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
    this._animatedSprite.gotoAndStop(this._options.startingFrame ?? 0);

    if (this._options.behaviorOnStart === "play") {
      this._animatedSprite.play();
    }
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
            x: ({ renderSize }) => renderSize.x - 100,
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

    containerChip.addChildChip(
      new SpacerChip({ layoutOptions: { minWidth: 10, maxWidth: 10 } }),
    );

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
