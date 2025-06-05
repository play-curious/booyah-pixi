import * as booyah from "booyah";
import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as layout from "./layout";

export class PixiAppChipOptions {
  /* Provide either a parent element or a canvas */
  parentElement?: HTMLElement;
  canvas?: PIXI.ICanvas;
  appOptions?: Partial<PIXI.IApplicationOptions & PIXI.IRendererOptions>;

  /** If true reset the renderer state after each render */
  shouldResetRenderer?: boolean;

  /** If true, set up a root layout */
  addRootLayout = false;
}

export class PixiAppChip extends booyah.Composite {
  private readonly _options: PixiAppChipOptions;

  private _pixiApplication?: PIXI.Application;
  private _rootLayoutChip: layout.RootLayoutChip;
  private _resizeNeeded?: boolean;

  constructor(options?: Partial<PixiAppChipOptions>) {
    super();

    this._options = booyah.fillInOptions(options, new PixiAppChipOptions());
  }

  protected _onActivate(): void {
    this._resizeNeeded = false;

    const appOptions = this._options?.appOptions || {};
    appOptions.autoStart = false;
    if (this._options.canvas) {
      appOptions.view = this._options.canvas;
    }

    this._pixiApplication = new PIXI.Application(appOptions);

    // Optionally setup debugging support for PIXI browser extensions
    if (process.env.NODE_ENV === "development") {
      // @ts-ignore
      globalThis.__PIXI_APP__ = this._pixiApplication;
    }

    if (!this._options.canvas) {
      const parent = this._options?.parentElement || document.body;
      parent.appendChild(this._pixiApplication.view as unknown as Node);
    }

    if (this._options.addRootLayout) {
      this._activateChildChip(new layout.RootLayoutChip(), {
        context: {
          pixiAppChip: this,
          pixiApplication: this._pixiApplication,
          container: this._pixiApplication.stage,
        },
        attribute: "_rootLayoutChip",
      });
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
    if (this._resizeNeeded) {
      this._handleResize();
      this._resizeNeeded = false;
    }

    if (this._options.shouldResetRenderer) {
      this._pixiApplication.renderer.reset();
    }
    this._pixiApplication!.render();
  }

  protected _onTerminate(): void {
    this._pixiApplication!.destroy(true);
  }

  get contextModification(): booyah.ChipContextResolvable {
    if (this._rootLayoutChip) {
      return {
        pixiAppChip: this,
        pixiApplication: this._pixiApplication,
        ...this._rootLayoutChip.contextModification,
      };
    } else {
      return {
        pixiAppChip: this,
        pixiApplication: this._pixiApplication,
        container: this._pixiApplication!.stage,
      };
    }
  }

  private _onResize() {
    this._resizeNeeded = true;
  }

  private _handleResize() {
    console.log(this._pixiApplication.renderer.width);
    this._pixiApplication!.renderer.resize(
      this._pixiApplication.view.width,
      this._pixiApplication.view.height,
    );
    this.emit("didResize");
  }

  get renderSize() {
    const renderer = this._pixiApplication!.renderer;
    return new PIXI.Point(renderer.width, renderer.height);
  }

  get pixiApplication() {
    return this._pixiApplication;
  }
}
