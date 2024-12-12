import * as chip from "booyah/dist/chip";
import * as geom from "booyah/dist/geom";
import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as booyahPixi from "./booyahPixi";

type ResolvableFunction<Type, Context> = (context: Context) => Type;
type Resolvable<Type, Context> = Type | ResolvableFunction<Type, Context>;

function isResolvableFunction<Type, Context>(
  resolvable: Resolvable<Type, Context>,
): resolvable is ResolvableFunction<Type, Context> {
  return typeof resolvable === "function";
}

type ResolvableCollection<DataType, Context> = {
  [Property in keyof DataType]: Resolvable<DataType[Property], Context>;
};

class MyResolver<DataType, Context> {
  private _resolvableCollection: ResolvableCollection<DataType, Context>;
  private _resolvedCollection: DataType;

  constructor() {
    //@ts-ignore
    this._resolvedCollection = {};
  }

  public setResovableCollection(
    newCollection: ResolvableCollection<DataType, Context>,
  ) {
    this._resolvableCollection = newCollection;
  }

  public resolve(resolvingContext: Context) {
    for (const key in this._resolvableCollection) {
      this._resolvedCollection[key] = this._resolve(
        this._resolvableCollection[key],
        resolvingContext,
      ) as DataType[typeof key];
    }
  }

  public getResolvedCollection(): DataType {
    return this._resolvedCollection;
  }

  private _resolve<Type>(
    resolvable: Resolvable<Type, Context>,
    resolvingContext: Context,
  ): Type {
    if (isResolvableFunction(resolvable)) {
      return resolvable(resolvingContext);
    }

    return resolvable;
  }
}

type ResolvingContext = { renderSize: PIXI.IPointData };

function isTexture(object: any): object is PIXI.Texture {
  return object.baseTexture;
}

export type OverflowSettings = "auto" | "hidden" | "scroll";
export type Direction = "vertical" | "horizontal";

export class ScrollboxOptions {
  content: any = null;
  boxWidth: number = 100;
  boxHeight: number = 100;
  overflow: OverflowSettings = "auto";
  direction: Direction = "horizontal";
  scrollbarOffset: number = 10;
  scrollbarWidth: number = 20;
  scrollbarBackground: PIXI.Texture | PIXI.ColorSource = 0xaaaaaa;
  scrollbarHandle: PIXI.Texture | PIXI.ColorSource = 0x555555;
  dragScroll: boolean = true;
  dragThreshold: number = 5;
  stopPropagation: boolean = true;
  wheelScroll: boolean = true;
}

/**
 * Based on David Fig's pixi-scrollbox https://github.com/davidfig/pixi-scrollbox/, but adapted to Booyah
 *
 * Events:
 *  moved ({ reason })
 *  refreshed
 **/
export class Scrollbox extends chip.Composite {
  public options: ScrollboxOptions;
  public readonly resolvableOptions: ResolvableCollection<
    ScrollboxOptions,
    ResolvingContext
  >;
  private _myResolver: MyResolver<ScrollboxOptions, ResolvingContext>;

  private _pointerDown: any;
  private _container: PIXI.Container;
  private _content: PIXI.Container;
  private _scrollbarAnchor: PIXI.Container;
  private _scrollbarBackground: PIXI.NineSlicePlane;
  private _scrollbarHandle: PIXI.NineSlicePlane;

  /**
   * Can be provided with an existing container
   */
  constructor(
    partialOptions: Partial<
      ResolvableCollection<ScrollboxOptions, ResolvingContext>
    >,
  ) {
    super();
    this.resolvableOptions = chip.fillInOptions(
      partialOptions,
      new ScrollboxOptions(),
    );
    this._myResolver = new MyResolver<ScrollboxOptions, ResolvingContext>();
  }

