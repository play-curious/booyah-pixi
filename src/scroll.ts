import * as PIXI from "pixi.js";
import * as booyah from "booyah";
import * as _ from "underscore";

import * as layout from "./layout";
import * as math from "./math";
import * as resolvable from "./resolvable";

function isTexture(object: any): object is PIXI.Texture {
  return object.baseTexture;
}

export type OverflowSettings = "auto" | "hidden" | "scroll";
export type Direction = "vertical" | "horizontal";

export class ScrollboxLayoutOptions extends layout.LayoutOptions {
  canGrow: layout.Directions = "both";
  canShrink: layout.Directions = "both";
}

export type ScrollboxDynamicOptionsResolvableContext = layout.RenderInfo;

type DymamicScrollboxOption<T> = resolvable.Resolvable<
  T,
  ScrollboxDynamicOptionsResolvableContext
>;

export class ScrollboxOptions extends layout.DisplayObjectChipOptions<
  PIXI.Container,
  layout.LayoutOptions
> {
  // The following options are static:
  content?: PIXI.DisplayObject;
  direction: Direction = "horizontal";
  scrollbarBackground: PIXI.Texture | PIXI.ColorSource = 0xaaaaaa;
  scrollbarHandle: PIXI.Texture | PIXI.ColorSource = 0x555555;
  scrollbarOffset = 0;
  scrollbarWidth = 20;
  dragScroll: boolean = true;
  dragThreshold: number = 5;
  stopPropagation: boolean = true;
  wheelScroll: boolean = true;

  // The following options are dynamic:
  boxWidth: DymamicScrollboxOption<number> = 100;
  boxHeight: DymamicScrollboxOption<number> = 100;
  contentWidthPadding: DymamicScrollboxOption<number> = 0;
  contentHeightPadding: DymamicScrollboxOption<number> = 0;
  overflow: DymamicScrollboxOption<OverflowSettings> = "auto";
}

type ScrollboxDynaicOptionsResolver = resolvable.Resolver<
  ScrollboxOptions,
  layout.RenderInfo
>;

/**
 * Based on David Fig's pixi-scrollbox https://github.com/davidfig/pixi-scrollbox/, but adapted to Booyah
 *
 * Events:
 *  moved ({ reason })
 *  refreshedContents
 **/
export class Scrollbox extends layout.ContainerBase<
  layout.LayoutOptions,
  ScrollboxOptions
