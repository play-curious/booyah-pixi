import * as chip from "booyah/dist/chip";
import * as util from "booyah/dist/util";
import * as PIXI from "pixi.js";

export type StaticLayoutValue =
  | number
  | "minWidth"
  | "minHeight"
  | "idealWidth"
  | "idealHeight"
  | "maxWidth"
  | "maxHeight";

export type DynamicLayoutValue = (
  options: LayoutOptions,
  bounds: PIXI.Rectangle,
) => StaticLayoutValue;

export type LayoutValue = StaticLayoutValue | DynamicLayoutValue;

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

  keepAspectRatio = false;

  horizontalAlign: "left" | "right" | "center" = "left";
  verticalAlign: "top" | "bottom" | "middle" = "top";

  distributeSpace:
    | "atStart"
    | "atEnd"
    | "atStartAndEnd"
    | "between"
    | "around" = "atEnd";
}

// Parses a property in the layout options as a number
function parseLayoutProperty(
  options: LayoutOptions,
  prop: keyof LayoutOptions,
  bounds: PIXI.Rectangle,
): number {
  // If property doesn't exist, just return 0
  if (!(prop in options)) return 0;

  return parseLayoutValue(options, options[prop] as LayoutValue, bounds);
}

// Parses a layout value as a number
function parseLayoutValue(
  options: LayoutOptions,
  propValue: LayoutValue,
  bounds: PIXI.Rectangle,
): number {
  // If property doesn't exist, just return 0
  if (typeof propValue === "undefined") return 0;
  // If property is a number, return it directly
  if (typeof propValue === "number") return propValue as number;

  // If property is a function (dynamic) call it and parse the result
  if (typeof propValue === "function") {
    propValue = (propValue as DynamicLayoutValue)(options, bounds);
    if (typeof propValue === "undefined") return 0;
    if (typeof propValue === "number") return propValue as number;
  }

  // Find matching property and return it
  const matchingProp = propValue as keyof LayoutOptions;
  const matchingValue = options[matchingProp];
  if (typeof matchingValue !== "number") {
    throw new Error(
      `Layout referencing property ${matchingProp} which is not a number. Value: ${matchingValue}`,
    );
  }

  return matchingValue;
}

export interface Layout extends PIXI.utils.EventEmitter {
  readonly options: LayoutOptions;

  refresh(bounds: PIXI.Rectangle): void;
  addChildLayout(child: Layout): void;
  removeChildLayout(child: Layout): void;
}

export abstract class LayoutBase
  extends PIXI.utils.EventEmitter
  implements Layout
{
  protected _options: LayoutOptions;

  constructor(options: Partial<LayoutOptions>) {
    super();

    this._options = util.fillInOptions(options, new LayoutOptions());
  }

  protected abstract _onRefresh(
    outerBounds: PIXI.Rectangle,
    innerBounds: PIXI.Rectangle,
  ): void;

  refresh(bounds: PIXI.Rectangle): void {
    this.emit("willRefresh", bounds);

    if (
      this._options.minWidth &&
      bounds.width < parseLayoutProperty(this._options, "minWidth", bounds)
    )
      console.error(
        `Insufficient width to layout item. Bounds.width = ${bounds.width} and minWidth = ${this._options.minWidth}`,
      );
    if (
      this._options.minHeight &&
      bounds.height < parseLayoutProperty(this._options, "minHeight", bounds)
    )
      console.error(
        `Insufficient height to layout item. Bounds.height = ${bounds.height} and minHeight = ${this._options.minHeight}`,
      );

    const innerBounds = new PIXI.Rectangle(
      bounds.x + parseLayoutProperty(this._options, "paddingLeft", bounds),
      bounds.y + parseLayoutProperty(this._options, "paddingTop", bounds),
      bounds.width -
        parseLayoutProperty(this._options, "paddingLeft", bounds) -
        parseLayoutProperty(this._options, "paddingRight", bounds),
      bounds.height -
        parseLayoutProperty(this._options, "paddingTop", bounds) -
        parseLayoutProperty(this._options, "paddingBottom", bounds),
    );

    this._onRefresh(bounds, innerBounds);

    this.emit("didRefresh", bounds);
  }

  addChildLayout(child: Layout): void {
    throw new Error(`${this.constructor.name} can't have children layouts`);
  }

  removeChildLayout(child: Layout): void {
    throw new Error(`${this.constructor.name}  can't have children layouts`);
  }

  get options(): LayoutOptions {
    return this._options;
  }
}

