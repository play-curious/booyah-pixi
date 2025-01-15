import * as PIXI from "pixi.js";
import * as booyah from "booyah";
import * as _ from "underscore";

export interface LoaderOptions {
  initOptions?: PIXI.AssetInitOptions;
  bundlesToLoad?: string[];
  bundlesToBackgroundLoad?: string[];
}

export class Loader extends booyah.Composite {
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
      PIXI.Assets.loadBundle(this._options.bundlesToBackgroundLoad);
    }

    this._terminateSelf();
  }

  private _onProgress(progress: number) {
    this.emit("progress", progress);
  }
}