  protected _onActivate() {
    this._myResolver.setResovableCollection(this.resolvableOptions);
    this._myResolver.resolve({
      renderSize: this.chipContext.pixiAppChip.renderSize,
    });
    this.options = this._myResolver.getResolvedCollection();

    // Last pointerdown event
    this._pointerDown = null;

    this._container = new PIXI.Container();
    this._activateChildChip(new booyahPixi.DisplayObjectChip(this._container));
    this._container.eventMode = "static";
    this._subscribe(this._container, "globalpointermove", this._onMove as any);
    this._subscribe(this._container, "pointerup", this._onUp as any);
    this._subscribe(this._container, "pointercancel", this._onUp as any);
    this._subscribe(this._container, "pointerupoutside", this._onUp as any);

    this._content = new PIXI.Container();
    if (this.options.content) this._content.addChild(this.options.content);

    if (this.options.dragScroll) {
      const dragBackground = new PIXI.Sprite(PIXI.Texture.WHITE);
      dragBackground.eventMode = "static";
      dragBackground.alpha = 0;

      this._subscribe(dragBackground, "pointerdown", this._dragDown as any);
      this._subscribe(this._content, "pointerdown", this._dragDown as any);
      this._content.eventMode = "static";

      this._activateChildChip({
        chip: new booyahPixi.DisplayObjectChip(dragBackground, {
          properties: {
            width: this.resolvableOptions.boxWidth,
            height: this.resolvableOptions.boxHeight,
          },
        }),
        context: { container: this._container },
      });
    }

    this._activateChildChip({
      chip: new booyahPixi.DisplayObjectChip(this._content),
      context: { container: this._container },
    });

    const mask = new PIXI.Sprite(PIXI.Texture.WHITE);
    this._content.mask = mask;
    this._activateChildChip({
      chip: new booyahPixi.DisplayObjectChip(mask, {
        properties: {
          width: this.resolvableOptions.boxWidth,
          height: this.resolvableOptions.boxHeight,
        },
      }),
      context: { container: this.container },
    });

    if (this.options.wheelScroll) {
      this._subscribe(this._container, "wheel", (event) =>
        this._onWheel(event),
      );
    }

    this._scrollbarAnchor = new PIXI.Container();

    if (isTexture(this.options.scrollbarBackground)) {
      this._scrollbarBackground = new PIXI.NineSlicePlane(
        this.options.scrollbarBackground,
      );
    } else {
      this._scrollbarBackground = new PIXI.NineSlicePlane(PIXI.Texture.WHITE);
      this._scrollbarBackground.tint = this.options.scrollbarBackground;
    }

    if (isTexture(this.options.scrollbarHandle)) {
      this._scrollbarHandle = new PIXI.NineSlicePlane(
        this.options.scrollbarHandle,
      );
    } else {
      this._scrollbarHandle = new PIXI.NineSlicePlane(PIXI.Texture.WHITE);
      this._scrollbarHandle.tint = this.options.scrollbarHandle;
    }

    let anchorProperties;
    let backroundProperties;
    let handleProperties;

    switch (this.options.direction) {
      case "horizontal": {
        backroundProperties = {
          height: this.resolvableOptions.scrollbarWidth,
          y: this.resolvableOptions.scrollbarOffset,
        };
        handleProperties = {
          height: this.resolvableOptions.scrollbarWidth,
          y: this.resolvableOptions.scrollbarOffset,
        };
        anchorProperties = { y: this.resolvableOptions.boxHeight };
        break;
      }
      case "vertical": {
        backroundProperties = {
          x: this.resolvableOptions.scrollbarOffset,
          width: this.resolvableOptions.scrollbarWidth,
        };
        handleProperties = {
          x: this.resolvableOptions.scrollbarOffset,
          width: this.resolvableOptions.scrollbarWidth,
        };
        anchorProperties = { x: this.resolvableOptions.boxWidth };
        break;
      }
    }

    this._activateChildChip({
      chip: new booyahPixi.DisplayObjectChip(this._scrollbarAnchor, {
        properties: anchorProperties,
      }),
      context: { container: this._container },
    });

    this._activateChildChip({
      chip: new booyahPixi.DisplayObjectChip(this._scrollbarBackground, {
        properties: backroundProperties,
      }),
      context: { container: this._scrollbarAnchor },
    });

    this._activateChildChip({
      chip: new booyahPixi.DisplayObjectChip(this._scrollbarHandle, {
        properties: handleProperties,
      }),
      context: { container: this._scrollbarAnchor },
    });

    this._scrollbarHandle.eventMode = "static";
    this._subscribe(
      this._scrollbarHandle,
      "pointerdown",
      this._scrollbarDown as any,
    );

    this.refresh();

    this._subscribe(this.chipContext.pixiAppChip, "resize", () => {
      this._myResolver.setResovableCollection(this.resolvableOptions);
      this._myResolver.resolve({
        renderSize: this.chipContext.pixiAppChip.renderSize,
      });
      this.options = this._myResolver.getResolvedCollection();
      this.refresh();
    });
  }

