import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as chip from "booyah/src/chip";

export class DisplayObjectChip<
  DisplayObjectType extends PIXI.DisplayObject
> extends chip.ChipBase {
  constructor(public readonly displayObject: DisplayObjectType) {
    super();
  }

  _onActivate() {
    this._chipContext.container.addChild(this.displayObject);
  }

  _onTerminate() {
    this._chipContext.container.removeChild(this.displayObject);
  }
}

/** 
  Manages an animated sprite in PIXI, pausing the sprite during pauses.

  When the animation completes (if the animation is not set to loop, then this will request a signal)

 Emits:
 - beforeTearDown
*/
export class AnimatedSpriteChipOptions {
  loop = false;

  animationName?: string;
  animationSpeed?: number;
  position?: PIXI.IPoint;
  anchor?: PIXI.IPoint;
  scale?: PIXI.IPoint;
  rotation?: number;
  startingFrame?: number;
}

export class AnimatedSpriteChip extends chip.ChipBase {
  private _options: AnimatedSpriteChipOptions;

  private _sprite: PIXI.AnimatedSprite;
  private _wasPlaying: boolean;

  constructor(
    private readonly _spritesheet: PIXI.Spritesheet,
    options?: Partial<AnimatedSpriteChipOptions>
  ) {
    super();

    this._options = chip.fillInOptions(
      options,
      new AnimatedSpriteChipOptions()
    );
  }

  _onActivate() {
    this._wasPlaying = false;

    let textures: PIXI.Texture[];
    if (this._options.animationName) {
      // Use the specified animation
      if (!_.has(this._spritesheet.animations, this._options.animationName)) {
        throw new Error(
          `Can't find animation "${this._options.animationName}" in spritesheet`
        );
      }

      textures = this._spritesheet.animations[this._options.animationName];
    } else {
      // Take all the textures in the sheet
      textures = Object.values(this._spritesheet.textures);
    }

    this._sprite = new PIXI.AnimatedSprite(textures, false);
    this._chipContext.container.addChild(this._sprite);

    if (!this._options.loop) {
      // PIXI.AnimatedSprite loops by default
      this._sprite.loop = false;
      this._sprite.onComplete = this._onAnimationComplete.bind(this);
    }

    for (const prop of [
      "animationSpeed",
      "position",
      "anchor",
      "rotation",
      "scale",
    ]) {
      // @ts-ignore
      if (_.has(this._options, prop)) this._sprite[prop] = this._options[prop];
    }

    if (typeof this._options.startingFrame !== "undefined") {
      this._sprite.gotoAndPlay(this._options.startingFrame);
    } else {
      this._sprite.play();
    }
  }

  _onTick() {
    this._sprite.update(this._lastTickInfo.timeSinceLastTick);
  }

  protected _onPause(): void {
    this._wasPlaying = this._sprite.playing;
    this._sprite.stop();
  }

  protected _onResume(): void {
    if (this._wasPlaying) this._sprite.play();
  }

  _onTerminate() {
    this._chipContext.container.removeChild(this._sprite);
    delete this._sprite;
  }

  private _onAnimationComplete() {
    this._outputSignal = chip.makeSignal();
  }
}
