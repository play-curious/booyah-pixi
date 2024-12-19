import * as chip from "booyah/dist/chip";
import * as geom from "booyah/dist/geom";
import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as layout from "./layout";
import * as math from "./math";
import * as resolvable from "./resolvable";

function isTexture(object: any): object is PIXI.Texture {
  return object.baseTexture;
}

export type OverflowSettings = "auto" | "hidden" | "scroll";
export type Direction = "vertical" | "horizontal";

export class ScrollboxLayoutOptions extends layout.LayoutOptionsBase {
  minWidth: layout.LayoutValue = "idealWidth";
  minHeight: layout.LayoutValue = "idealHeight";
}

export class ScrollboxOptions extends layout.DisplayObjectChipOptions<
  PIXI.Container,
  layout.LayoutOptionsBase
> {
  content?: PIXI.DisplayObject;
  boxWidth: number = 100;
  boxHeight: number = 100;
  overflow: OverflowSettings = "auto";
  direction: Direction = "horizontal";
  scrollbarOffset: number = 0;
  scrollbarWidth: number = 20;
  scrollbarBackground: PIXI.Texture | PIXI.ColorSource = 0xaaaaaa;
  scrollbarHandle: PIXI.Texture | PIXI.ColorSource = 0x555555;
  dragScroll: boolean = true;
  dragThreshold: number = 5;
  stopPropagation: boolean = true;
  wheelScroll: boolean = true;
}

type ScrollboxResolvableContext =
  layout.LayoutValueResolvableContext<layout.LayoutOptionsBase>;

/**
 * Based on David Fig's pixi-scrollbox https://github.com/davidfig/pixi-scrollbox/, but adapted to Booyah
 *
 * Events:
 *  moved ({ reason })
 *  refreshedContents
 **/
export class Scrollbox extends layout.ContainerBase<
  layout.LayoutOptionsBase,
  ScrollboxOptions