  /** Call when container contents have changed  */
  public refresh() {
    this.scrollTo(this.content.position);
    this._updateScrollbars();
    this.emit("refreshed");
  }

  private _updateScrollbars() {
    let boxSize: number;
    let contentSize: number;

    switch (this.options.direction) {
      case "horizontal": {
        boxSize = this.options.boxWidth;
        contentSize = this._content.width;
        break;
      }
      case "vertical": {
        boxSize = this.options.boxHeight;
        contentSize = this._content.height;
        break;
      }
    }

    if (
      this.options.overflow === "hidden" ||
      (this.options.overflow === "auto" && boxSize > contentSize)
    ) {
      this._scrollbarAnchor.visible = false;
      return;
    }

    this._scrollbarAnchor.visible = true;
    const ratio = geom.clamp(boxSize / contentSize, 0, 1);

    switch (this.options.direction) {
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

    const local = this._container.toLocal(e.global);
    this._pointerDown = {
      type: "scrollbar",
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
  private _scrollbarMove(e: PIXI.FederatedPointerEvent) {
    const local = this._container.toLocal(e.global);

    if (this.options.direction === "horizontal") {
      const deltaPosition = local.x - this._pointerDown.last.x;
      const ratio = this.options.boxWidth / this._content.width;
      const fraction = deltaPosition / ratio;
      this.scrollBy({ x: -fraction, y: 0 });
    } else {
      const deltaPosition = local.y - this._pointerDown.last.y;
      const ratio = this.options.boxHeight / this._content.height;
      const fraction = deltaPosition / ratio;
      this.scrollBy({ x: 0, y: -fraction });
    }

    this._pointerDown.last = local;

    if (this.options.stopPropagation) {
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

    const local = this._container.toLocal(e.global);
    this._pointerDown = { type: "drag", last: local };

    if (this.options.stopPropagation) {
      e.stopPropagation();
    }
  }

  /**
   * handle pointer move on content
   * @param {PIXI.FederatedPointerEvent} e
   * @private
   */

  private _dragMove(e: PIXI.FederatedPointerEvent) {
    const local = this._container.toLocal(e.global) as PIXI.Point;
    const deltaPosition: PIXI.IPointData = { x: 0, y: 0 };

    if (this.options.direction === "horizontal") {
      deltaPosition.x = local.x - this._pointerDown.last.x;
    } else {
      deltaPosition.y = local.y - this._pointerDown.last.y;
    }

    if (booyahPixi.magnitude(deltaPosition) <= this.options.dragThreshold)
      return;

    this.scrollBy(deltaPosition);
    this._pointerDown.last = local;
    this._content.interactiveChildren = false;

    if (this.options.stopPropagation) {
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
    if (this.options.direction === "horizontal") {
      this.scrollBy({ x: scrollAmount, y: 0 });
    } else {
      this.scrollBy({ x: 0, y: scrollAmount });
    }

    e.preventDefault();
  }

  public scrollBy(amount: PIXI.IPointData, reason = "user") {
    this.scrollTo(booyahPixi.add(this._content.position, amount), reason);
  }

  public scrollTo(position: PIXI.IPointData, reason = "user") {
    position.x = geom.clamp(
      position.x,
      this.options.boxWidth - this._content.width,
      0,
    );
    position.y = geom.clamp(
      position.y,
      this.options.boxHeight - this._content.height,
      0,
    );
    this._content.position.copyFrom(position);

    this._updateScrollbars();

    this.emit("moved", { reason });
  }

  public get currentScroll() {
    return this.options.direction === "horizontal"
      ? this._content.x
      : this._content.y;
  }

  public get container() {
    return this._container;
  }

  public get content() {
    return this._content;
  }
}
