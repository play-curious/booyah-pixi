import * as PIXI from "pixi.js";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import * as booyah from "booyah";

import * as layout from "../src/layout";
import * as pixiApp from "../src/pixiApp";

import("@electron/remote").then((m) => m.getCurrentWindow().show());

function makeChipContext(): booyah.ChipContext {
  return { rootValue: 1 };
}

function makeTickInfo(): booyah.TickInfo {
  return {
    timeSinceLastTick: 1000 / 60,
  };
}

function makeSignal(): booyah.Signal {
  return booyah.makeSignal();
}

class MockPixiAppChipOptions {
  addContainerChip = true;
  renderSize: PIXI.IPointData = new PIXI.Point(100, 100);
  children: Array<booyah.ActivateChildChipOptions | booyah.ChipResolvable> = [];
}

class MockPixiAppChip extends booyah.Parallel {
  private _options: MockPixiAppChipOptions;
  private _stackingContainerChip?: layout.StackingContainerChip;
  private _resizeNeeded?: boolean;
  private _stage: PIXI.Container;
  // private _pixiApplication : PIXI.Application;

  constructor(options?: Partial<MockPixiAppChipOptions>) {
    const filledOptions = booyah.fillInOptions(
      options,
      new MockPixiAppChipOptions(),
    );
    super(filledOptions.children);

    this._options = filledOptions;
  }

  protected _onActivate(): void {
    // this._pixiApplication = new PIXI.Application();

    this._resizeNeeded = false;

    this._stage = new PIXI.Container();

    if (this._options.addContainerChip) {
      this._activateChildChip(new layout.StackingContainerChip(), {
        context: {
          pixiAppChip: this,
          // pixiApplication: this._pixiApplication,
          container: this._stage,
        },
        attribute: "_stackingContainerChip",
      });

      this._subscribe(this._stackingContainerChip!, "updated", this._onResize);
    }

    super._onActivate();
  }

  protected _onTick(): void {
    if (this._resizeNeeded) {
      this.handleResize();
      this._resizeNeeded = false;
    }

    // this._pixiApplication!.render();
  }

  private _onResize() {
    this._resizeNeeded = true;
  }

  handleResize() {
    this.emit("willResize");

    if (this._stackingContainerChip) {
      this._stackingContainerChip.prepareResize({
        renderSize: this._options.renderSize,
      });

      const screenBounds = new layout.Bounds(
        0,
        0,
        this.renderSize.x,
        this.renderSize.y,
      );
      this._stackingContainerChip.resize({
        absoluteBounds: screenBounds,
        localBounds: screenBounds,
      });
    }

    this.emit("didResize");
  }

  get contextModification(): booyah.ChipContextResolvable {
    if (this._stackingContainerChip) {
      return {
        pixiAppChip: this,
        // pixiApplication: this._pixiApplication,
        ...this._stackingContainerChip.contextModification,
        container: this._stage,
      };
    } else {
      return {
        pixiAppChip: this,
        // pixiApplication: this._pixiApplication,
        container: this._stage,
      };
    }
  }

  get renderSize() {
    return this._options.renderSize;
  }

  set renderSize(value: PIXI.IPointData) {
    this._options.renderSize = value;

    this._onResize();
  }
}

describe("DisplayLeafChip", () => {
  test("resizes sprite", () => {
    const spriteChip = new layout.SpriteChip({
      texture: PIXI.Texture.WHITE,
    });

    // const pixiAppChip = new pixiApp.PixiAppChip({ addContainerChip: true });
    const rootChip = new MockPixiAppChip({ children: [spriteChip] });

    rootChip.activate(makeTickInfo(), makeChipContext(), makeSignal());
    rootChip.tick(makeTickInfo());

    debugger;

    rootChip.handleResize();

    console.log(
      spriteChip.displayObject.width,
      spriteChip.displayObject.height,
    );

    rootChip.terminate(makeTickInfo());
  });
});