> {
  private _dynamicOptionsResolver: ScrollboxDynaicOptionsResolver;
  private _pointerDown?: { type: "drag" | "scrollbar"; last: PIXI.IPointData };
  private _isDragging?: boolean;
  private _content?: PIXI.Container;
  private _scrollbarAnchor?: PIXI.Container;
  private _scrollbarBackground?: PIXI.NineSlicePlane;
  private _scrollbarHandle?: PIXI.NineSlicePlane;
  private _dragBackground?: PIXI.Sprite;
  private _mask?: PIXI.Sprite;

  /**
   * Can be provided with an existing container
   */
  constructor(partialOptions: Partial<ScrollboxOptions> = {}) {
    const filledOptions = booyah.fillInOptions(
      partialOptions,
      new ScrollboxOptions(),
    );
    filledOptions.layoutOptions = booyah.fillInOptions(
      filledOptions.layoutOptions,
      new ScrollboxLayoutOptions(),
    );

    const dynamicOptionsResolver = new resolvable.Resolver(filledOptions);

    // // Set the ideal size based on the given box sizes
    filledOptions.layoutOptions.idealWidth = () => this.boxWidth;
    filledOptions.layoutOptions.idealHeight = () => this.boxHeight;

    super(filledOptions);

    this._dynamicOptionsResolver =
      dynamicOptionsResolver as ScrollboxDynaicOptionsResolver;
  }

  protected _onActivate() {
    this._isDragging = false;

    this.displayObject.eventMode = "static";
    this._subscribe(this.displayObject, "globalpointermove", this._onMove);
    this._subscribe(this.displayObject, "pointerup", this._onUp);
    this._subscribe(this.displayObject, "pointercancel", this._onUp);
    this._subscribe(this.displayObject, "pointerupoutside", this._onUp);

    this._content = new PIXI.Container();
    if (this._options.content) this._content.addChild(this._options.content);

    if (this._options.dragScroll) {
      this._dragBackground = new PIXI.Sprite(PIXI.Texture.WHITE);
      this._dragBackground.eventMode = "static";
      this._dragBackground.alpha = 0;

      this._subscribe(this._dragBackground, "pointerdown", this._dragDown);
      this._subscribe(this._content, "pointerdown", this._dragDown);
      this._content.eventMode = "static";

      this._activateChildChip({
        chip: new layout.SpriteChip({
          displayObject: this._dragBackground,
          addToParentLayoutItem: false,
        }),
        context: { container: this.displayObject },
      });
    }

    this.displayObject.addChild(this._content);

    this._mask = new PIXI.Sprite(PIXI.Texture.WHITE);
    this._content.mask = this._mask;
    this._activateChildChip({
      chip: new layout.SpriteChip({
        displayObject: this._mask,
        addToParentLayoutItem: false,
      }),
      context: { container: this.displayObject },
    });

    if (this._options.wheelScroll) {
      this._subscribe(this.displayObject, "wheel", (event) =>
        this._onWheel(event),
      );
    }

    this._scrollbarAnchor = new PIXI.Container();

    if (isTexture(this._options.scrollbarBackground)) {
      this._scrollbarBackground = new PIXI.NineSlicePlane(
        this._options.scrollbarBackground,
      );
    } else {
      this._scrollbarBackground = new PIXI.NineSlicePlane(PIXI.Texture.WHITE);
      this._scrollbarBackground.tint = this._options.scrollbarBackground;
    }

    if (isTexture(this._options.scrollbarHandle)) {
      this._scrollbarHandle = new PIXI.NineSlicePlane(
        this._options.scrollbarHandle,
      );
    } else {
      this._scrollbarHandle = new PIXI.NineSlicePlane(PIXI.Texture.WHITE);
      this._scrollbarHandle.tint = this._options.scrollbarHandle;
    }

    let backroundProperties;
    let handleProperties;

    switch (this._options.direction) {
      case "horizontal": {
        backroundProperties = {
          height: this._options.scrollbarWidth,
          y: this._options.scrollbarOffset,
        };
        handleProperties = {
          height: this._options.scrollbarWidth,
          y: this._options.scrollbarOffset,
        };
        break;
      }
      case "vertical": {
        backroundProperties = {
          x: this._options.scrollbarOffset,
          width: this._options.scrollbarWidth,
        };
        handleProperties = {
          x: this._options.scrollbarOffset,
          width: this._options.scrollbarWidth,
        };
        break;
      }
    }

    this._activateChildChip({
      chip: new layout.ContainerLeafChip({
        displayObject: this._scrollbarAnchor,
        addToParentLayoutItem: false,
      }),
      context: { container: this.displayObject },
    });

    this._activateChildChip({
      chip: new layout.NineSlicePlaneChip({
        displayObject: this._scrollbarBackground,
        properties: backroundProperties,
        addToParentLayoutItem: false,
      }),
      context: { container: this._scrollbarAnchor },
    });

    this._activateChildChip({
      chip: new layout.NineSlicePlaneChip({
        displayObject: this._scrollbarHandle,
        properties: handleProperties,
        addToParentLayoutItem: false,
      }),
      context: { container: this._scrollbarAnchor },
    });

    this._scrollbarHandle.eventMode = "static";
    this._subscribe(
      this._scrollbarHandle,
      "pointerdown",
      this._scrollbarDown as any,
    );

    this.refreshContents();

    super._onActivate();
  }

  protected _onTerminate(): void {
    super._onTerminate();

    delete this._pointerDown;
  }

  protected override _updateDynamicProperties(): void {
    super._updateDynamicProperties();

    this._dynamicOptionsResolver.invalidate();
  }

  protected _resizeChildren(): void {
    // Provide unlimited bounds in the direction of scroll
    const childAbsoluteBounds = new layout.Bounds(
      this.lastResizeInfo!.absoluteBounds.x,
      this.lastResizeInfo!.absoluteBounds.y,
      this._options.direction === "horizontal" ? undefined : this.boxWidth,
      this._options.direction === "vertical" ? undefined : this.boxHeight,
    );
    const childLocalBounds = new layout.Bounds(
      0,
      0,
      this._options.direction === "horizontal" ? undefined : this.boxWidth,
      this._options.direction === "vertical" ? undefined : this.boxHeight,
    );

    // Resize all children
    const childResizeInfo: layout.ResizeInfo = {
      absoluteBounds: this.calculateInnerBounds(childAbsoluteBounds),
      localBounds: this.calculateInnerBounds(childLocalBounds),
    };
    for (const child of this._childLayoutItems!) child.resize(childResizeInfo);
  }

  protected _onResize(): void {
    this._dragBackground.width = this.boxWidth;
    this._dragBackground.height = this.boxHeight;
    this._mask.width = this.boxWidth;
    this._mask.height = this.boxHeight;

    if (this._options.direction == "horizontal") {
      this._scrollbarAnchor.y = this.boxHeight;
    } else {
      this._scrollbarAnchor.x = this.boxWidth;
    }

    this.scrollTo(this.content!.position);
    this._updateScrollbars();
  }

  /** Call when container contents have changed  */
  public refreshContents() {
    this.scrollTo(this.content!.position);
    this._updateScrollbars();
    this.emit("refreshedContents");
  }

  get contentWidth() {
    if (!this._content)
      return this._resolveDynamicOption("contentWidthPadding") as number;

    return (
      this._content!.getLocalBounds().right +
      (this._resolveDynamicOption("contentWidthPadding") as number)
    );
  }

  get contentHeight() {
    if (!this._content)
      return this._resolveDynamicOption("contentHeightPadding") as number;

    return (
      this._content!.getLocalBounds().bottom +
      (this._resolveDynamicOption("contentHeightPadding") as number)
    );
  }

  /** Update scrollbar sizes, but not position */
  private _updateScrollbars() {
    let boxSize: number;
    let contentSize: number;

    const bounds = this._content!.getLocalBounds();
    switch (this._options.direction) {
      case "horizontal": {
        boxSize = this.boxWidth;
        contentSize = this.contentWidth;
        break;
      }
      case "vertical": {
        boxSize = this.boxHeight;
        contentSize = this.contentHeight;
        break;
      }
    }

    const overflow = this._resolveDynamicOption("overflow");
    if (
      overflow === "hidden" ||
      (overflow === "auto" && boxSize > contentSize)
    ) {
      this._scrollbarAnchor!.visible = false;
      return;
    }

    this._scrollbarAnchor!.visible = true;
    const ratio = booyah.clamp(boxSize / contentSize, 0, 1);

    switch (this._options.direction) {
      case "horizontal": {
        this._scrollbarBackground!.width = boxSize;
        this._scrollbarHandle!.width = boxSize * ratio;
        this._scrollbarHandle!.x = -1 * this.currentScroll * ratio;
        break;
      }
      case "vertical": {
        this._scrollbarBackground!.height = boxSize;
        this._scrollbarHandle!.height = boxSize * ratio;
        this._scrollbarHandle!.y = -this._content!.y * ratio;
        break;
      }
    }
  }

  private _onMove(e: PIXI.FederatedPointerEvent) {
    if (!this._pointerDown) return;

    if (this._pointerDown.type === "scrollbar") this._scrollbarMove(e);
    else if (this._pointerDown.type === "drag") this._dragMove(e);
    else throw new Error("no such type");

    if (this._options.stopPropagation) {
      e.stopPropagation();
    }
  }

  private _onUp(e: PIXI.FederatedPointerEvent) {
    if (!this._pointerDown) return;

    if (this._pointerDown.type === "scrollbar") this._scrollbarUp();
    else if (this._pointerDown.type === "drag") this._dragUp();
    else throw new Error("no such type");

    if (this._options.stopPropagation && this._isDragging) {
      e.stopPropagation();
    }

    delete this._pointerDown;
    this._isDragging = false;
  }

  /**
   * handle pointer down on scrollbar
   * @param {PIXI.FederatedPointerEvent} e
   * @private
   */
  private _scrollbarDown(e: PIXI.FederatedPointerEvent) {
    if (this._pointerDown) return;

    const local = this.displayObject.toLocal(e.global);
    this._pointerDown = {
      type: "scrollbar",
      last: local,
    };

    if (this._options.stopPropagation) {
      e.stopPropagation();
    }
  }

  /**
   * handle pointer move on scrollbar
   * @param {PIXI.FederatedPointerEvent} e
   * @private
   */
  private _scrollbarMove(e: PIXI.FederatedPointerEvent) {
    const local = this.displayObject.toLocal(e.global);

    if (this._options.direction === "horizontal") {
      const deltaPosition = local.x - this._pointerDown!.last.x;
      if (!this._isDragging) {
        if (Math.abs(deltaPosition) <= this._options.dragThreshold) return;

        this._isDragging = true;
      }

      const ratio = this.boxWidth / this.contentWidth;
      const fraction = deltaPosition / ratio;
      this.scrollBy({ x: -fraction, y: 0 });
    } else {
      const deltaPosition = local.y - this._pointerDown!.last.y;
      if (!this._isDragging) {
        if (Math.abs(deltaPosition) <= this._options.dragThreshold) return;

        this._isDragging = true;
      }

      const ratio = this.boxHeight / this.contentHeight;
      const fraction = deltaPosition / ratio;
      this.scrollBy({ x: 0, y: -fraction });
    }

    this._pointerDown!.last = local;

    if (this._options.stopPropagation) {
      e.stopPropagation();
    }
  }

  /**
   * handle pointer up on scrollbar
   * @private
   */
  private _scrollbarUp() {
    delete this._pointerDown;
    this._content!.interactiveChildren = true;
  }

  /**
   * handle pointer down on content
   * @param {PIXI.FederatedPointerEvent} e
   * @private
   */
  private _dragDown(e: PIXI.FederatedPointerEvent) {
    if (this._pointerDown) return;

    const local = this.displayObject.toLocal(e.global);
    this._pointerDown = { type: "drag", last: local };

    if (this._options.stopPropagation) {
      e.stopPropagation();
    }
  }

  /**
   * handle pointer move on content
   * @param {PIXI.FederatedPointerEvent} e
   * @private
   */

  private _dragMove(e: PIXI.FederatedPointerEvent) {
    const local = this.displayObject.toLocal(e.global) as PIXI.Point;
    const deltaPosition: PIXI.IPointData = { x: 0, y: 0 };

    if (this._options.direction === "horizontal") {
      deltaPosition.x = local.x - this._pointerDown!.last.x;
    } else {
      deltaPosition.y = local.y - this._pointerDown!.last.y;
    }

    if (!this._isDragging) {
      if (math.magnitude(deltaPosition) <= this._options.dragThreshold) return;

      this._isDragging = true;
    }

    this.scrollBy(deltaPosition);
    this._pointerDown!.last = local;
    this._content!.interactiveChildren = false;

    if (this._options.stopPropagation) {
      e.stopPropagation();
    }
  }

  /**
   * handle pointer up on content
   * @private
   */
  private _dragUp() {
    delete this._pointerDown;
    this._content!.interactiveChildren = true;
  }

  /**
   * handle wheel events
   * @param {WheelEvent} e
   */
  private _onWheel(e: WheelEvent) {
    // Finally, scroll!
    const scrollAmount = -e.deltaY / 5;
    if (this._options.direction === "horizontal") {
      this.scrollBy({ x: scrollAmount, y: 0 });
    } else {
      this.scrollBy({ x: 0, y: scrollAmount });
    }

    e.preventDefault();
  }

  public scrollBy(amount: PIXI.IPointData, reason = "user") {
    this.scrollTo(math.add(this._content!.position, amount), reason);
  }

  public scrollTo(position: PIXI.IPointData, reason = "user") {
    position.x = booyah.clamp(position.x, this.boxWidth - this.contentWidth, 0);
    position.y = booyah.clamp(
      position.y,
      this.boxHeight - this.contentHeight,
      0,
    );
    this._content!.position.copyFrom(position);

    this._updateScrollbars();

    this.emit("moved", { reason });
  }

  scrollAlongAxis(position: "start" | "end" | number, reason = "user") {
    const position2 = new PIXI.Point();
    if (this._options.direction === "horizontal") {
      if (position === "start") {
        position2.x = 0;
      } else if (position === "end") {
        position2.x = this.boxWidth - this.contentWidth;
      } else {
        position2.x = position;
      }
    } else {
      if (position === "start") {
        position2.y = 0;
      } else if (position === "end") {
        position2.y = this.boxHeight - this.contentHeight;
      } else {
        position2.y = position;
      }
    }

    this.scrollTo(position2, reason);
  }

  public get currentScroll() {
    return this._options.direction === "horizontal"
      ? this._content!.x
      : this._content!.y;
  }

  public get content() {
    return this._content;
  }

  get boxWidth(): number {
    if (!this._lastResizeInfo)
      return this._resolveDynamicOption("boxWidth") as number;

    return (
      this._lastResizeInfo.localBounds.width! -
      this._options.scrollbarWidth -
      this._options.scrollbarOffset
    );
  }

  get boxHeight(): number {
    if (!this._lastResizeInfo)
      return this._resolveDynamicOption("boxHeight") as number;

    return (
      this._lastResizeInfo?.localBounds.height! -
      this._options.scrollbarWidth -
      this._options.scrollbarOffset
    );
  }

  /** Put child elements into the `content` container */
  get contextModification(): booyah.ChipContextResolvable {
    const parentValue = super.contextModification;
    return Object.assign({}, parentValue, {
      container: this._content,
    });
  }

  private _resolveDynamicOption(option: keyof ScrollboxOptions) {
    return this._dynamicOptionsResolver.resolve(option, {
      renderSize: this.pixiAppChip.renderSize,
    });
  }
}
