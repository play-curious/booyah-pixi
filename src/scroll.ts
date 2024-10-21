import * as chip from "booyah/dist/chip";
import * as geom from "booyah/dist/geom";
import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as booyahPixi from "./booyahPixi";

export class ScrollboxOptions {
  content: any = null;
  boxWidth: number = 100;
  boxHeight: number = 100;
  overflow: number | string = "auto";
  direction: "horizontal" | "vertical" = "horizontal";
  scrollbarBackground: PIXI.NineSlicePlane;
  scrollbarForeground: PIXI.NineSlicePlane;
  dragScroll: boolean = true;
  dragThreshold: number = 5;
  stopPropagation: boolean = true;
  wheelScroll: boolean = true;
}

/* OLD DEFAULT
    _.defaults({}, options, {
      content: null,
      boxWidth: 100,
      boxHeight: 100,
      overflowX: "auto",
      overflowY: "auto",
      scrollbarOffsetHorizontal: 0,
      scrollbarOffsetVertical: 0,
      scrollbarSize: 10,
      scrollbarBackground: 14540253,
      scrollbarBackgroundAlpha: 1,
      scrollbarForeground: 8947848,
      scrollbarForegroundAlpha: 1,
      dragScroll: true,
      dragThreshold: 5,
      stopPropagation: true,
      contentMarginX: 0,
      contentMarginY: 0,
      wheelScroll: true,
    });
  */

/**
 * Based on David Fig's pixi-scrollbox https://github.com/davidfig/pixi-scrollbox/, but adapted to Booyah
 *
 * Events:
 *  moved ({ reason })
 *  refreshed
 **/
export class Scrollbox extends chip.Composite {
  public options: ScrollboxOptions;
  public container: PIXI.Container;
  public content: PIXI.Container;
  public pointerDown: any;
  public onWheelHandler: () => void;

  private _scrollbarAnchor: PIXI.Container;
  private _scrollbarBackground: PIXI.NineSlicePlane;
  private _scrollbarHandle: PIXI.NineSlicePlane;

  private _ratio: number;

  /**
   * Can be provided with an existing container
   */
  constructor(partialOptions: Partial<ScrollboxOptions>) {
    super();

    this.options = chip.fillInOptions(partialOptions, new ScrollboxOptions());
  }

  _onActivate() {
    // Last pointerdown event
    this.pointerDown = null;

    this.container = new PIXI.Container();
    this._activateChildChip(new booyahPixi.DisplayObjectChip(this.container));
    this.container.eventMode = "static";
    this._subscribe(this.container, "globalpointermove", this._onMove as any);
    this._subscribe(this.container, "pointerup", this._onUp as any);
    this._subscribe(this.container, "pointercancel", this._onUp as any);
    this._subscribe(this.container, "pointerupoutside", this._onUp as any);

    this.content = new PIXI.Container();
    if (this.options.content) this.content.addChild(this.options.content);
    this.container.addChild(this.content);

    this._scrollbarAnchor = new PIXI.Container();
    this._scrollbarBackground = this.options.scrollbarBackground;
    this._scrollbarAnchor.addChild(this._scrollbarBackground);
    this._scrollbarHandle = this.options.scrollbarForeground;
    this._scrollbarAnchor.addChild(this._scrollbarHandle);

    this._scrollbarAnchor.eventMode = "static";
    this._scrollbarAnchor.position = {
      x: 0,
      y: this.options.boxHeight,
    };
    this._activateChildChip({
      chip: new booyahPixi.DisplayObjectChip(this._scrollbarAnchor),
      context: { container: this.container },
    });

    this._scrollbarHandle.eventMode = "static";
    this._subscribe(
      this._scrollbarHandle,
      "pointerdown",
      this._scrollbarDown as any,
    );

    if (this.options.dragScroll) {
      const dragBackground = new PIXI.Graphics();
      dragBackground
        .beginFill(0)
        .drawRect(0, 0, this.options.boxWidth, this.options.boxHeight)
        .endFill();
      dragBackground.alpha = 0;

      this._subscribe(this.content, "pointerdown", this._dragDown as any);
      this.content.addChild(dragBackground);
    }

    //this.scrollbar = new PIXI.Graphics();
    //this.scrollbar.eventMode = "static";
    //this._subscribe(this.scrollbar, "pointerdown", this._scrollbarDown as any);
    //this.container.addChild(this.scrollbar);

    const mask = new PIXI.Graphics();
    mask
      .beginFill(0)
      .drawRect(0, 0, this.options.boxWidth, this.options.boxHeight)
      .endFill();
    this.content.mask = mask;
    this.container.addChild(mask);

    if (this.options.wheelScroll) {
      this.onWheelHandler = this._onWheel.bind(this);
      this._chipContext.pixiApplication.view.addEventListener(
        "wheel",
        this.onWheelHandler,
      );
    }

    this.refresh();
  }