/** Just takes up space */
export class SpacerLayout extends LayoutBase {
  protected _onRefresh(
    outerBounds: PIXI.Rectangle,
    innerBounds: PIXI.Rectangle,
  ): void {
    // no op
  }
}

export class DisplayObjectLayout extends LayoutBase {
  // Cache of the local bounds so as not to recalculate it
  private _localBounds: PIXI.Rectangle;

  constructor(
    private readonly _displayObject: PIXI.DisplayObject,
    options?: Partial<LayoutOptions>,
  ) {
    super(options);

    if (!this._options.idealWidth || !this._options.idealHeight) {
      this._localBounds = this._displayObject.getLocalBounds();

      if (!this._options.idealWidth) {
        this._options.idealWidth =
          this._localBounds.width +
          parseLayoutProperty(
            this._options,
            "paddingLeft",
            new PIXI.Rectangle(),
          ) +
          parseLayoutProperty(
            this._options,
            "paddingRight",
            new PIXI.Rectangle(),
          );
      }

      if (!this._options.idealHeight) {
        this._options.idealHeight =
          this._localBounds.height +
          parseLayoutProperty(
            this._options,
            "paddingTop",
            new PIXI.Rectangle(),
          ) +
          parseLayoutProperty(
            this._options,
            "paddingBottom",
            new PIXI.Rectangle(),
          );
      }
    }
  }

  _onRefresh(outerBounds: PIXI.Rectangle, innerBounds: PIXI.Rectangle): void {
    if (!this._displayObject.parent)
      throw new Error("Cannot layout display object without a parent");

    let horizontalScale = 1;
    let verticalScale = 1;

    if (
      innerBounds.width <
        parseLayoutProperty(this._options, "idealWidth", innerBounds) ||
      innerBounds.height <
        parseLayoutProperty(this._options, "idealHeight", innerBounds)
    ) {
      // Shink, but not beyond the min size
      if (parseLayoutProperty(this._options, "minWidth", innerBounds)) {
        horizontalScale =
          Math.max(
            innerBounds.width,
            parseLayoutProperty(this._options, "minWidth", innerBounds),
          ) / parseLayoutProperty(this._options, "idealWidth", innerBounds);
      } else {
        horizontalScale =
          innerBounds.width /
          parseLayoutProperty(this._options, "idealWidth", innerBounds);
      }

      if (this._options.minHeight) {
        verticalScale =
          Math.max(
            innerBounds.height,
            parseLayoutProperty(this._options, "minHeight", innerBounds),
          ) / parseLayoutProperty(this._options, "idealHeight", innerBounds);
      } else {
        verticalScale =
          innerBounds.height /
          parseLayoutProperty(this._options, "idealHeight", innerBounds);
      }
    } else if (
      innerBounds.width >
        parseLayoutProperty(this._options, "idealWidth", innerBounds) ||
      innerBounds.height >
        parseLayoutProperty(this._options, "idealHeight", innerBounds)
    ) {
      // Grow, but not beyond the max size
      if (parseLayoutProperty(this.options, "maxWidth", innerBounds)) {
        horizontalScale =
          Math.min(
            parseLayoutProperty(this._options, "maxWidth", innerBounds),
            innerBounds.width,
          ) / parseLayoutProperty(this._options, "idealWidth", innerBounds);
      } else {
        horizontalScale =
          innerBounds.width /
          parseLayoutProperty(this._options, "idealWidth", innerBounds);
      }

      if (parseLayoutProperty(this.options, "maxHeight", innerBounds)) {
        verticalScale =
          Math.min(
            parseLayoutProperty(this._options, "maxHeight", innerBounds),
            innerBounds.height,
          ) / parseLayoutProperty(this._options, "idealHeight", innerBounds);
      } else {
        verticalScale =
          innerBounds.height /
          parseLayoutProperty(this._options, "idealHeight", innerBounds);
      }
    }

    if (this._options.keepAspectRatio) {
      const minScale = Math.min(horizontalScale, verticalScale);
      horizontalScale = minScale;
      verticalScale = minScale;
    }

    this._displayObject.scale.set(horizontalScale, verticalScale);

    const scaledWidth =
      parseLayoutProperty(this._options, "idealWidth", innerBounds) *
      horizontalScale;
    const scaledHeight =
      parseLayoutProperty(this._options, "idealHeight", innerBounds) *
      verticalScale;

    // Start with the position within the padding area
    const position = this._displayObject.parent.toLocal(
      new PIXI.Point(innerBounds.x, innerBounds.y),
    );

    // If the object has an non-zero anchor point, adjust the position
    if (!this._localBounds) {
      this._localBounds = this._displayObject.getLocalBounds();
    }
    position.x -= this._localBounds.left;
    position.y -= this._localBounds.top;

    // Handle horizontal alignment
    if (
      this._options.horizontalAlign !== "left" &&
      innerBounds.width > scaledWidth
    ) {
      const extraSpace = innerBounds.width - scaledWidth;
      if (this._options.horizontalAlign === "right") {
        position.x += extraSpace;
      } else if (this._options.horizontalAlign === "center") {
        position.x += extraSpace / 2;
      }
    }

    // Handle vertical alignment
    if (
      this._options.verticalAlign !== "top" &&
      innerBounds.height > scaledHeight
    ) {
      const extraSpace = innerBounds.height - scaledHeight;
      if (this._options.verticalAlign === "bottom") {
        position.y += extraSpace;
      } else if (this._options.verticalAlign === "middle") {
        position.y += extraSpace / 2;
      }
    }

    this._displayObject.position = position;
  }
}