> {
  private _pointerDown?: { type: "drag" | "scrollbar"; last: PIXI.IPointData };
  // private _container: PIXI.Container;
  private _content: PIXI.Container;
  private _scrollbarAnchor: PIXI.Container;
  private _scrollbarBackground: PIXI.NineSlicePlane;
  private _scrollbarHandle: PIXI.NineSlicePlane;

  /**
   * Can be provided with an existing container
   */
  constructor(
    partialOptions: Partial<
      resolvable.ResolvableObject<ScrollboxOptions, ScrollboxResolvableContext>
    >,
  ) {
    const filledOptions = chip.fillInOptions(
      partialOptions,
      new ScrollboxOptions(),
    );
    filledOptions.layoutOptions = chip.fillInOptions(
      filledOptions.layoutOptions,
      new ScrollboxLayoutOptions(),
    );

    // Set the ideal size based on the given box sizes
    filledOptions.layoutOptions.idealWidth = filledOptions.boxWidth;
    filledOptions.layoutOptions.idealHeight = filledOptions.boxHeight;

    super(filledOptions);

    // this._optionsResolver = new resolvable.Resolver(filledOptions);
  }

  protected _onActivate() {
    super._onActivate();

    // this._optionsResolver.setResovableCollection(this.resolvableOptions);
    // this._optionsResolver.resolve({
    //   renderSize: this.chipContext.pixiAppChip.renderSize,
    // });
    // this._options = this._optionsResolver.getResolvedCollection();

    this.displayObject.eventMode = "static";
    this._subscribe(this.displayObject, "globalpointermove", this._onMove);
    this._subscribe(this.displayObject, "pointerup", this._onUp);
    this._subscribe(this.displayObject, "pointercancel", this._onUp);
    this._subscribe(this.displayObject, "pointerupoutside", this._onUp);

    this._content = new PIXI.Container();
    if (this._options.content) this._content.addChild(this._options.content);

    if (this._options.dragScroll) {
      const dragBackground = new PIXI.Sprite(PIXI.Texture.WHITE);
      dragBackground.eventMode = "static";
      dragBackground.alpha = 0;

      this._subscribe(dragBackground, "pointerdown", this._dragDown);
      this._subscribe(this._content, "pointerdown", this._dragDown);
      this._content.eventMode = "static";

      this._activateChildChip({
        chip: new layout.SpriteChip({
          displayObject: dragBackground,
          properties: {
            width: () => this.boxWidth,
            height: () => this.boxHeight,
          },
          addToParentLayoutItem: false,
        }),
        context: { container: this.displayObject },
      });
    }

    this.displayObject.addChild(this._content);

    const mask = new PIXI.Sprite(PIXI.Texture.WHITE);
    this._content.mask = mask;
    this._activateChildChip({
      chip: new layout.SpriteChip({
        displayObject: mask,
        properties: {
          width: () => this.boxWidth,
          height: () => this.boxHeight,
        },
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

    let anchorProperties;
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
        anchorProperties = { y: () => this.boxHeight };
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
        anchorProperties = { x: () => this.boxWidth };
        break;
      }
    }

    this._activateChildChip({
      chip: new layout.ContainerLeafChip({
        displayObject: this._scrollbarAnchor,
        properties: anchorProperties,
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

    // TODO: check that resize event is working
    this._subscribe(this, "didResize", this.refreshContents);

    // this._subscribe(this.chipContext.pixiAppChip, "resize", () => {
    //   this._optionsResolver.setResovableCollection(this.resolvableOptions);
    //   this._optionsResolver.resolve({
    //     renderSize: this.chipContext.pixiAppChip.renderSize,
    //   });
    //   this._options = this._optionsResolver.getResolvedCollection();
    //   this.refresh();
    // });
  }

  protected _onTerminate(): void {
    delete this._pointerDown;
  }

  protected _onResize(): void {
    // Provide unlimited bounds in the direction of scroll
    const childAbsoluteBounds = new layout.Bounds(
      this.lastResizeInfo.absoluteBounds.x,
      this.lastResizeInfo.absoluteBounds.y,
      this._options.direction === "horizontal" ? undefined : this.boxWidth,
      this._options.direction === "vertical" ? undefined : this.boxHeight,
    );
    const childLocalBounds = new layout.Bounds(
      this.lastResizeInfo.localBounds.x,
      this.lastResizeInfo.localBounds.y,
      this._options.direction === "horizontal" ? undefined : this.boxWidth,
      this._options.direction === "vertical" ? undefined : this.boxHeight,
    );

    // Resize all children
    const childResizeInfo: layout.ResizeInfo = {
      absoluteBounds: this.calculateInnerBounds(childAbsoluteBounds),
      localBounds: this.calculateInnerBounds(childLocalBounds),
    };
    for (const child of this._childLayoutItems) child.resize(childResizeInfo);

    super._onResize();
  }

  /** Call when container contents have changed  */
  public refreshContents() {
    this.scrollTo(this.content.position);
    this._updateScrollbars();
    this.emit("refreshedContents");
  }

  private _updateScrollbars() {
    let boxSize: number;
    let contentSize: number;

    switch (this._options.direction) {
      case "horizontal": {
        boxSize = this.boxWidth;
        contentSize = this._content.width;
        break;
      }
      case "vertical": {
        boxSize = this.boxHeight;
        contentSize = this._content.height;
        break;
      }
    }

    if (
      this._options.overflow === "hidden" ||
      (this._options.overflow === "auto" && boxSize > contentSize)
    ) {
      this._scrollbarAnchor.visible = false;
      return;
    }

    this._scrollbarAnchor.visible = true;
    const ratio = geom.clamp(boxSize / contentSize, 0, 1);

    switch (this._options.direction) {
      case "horizontal": {
        this._scrollbarBackground.width = boxSize;
        this._scrollbarHandle.width = boxSize * ratio;
        this._scrollbarHandle.x = -1 * this.currentScroll * ratio;
        break;
      }
      case "vertical": {
        this._scrollbarBackground.height = boxSize;
        this._scrollbarHandle.height = boxSize * ratio;
        this._scrollbarHandle.y = -this._content.y * ratio;
        break;
      }
    }
  }

  private _onMove(e: PIXI.FederatedPointerEvent) {
    if (!this._pointerDown) return;

    if (this._pointerDown.type === "scrollbar") this._scrollbarMove(e);
    else if (this._pointerDown.type === "drag") this._dragMove(e);
    else throw new Error("no such type");
  }

  private _onUp(e: PIXI.FederatedPointerEvent) {
    if (!this._pointerDown) return;

    if (this._pointerDown.type === "scrollbar") this._scrollbarUp();
    else if (this._pointerDown.type === "drag") this._dragUp();
    else throw new Error("no such type");
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
    return;
  }

  /**
   * handle pointer move on scrollbar
   * @param {PIXI.FederatedPointerEvent} e
   * @private
   */
  private _scrollbarMove(e: PIXI.FederatedPointerEvent) {
    const local = this.displayObject.toLocal(e.global);

    if (this._options.direction === "horizontal") {
      const deltaPosition = local.x - this._pointerDown.last.x;
      const ratio = this.boxWidth / this._content.width;
      const fraction = deltaPosition / ratio;
      this.scrollBy({ x: -fraction, y: 0 });
    } else {
      const deltaPosition = local.y - this._pointerDown.last.y;
      const ratio = this.boxHeight / this._content.height;
      const fraction = deltaPosition / ratio;
      this.scrollBy({ x: 0, y: -fraction });
    }

    this._pointerDown.last = local;

    if (this._options.stopPropagation) {
      e.stopPropagation();
    }
  }

  /**
   * handle pointer up on scrollbar
   * @private
   */
  private _scrollbarUp() {
    this._pointerDown = null;
    this._content.interactiveChildren = true;
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
      deltaPosition.x = local.x - this._pointerDown.last.x;
    } else {
      deltaPosition.y = local.y - this._pointerDown.last.y;
    }

    if (math.magnitude(deltaPosition) <= this._options.dragThreshold) return;

    this.scrollBy(deltaPosition);
    this._pointerDown.last = local;
    this._content.interactiveChildren = false;

    if (this._options.stopPropagation) {
      e.stopPropagation();
    }
  }

  /**
   * handle pointer up on content
   * @private
   */
  private _dragUp() {
    this._pointerDown = null;
    this._content.interactiveChildren = true;
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
    this.scrollTo(math.add(this._content.position, amount), reason);
  }

  public scrollTo(position: PIXI.IPointData, reason = "user") {
    position.x = geom.clamp(position.x, this.boxWidth - this._content.width, 0);
    position.y = geom.clamp(
      position.y,
      this.boxHeight - this._content.height,
      0,
    );
    this._content.position.copyFrom(position);

    this._updateScrollbars();

    this.emit("moved", { reason });
  }

  scrollAlongAxis(position: "start" | "end" | number, reason = "user") {
    const position2 = new PIXI.Point();
    if (this._options.direction === "horizontal") {
      if (position === "start") {
        position2.x = 0;
      } else if (position === "end") {
        position2.x = this.boxWidth - this._content.width;
      } else {
        position2.x = position;
      }
    } else {
      if (position === "start") {
        position2.y = 0;
      } else if (position === "end") {
        position2.y = this.boxHeight - this._content.height;
      } else {
        position2.y = position;
      }
    }

    this.scrollTo(position2, reason);
  }

  public get currentScroll() {
    return this._options.direction === "horizontal"
      ? this._content.x
      : this._content.y;
  }

  public get content() {
    return this._content;
  }

  get boxWidth(): number {
    if (!this._lastResizeInfo) return this._options.boxWidth;

    return (
      this._lastResizeInfo.localBounds.width -
      this._options.scrollbarWidth -
      this._options.scrollbarOffset
    );
  }

  get boxHeight(): number {
    if (!this._lastResizeInfo) return this._options.boxWidth;

    return (
      this._lastResizeInfo?.localBounds.height -
      this._options.scrollbarWidth -
      this._options.scrollbarOffset
    );
  }

  /** Put child elements into the `content` container */
  get contextModification(): chip.ChipContextResolvable {
    const parentValue = super.contextModification;
    return Object.assign({}, parentValue, {
      container: this._content,
    });
  }
}