  _onTerminate() {
    if (this.options.wheelScroll) {
      this._chipContext.app.view.removeEventListener(
        "wheel",
        this.onWheelHandler,
      );
    }
  }

  /** Call when container contents have changed  */
  refresh() {
    this._updateScrollbars();

    this.emit("refreshed");
  }

  _updateScrollbars() {
    const boxSize = this.options.boxWidth;
    const contentSize = this.content.width;
    const contentPosition = this.content.x;

    this._ratio = boxSize / contentSize;

    this._scrollbarBackground.width = boxSize;
    this._scrollbarHandle.width = boxSize * this._ratio;
    this._scrollbarHandle.x = -contentPosition * this._ratio;
  }

  // From the same function in pixi-scrollbox
  /*
  _drawScrollbars() {
    this.scrollbar.clear();
    const options: any = {};
    options.left = 0;
    options.right =
      this.content.width +
      this.options.contentMarginX +
      (this._isScrollbarVertical ? this.options.scrollbarSize : 0);
    options.top = 0;
    options.bottom =
      this.content.height +
      this.options.contentMarginY +
      (this.isScrollbarHorizontal ? this.options.scrollbarSize : 0);
    const width =
      this.content.width +
      this.options.contentMarginX +
      (this.isScrollbarVertical ? this.options.scrollbarSize : 0);
    const height =
      this.content.height +
      this.options.contentMarginY +
      (this.isScrollbarHorizontal ? this.options.scrollbarSize : 0);
    this.scrollbarTop = (-this.content.y / height) * this.options.boxHeight;
    this.scrollbarTop = this.scrollbarTop < 0 ? 0 : this.scrollbarTop;
    this.scrollbarHeight =
      (this.options.boxHeight / height) * this.options.boxHeight;
    this.scrollbarHeight =
      this.scrollbarTop + this.scrollbarHeight > this.options.boxHeight
        ? this.options.boxHeight - this.scrollbarTop
        : this.scrollbarHeight;
    this.scrollbarLeft = (-this.content.x / width) * this.options.boxWidth;
    this.scrollbarLeft = this.scrollbarLeft < 0 ? 0 : this.scrollbarLeft;
    this.scrollbarWidth =
      (this.options.boxWidth / width) * this.options.boxWidth;
    this.scrollbarWidth =
      this.scrollbarWidth + this.scrollbarLeft > this.options.boxWidth
        ? this.options.boxWidth - this.scrollbarLeft
        : this.scrollbarWidth;
    if (this.isScrollbarVertical) {
      this.scrollbar
        .beginFill(
          this.options.scrollbarBackground,
          this.options.scrollbarBackgroundAlpha,
        )
        .drawRect(
          this.options.boxWidth -
            this.options.scrollbarSize +
            this.options.scrollbarOffsetVertical,
          0,
          this.options.scrollbarSize,
          this.options.boxHeight,
        )
        .endFill();
    }
    if (this.isScrollbarHorizontal) {
      this.scrollbar
        .beginFill(
          this.options.scrollbarBackground,
          this.options.scrollbarBackgroundAlpha,
        )
        .drawRect(
          0,
          this.options.boxHeight -
            this.options.scrollbarSize +
            this.options.scrollbarOffsetHorizontal,
          this.options.boxWidth,
          this.options.scrollbarSize,
        )
        .endFill();
    }
    if (this.isScrollbarVertical) {
      this.scrollbar
        .beginFill(
          this.options.scrollbarForeground,
          this.options.scrollbarForegroundAlpha,
        )
        .drawRect(
          this.options.boxWidth -
            this.options.scrollbarSize +
            this.options.scrollbarOffsetVertical,
          this.scrollbarTop,
          this.options.scrollbarSize,
          this.scrollbarHeight,
        )
        .endFill();
    }
    if (this.isScrollbarHorizontal) {
      this.scrollbar
        .beginFill(
          this.options.scrollbarForeground,
          this.options.scrollbarForegroundAlpha,
        )
        .drawRect(
          this.scrollbarLeft,
          this.options.boxHeight -
            this.options.scrollbarSize +
            this.options.scrollbarOffsetHorizontal,
          this.scrollbarWidth,
          this.options.scrollbarSize,
        )
        .endFill();
    }
  } */

  _onMove(e: PIXI.FederatedPointerEvent) {
    if (!this.pointerDown) return;

    if (this.pointerDown.type === "scrollbar") this._scrollbarMove(e);
    else if (this.pointerDown.type === "drag") this._dragMove(e);
    else throw new Error("no such type");
  }