export abstract class CompositeLayout extends LayoutBase {
  protected _children: Array<Layout>;
  protected _lastBounds: PIXI.Rectangle;

  constructor(children?: Array<Layout>, options?: Partial<LayoutOptions>) {
    super(options);

    this._children = [];
    if (children) {
      for (const child of children) {
        this.addChildLayout(child);
      }
    }
  }

  refresh(bounds: PIXI.Rectangle): void {
    this._lastBounds = bounds;

    super.refresh(bounds);
  }

  addChildLayout(child: Layout): void {
    const index = this._children.indexOf(child);
    if (index !== -1) throw new Error("Cannot add duplicate child layout");

    this._children.push(child);

    if (this._lastBounds) this.refresh(this._lastBounds);
  }

  removeChildLayout(child: Layout): void {
    const index = this._children.indexOf(child);
    if (index === -1) throw new Error("Cannot find child layout to remove");

    this._children.splice(index, 1);

    if (this._lastBounds) this.refresh(this._lastBounds);
  }
}

export class VerticalLayout extends CompositeLayout {
  protected _onRefresh(
    outerBounds: PIXI.Rectangle,
    innerBounds: PIXI.Rectangle,
  ): void {
    layoutAlongAxis(this._children, this.options, "vertical", innerBounds);
  }
}

export class HorizontalLayout extends CompositeLayout {
  protected _onRefresh(
    outerBounds: PIXI.Rectangle,
    innerBounds: PIXI.Rectangle,
  ): void {
    layoutAlongAxis(this._children, this.options, "horizontal", innerBounds);
  }
}

