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
  behaviorOnComplete: "loop" | "remove" | "keepLastFrame" = "remove";
  behaviorOnStart: "play" | "stop" = "play";
  animationName?: string;
  animationSpeed?: number;
  position?: PIXI.IPointData | number;
  anchor?: PIXI.IPointData | number;
  scale?: PIXI.IPointData | number;
  rotation?: number;
  alpha?: number;
  startingFrame?: number;
}

export class AnimatedSpriteChip extends chip.ChipBase {
  private _options: AnimatedSpriteChipOptions;

  private _pixiSprite: PIXI.AnimatedSprite;
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

    this._pixiSprite = new PIXI.AnimatedSprite(textures, false);
    this._chipContext.container.addChild(this._pixiSprite);

    if (this._options.behaviorOnComplete == "loop") {
      this._pixiSprite.loop = true;
    } else if (this._options.behaviorOnComplete == "keepLastFrame") {
      // PIXI.AnimatedSprite loops by default
      this._pixiSprite.loop = false;
    } else if (this._options.behaviorOnComplete == "remove") {
      // PIXI.AnimatedSprite loops by default
      this._pixiSprite.loop = false;
      this._pixiSprite.onComplete = this._onAnimationComplete.bind(this);
    }

    // Set numerical properties
    for (const prop of ["animationSpeed", "rotation", "alpha"]) {
      // @ts-ignore
      if (_.has(this._options, prop))
        // @ts-ignore
        this._pixiSprite[prop] = this._options[prop];
    }

    // Set Point properties
    for (const prop of ["position", "anchor", "scale"]) {
      // @ts-ignore
      if (_.has(this._options, prop)) {
        // @ts-ignore
        const value = this._options[prop];
        if (typeof value === "number") {
          // @ts-ignore
          this._pixiSprite[prop].set(value);
        } else {
          // @ts-ignore
          this._pixiSprite[prop] = value;
        }
      }
    }

    this._pixiSprite.gotoAndStop(this._options.startingFrame ?? 0);

    if (this._options.behaviorOnStart == "play") {
      this._pixiSprite.play();
    }
  }

  _onTick() {
    this._pixiSprite.update(this._lastTickInfo.timeSinceLastTick);
  }

  protected _onPause(): void {
    this._wasPlaying = this._pixiSprite.playing;
    this._pixiSprite.stop();
  }

  protected _onResume(): void {
    if (this._wasPlaying) this._pixiSprite.play();
  }

  _onTerminate() {
    this._chipContext.container.removeChild(this._pixiSprite);
    delete this._pixiSprite;
  }

  private _onAnimationComplete() {
    this._outputSignal = chip.makeSignal();
  }
}