  _onUp(e: PIXI.FederatedPointerEvent) {
    if (!this.pointerDown) return;

    if (this.pointerDown.type === "scrollbar") this._scrollbarUp();
    else if (this.pointerDown.type === "drag") this._dragUp();
    else throw new Error("no such type");
  }

  /**
   * handle pointer down on scrollbar
   * @param {PIXI.FederatedPointerEvent} e
   * @private
   */
  _scrollbarDown(e: PIXI.FederatedPointerEvent) {
    if (this.pointerDown) return;

    const local = this._scrollbarAnchor.toLocal(e.global);
    this.pointerDown = {
      type: "scrollbar",
      direction: "horizontal",
      last: local,
    };

    if (this.options.stopPropagation) {
      e.stopPropagation();
    }
    return;
  }

  /**
   * handle pointer move on scrollbar
   * @param {PIXI.FederatedPointerEvent} e
   * @private
   */
  _scrollbarMove(e: PIXI.FederatedPointerEvent) {
    if (this.pointerDown.direction === "horizontal") {
      const local = this._scrollbarAnchor.toLocal(e.global);
      const deltaPosition = local.x - this.pointerDown.last.x;
      const fraction = deltaPosition / this._ratio;

      this.scrollBy(new PIXI.Point(-fraction, 0));
      this.pointerDown.last = local;
    }
    if (this.options.stopPropagation) {
      e.stopPropagation();
    }
  }

  /**
   * handle pointer up on scrollbar
   * @private
   */
  _scrollbarUp() {
    this.pointerDown = null;
    this.content.interactiveChildren = true;
  }

  /**
   * handle pointer down on content
   * @param {PIXI.FederatedPointerEvent} e
   * @private
   */
  _dragDown(e: PIXI.FederatedPointerEvent) {
    if (this.pointerDown) return;

    this.content.interactiveChildren = false;

    const local = this.container.toLocal(e.global);
    this.pointerDown = { type: "drag", last: local };

    // if (this.options.stopPropagation) {
    //   e.stopPropagation();
    // }
  }

  /**
   * handle pointer move on content
   * @param {PIXI.FederatedPointerEvent} e
   * @private
   */

  _dragMove(e: PIXI.FederatedPointerEvent) {
    const local = this.container.toLocal(e.global) as PIXI.Point;
    if (
      booyahPixi.distance(local, this.pointerDown.last) <=
      this.options.dragThreshold
    )
      return;

    const scrollAmount = booyahPixi.subtract(local, this.pointerDown.last);
    //if (!this.isScrollbarHorizontal) scrollAmount.x = 0;
    //if (!this.isScrollbarVertical) scrollAmount.y = 0;

    this.scrollBy(scrollAmount);

    this.pointerDown.last = local;

    // if (this.options.stopPropagation) {
    //   e.stopPropagation();
    // }
  }

  /**
   * handle pointer up on content
   * @private
   */
  _dragUp() {
    this.pointerDown = null;
    this.content.interactiveChildren = true;
  }

  /**
   * handle wheel events
   * @param {WheelEvent} e
   */
  _onWheel(e: WheelEvent) {
    if (!this.container.worldVisible) return;

    // Get coordinates of point and test if we touch this container
    const globalPoint = new PIXI.Point();
    this._chipContext.app.renderer.plugins.interaction.mapPositionToPoint(
      globalPoint,
      e.clientX,
      e.clientY,
    );
    if (
      !this._chipContext.app.renderer.events.rootBoundary.hitTest(
        globalPoint,
        this.container,
      )
    )
      return;

    // Finally, scroll!
    const scrollAmount = -e.deltaY;
    //if (this.isScrollbarHorizontal) {
    //  this.scrollBy(new PIXI.Point(scrollAmount, 0));
    //} else if (this.isScrollbarVertical) {
    //  this.scrollBy(new PIXI.Point(0, scrollAmount));
    //}

    e.preventDefault();
  }

  scrollBy(amount: PIXI.IPointData, reason = "user") {
    this.scrollTo(
      booyahPixi.add(this.content.position as PIXI.IPointData, amount),
      reason,
    );
  }

  scrollTo(position: PIXI.Point, reason = "user") {
    position.x = geom.clamp(
      position.x,
      this.options.boxWidth - this.content.width,
      0,
    );
    position.y = geom.clamp(
      position.y,
      this.options.boxHeight - this.content.height,
      0,
    );
    this.content.position.copyFrom(position);

    this._updateScrollbars();

    this.emit("moved", { reason });
  }

  get currentScroll() {
    return this.content.position;
  }
}