function layoutAlongAxis(
  items: Array<Layout>,
  options: LayoutOptions,
  direction: "horizontal" | "vertical",
  innerBounds: PIXI.Rectangle,
): void {
  // Determine which properties will be used depending on the direction
  const minLengthProp = direction === "vertical" ? "minHeight" : "minWidth";
  const idealLengthProp =
    direction === "vertical" ? "idealHeight" : "idealWidth";
  const maxLengthProp = direction === "vertical" ? "maxHeight" : "maxWidth";
  const lengthProp = direction === "vertical" ? "height" : "width";

  // Do a first pass to gather minimum space and element types
  const lengths: Array<number> = [];
  let childIndexesToGrow: Array<number> = [];

  let minUsedSpace = 0;
  for (let i = 0; i < items.length; i++) {
    const child = items[i];

    if (child.options[minLengthProp]) {
      minUsedSpace += parseLayoutProperty(
        child.options,
        minLengthProp,
        innerBounds,
      );
      lengths.push(
        parseLayoutProperty(child.options, minLengthProp, innerBounds),
      );
    } else {
      lengths.push(0);
    }

    // Prepare the next step by identifying those items with larger ideal lengths
    if (
      parseLayoutProperty(child.options, idealLengthProp, innerBounds) &&
      parseLayoutProperty(child.options, idealLengthProp, innerBounds) >=
        parseLayoutProperty(child.options, minLengthProp, innerBounds)
    ) {
      childIndexesToGrow.push(i);
    }
  }

  // Do a second pass to bring elements to their ideal lengths
  let availableExtraSpace = innerBounds[lengthProp] - minUsedSpace;
  while (availableExtraSpace > 1 && childIndexesToGrow.length > 0) {
    const extraSpacePerChild = availableExtraSpace / childIndexesToGrow.length;
    for (let i = 0; i < childIndexesToGrow.length; i++) {
      const childIndex = childIndexesToGrow[i];
      const child = items[childIndex];

      // Expand the element, but not beyond the ideal length
      const spaceToGive = Math.min(
        extraSpacePerChild,
        parseLayoutProperty(child.options, maxLengthProp, innerBounds) -
          lengths[childIndex],
      );
      lengths[childIndex] += spaceToGive;
      availableExtraSpace -= spaceToGive;

      if (
        lengths[childIndex] >=
        parseLayoutProperty(child.options, maxLengthProp, innerBounds)
      ) {
        // Remove the child from the array of indexes to grow. Keep i at the same value for the next loop
        childIndexesToGrow.splice(i, 1);
        i--;
      }
    }
  }

  // Identify elements that can still grow
  if (availableExtraSpace > 1) {
    childIndexesToGrow = [];

    for (let i = 0; i < items.length; i++) {
      const child = items[i];

      if (
        !parseLayoutProperty(child.options, maxLengthProp, innerBounds) ||
        parseLayoutProperty(child.options, maxLengthProp, innerBounds) >
          lengths[i]
      ) {
        childIndexesToGrow.push(i);
      }
    }
  }

  // Do extra passes, giving space to growing elements
  while (availableExtraSpace > 1 && childIndexesToGrow.length > 0) {
    const extraSpacePerChild = availableExtraSpace / childIndexesToGrow.length;
    for (let i = 0; i < childIndexesToGrow.length; i++) {
      const childIndex = childIndexesToGrow[i];
      const child = items[childIndex];

      if (child.options[maxLengthProp]) {
        // Expand the element, but not beyond the max length
        const spaceToGive = Math.min(
          extraSpacePerChild,
          parseLayoutProperty(child.options, maxLengthProp, innerBounds) -
            lengths[childIndex],
        );
        lengths[childIndex] += spaceToGive;
        availableExtraSpace -= spaceToGive;

        if (
          lengths[childIndex] >=
          parseLayoutProperty(child.options, maxLengthProp, innerBounds)
        ) {
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

  if (options.distributeSpace === "atStart") {
    axisOffset += availableExtraSpace;
  } else if (options.distributeSpace === "atStartAndEnd") {
    axisOffset += availableExtraSpace / 2;
  } else if (options.distributeSpace === "around") {
    axisOffset += availableExtraSpace / items.length / 2;
  }

  for (let i = 0; i < items.length; i++) {
    const child = items[i];

    let itemBounds: PIXI.Rectangle;
    if (direction === "vertical") {
      itemBounds = new PIXI.Rectangle(
        innerBounds.x,
        innerBounds.y + axisOffset,
        innerBounds.width,
        lengths[i],
      );
    } else {
      itemBounds = new PIXI.Rectangle(
        innerBounds.x + axisOffset,
        innerBounds.y,
        lengths[i],
        innerBounds.height,
      );
    }

    // Update item
    child.refresh(itemBounds);

    // Add space used to y offset
    axisOffset += lengths[i];

    // Distribute extra space between items
    if (options.distributeSpace === "between") {
      if (items.length > 1)
        axisOffset += availableExtraSpace / (items.length - 1);
    } else if (options.distributeSpace === "around") {
      axisOffset += availableExtraSpace / items.length;
    }
  }
}

/**
 * Uses padding to constrain child layouts.
 * All other options are ignored.
 */
export class PaddedLayout extends CompositeLayout {
  protected _onRefresh(
    outerBounds: PIXI.Rectangle,
    innerBounds: PIXI.Rectangle,
  ): void {
    for (const child of this._children) {
      child.refresh(innerBounds);
    }
  }
}

export class RootLayout extends CompositeLayout {
  constructor(
    private _rectangle?: PIXI.Rectangle,
    children?: Array<Layout>,
  ) {
    super(children);

    if (this._rectangle) this.refresh(this._rectangle);
  }

  protected _onRefresh(): void {
    if (this._lastBounds !== this._rectangle)
      throw new Error(
        "Root layout should not be called with other bounds than its own",
      );

    for (const child of this._children) {
      child.refresh(this._rectangle);
    }
  }

  get rectangle(): PIXI.Rectangle {
    return this._rectangle;
  }

  set rectangle(value: PIXI.Rectangle) {
    this._rectangle = value;
    if (this._rectangle) this.refresh(this._rectangle);
  }
}

export class RootLayoutResizer extends chip.ChipBase {
  private _onResizeHandler: () => void;

  constructor(private readonly _rootLayout: RootLayout) {
    super();
  }

  protected _onActivate(): void {
    if (!this.chipContext.pixiApplication)
      throw new Error("Cannot find PIXI app");

    this._onResize();

    // Listen to resize window events
    this._onResizeHandler = () => this._onResize();
    window.addEventListener("resize", this._onResizeHandler);
  }

  protected _onTerminate(): void {
    window.removeEventListener("resize", this._onResizeHandler);
  }

  private _onResize(): void {
    this._rootLayout.rectangle = this.chipContext.pixiApplication.screen;
  }

  get contextModification(): chip.ChipContextResolvable {
    return {
      layout: this._rootLayout,
    };
  }
}

// export function installFullScreenLayout(
//   rootConfig: chip.ChipConfig,
//   rootChip: chip.ParallelChip
// ) {
//   const rootLayout = new RootLayout();
//   const resizer = new RootLayoutResizer(rootLayout);

//   rootConfig.layout = rootLayout;
//   rootChip.addChildChip(resizer);
// }

export class LayoutChip extends chip.ChipBase {
  constructor(private readonly _layout: Layout) {
    super();
  }

  protected _onActivate(): void {
    if (!this.chipContext.layout) throw new Error("Cannot find parent layout");

    this.chipContext.layout.addChildLayout(this._layout);
  }

  protected _onTerminate(): void {
    this.chipContext.layout.removeChildLayout(this._layout);
  }
}

export class LayoutTest extends chip.Composite {
  private _container: PIXI.Container;

  protected _onActivate(): void {
    this._container = new PIXI.Container();
    this.chipContext.container.addChild(this._container);

    this._addHorizontalLayout();
  }

  private _addVerticalLayout() {
    const layout = new VerticalLayout([], {
      distributeSpace: "between",
      paddingBottom: 10,
    });

    {
      const red = new PIXI.Graphics();
      red.beginFill(0xff0000);
      red.drawRoundedRect(0, 0, 100, 100, 10);
      red.endFill();
      this._container.addChild(red);

      layout.addChildLayout(
        new DisplayObjectLayout(red, {
          maxWidth: 100,
          minHeight: 10,
          maxHeight: 100,
          horizontalAlign: "right",
          paddingTop: 10,
          paddingRight: 15,
        }),
      );
    }

    layout.addChildLayout(new SpacerLayout({ minHeight: 10, maxHeight: 10 }));

    {
      const blue = new PIXI.Graphics();
      blue.beginFill(0x00ff00);
      blue.drawRoundedRect(0, 0, 50, 100, 10);
      blue.endFill();
      this._container.addChild(blue);

      layout.addChildLayout(
        new DisplayObjectLayout(blue, {
          maxHeight: 200,
          idealHeight: 200,
        }),
      );
    }

    {
      const green = new PIXI.Graphics();
      green.beginFill(0x0000ff);
      green.drawRoundedRect(0, 0, 100, 50, 10);
      green.endFill();
      this._container.addChild(green);

      layout.addChildLayout(
        new DisplayObjectLayout(green, { horizontalAlign: "center" }),
      );
    }

    this._activateChildChip(new LayoutChip(layout));
  }

  private _addHorizontalLayout() {
    const layout = new HorizontalLayout([], {
      // distributeSpace: "between",
      paddingBottom: 10,
    });

    {
      const red = new PIXI.Graphics();
      red.beginFill(0xff0000);
      red.drawRoundedRect(0, 0, 100, 100, 10);
      red.endFill();
      this._container.addChild(red);

      layout.addChildLayout(
        new DisplayObjectLayout(red, {
          // maxWidth: 100,
          minWidth: "idealWidth",
          maxWidth: "idealWidth",
          verticalAlign: "top",
          paddingTop: 10,
          paddingRight: 15,
        }),
      );
    }

    layout.addChildLayout(new SpacerLayout({ minWidth: 10, maxWidth: 10 }));

    {
      const green = new PIXI.Graphics();
      green.beginFill(0x00ff00);
      green.drawRoundedRect(0, 0, 50, 100, 10);
      green.endFill();
      this._container.addChild(green);

      layout.addChildLayout(
        new DisplayObjectLayout(green, {
          maxWidth: 200,
          idealWidth: "maxWidth",
        }),
      );
    }

    {
      const blue = new PIXI.Graphics();
      blue.beginFill(0x0000ff);
      blue.drawRoundedRect(0, 0, 100, 50, 10);
      blue.endFill();
      this._container.addChild(blue);

      layout.addChildLayout(
        new DisplayObjectLayout(blue, { verticalAlign: "middle" }),
      );
    }

    this._activateChildChip(new LayoutChip(layout));
  }

  protected _onTerminate(): void {
    this.chipContext.container.removeChild(this._container);
    delete this._container;
  }
}

// // Container-based layout system

// /**
//  * Layout container that can be used as layout child.
//  */
// export class LayoutContainer extends PIXI.Container {
//   public layoutParent: LayoutContainer | null = null;

//   /**
//    * Width defined by parent
//    */
//   public expectedWidth: number;

//   /**
//    * Height defined by parent
//    */
//   public expectedHeight: number;

//   /**
//    * Update layout and layout children
//    * @param x
//    * @param y
//    * @param width
//    * @param height
//    */
//   public update(
//     x = this.x,
//     y = this.y,
//     width = this.expectedWidth,
//     height = this.expectedHeight
//   ) {
//     this.position.set(x, y);
//     this.expectedWidth = width;
//     this.expectedHeight = height;
//   }

//   /**
//    * Add layout child
//    * @param children
//    */
//   public addChild(...children: PIXI.DisplayObject[]) {
//     children.forEach((child) => {
//       if (child instanceof LayoutContainer) {
//         child.layoutParent = this;
//         child.zIndex = this.children.length;
//       }

//       super.addChild(child);
//     });

//     this.update();

//     return children[0];
//   }
// }

// /**
//  * Layout container that lays out children horizontally.
//  * Use zIndex as children order from left to right.
//  */
// export class RowLayoutContainer extends LayoutContainer {
//   update(
//     x = this.x,
//     y = this.y,
//     width = this.expectedWidth,
//     height = this.expectedHeight
//   ) {
//     super.update(x, y, width, height);

//     this.children.forEach((child, index) => {
//       if (child instanceof LayoutContainer) {
//         child.update(
//           (this.expectedWidth / this.children.length) * index,
//           0,
//           this.expectedWidth / this.children.length,
//           this.expectedHeight
//         );
//       } else if (
//         child instanceof PIXI.TilingSprite ||
//         child instanceof PIXI.NineSlicePlane
//       ) {
//         child.x = (this.expectedWidth / this.children.length) * index;
//         child.y = 0;
//         child.width = this.expectedWidth / this.children.length;
//         child.height = this.expectedHeight;
//       } else {
//         child.x = (this.expectedWidth / this.children.length) * index;
//         child.y = 0;
//       }
//     });
//   }
// }

// /**
//  * Layout container that lays out children vertically.
//  * Use zIndex as children order from top to bottom.
//  */
// export class ColumnLayoutContainer extends LayoutContainer {
//   update(
//     x = this.x,
//     y = this.y,
//     width = this.expectedWidth,
//     height = this.expectedHeight
//   ) {
//     super.update(x, y, width, height);

//     this.children.forEach((child, index) => {
//       if (child instanceof LayoutContainer) {
//         child.update(
//           0,
//           (this.expectedHeight / this.children.length) * index,
//           this.expectedWidth,
//           this.expectedHeight / this.children.length
//         );
//       } else if (child instanceof PIXI.TilingSprite) {
//         child.x = 0;
//         child.y = (this.expectedHeight / this.children.length) * index;
//         child.width = this.expectedWidth;
//         child.height = this.expectedHeight / this.children.length;
//       } else {
//         child.x = 0;
//         child.y = (this.expectedHeight / this.children.length) * index;
//       }
//     });
//   }
// }

// /**
//  * Layout container that place children in the center.
//  */
// export class CenterLayoutContainer extends LayoutContainer {
//   update(
//     x = this.x,
//     y = this.y,
//     width = this.expectedWidth,
//     height = this.expectedHeight
//   ) {
//     super.update(x, y, width, height);

//     this.children.forEach((child) => {
//       if (child instanceof LayoutContainer) {
//         child.update(
//           this.expectedWidth / 2 - child.expectedWidth / 2,
//           this.expectedHeight / 2 - child.expectedHeight / 2,
//           child.expectedWidth,
//           child.expectedHeight
//         );
//       } else if (child instanceof PIXI.Container) {
//         child.position.set(
//           this.expectedWidth / 2 - child.width / 2,
//           this.expectedHeight / 2 - child.height / 2
//         );
//       } else {
//         child.position.set(this.expectedWidth / 2, this.expectedHeight / 2);
//       }
//     });
//   }
// }
