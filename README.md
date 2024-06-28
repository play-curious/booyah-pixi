# Booyah-Pixi

Helper library to use [PixiJS](httshttps://pixijs.com/) with [Booyah](https://github.com/play-curious/booyah)

## Installation

`yarn add booyah-pixi` or `npm i booyah-pixi`

## Getting Started

### Creating the PIXI Application

Assuming you have a `canvas` in your HTML file, like:

```html
<!-- Setting the tabindex helps with getting keyboard input -->
<canvas tabindex="1"></canvas>
```

Then this JavaScript code will create a Pixi application and run it:

```ts
import * as booyahPixi from "booyah-pixi/dist/booyahPixi";

const pixiApp = new booyahPixi.PixiAppChip({
  canvas: document.getElementsByTagName("canvas")[0],
  appOptions: {
    resizeTo: window,
  },
});

const rootChip = new chip.Parallel([
  {
    chip: pixiApp,
    extendChildContext: true,
  },
  // Your game chip goes here,
]);

const runner = new running.Runner(rootChip);
runner.start();
```

### Adding to the stage

The `PixiApp` will put itself in the context, as well as a reference to the stage as the container. Children chips can add new `DisplayObject`s to the container.

```ts
class BoxChip extends chip.Composite {
  private _sprite: PIXI.Sprite;

  protected _onActivate(): void {
    // Create a new sprite and add it to the parent container
    this._sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    this._sprite.position.set(200, 100);
    this.chipContext.container.addChild(this._sprite);
  }

  protected _onTerminate(): void {
    // Don't forget to remove the sprite when this chip terminates
    this.chipContext.container.removeChild(this._sprite);
  }
}
```

### Using `DisplayObjectChip`

An more efficient way to add `DisplayObject`s to the parent container is to use `DisplayObjectChip`. This chip handles adding and removing the `DisplayObject`, so the code can be shortened substantially.

When creating the DisplayObjectChip, you can give it a map of properties to set on the DisplayObject, which can be quicker than setting each property manually.

```ts
class BoxChip extends chip.Composite {
  protected _onActivate(): void {
    // Create a new sprite and add it to the parent container
    // It will be removed automatically on termination
    const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    const spriteChip = new booyahPixi.DisplayObjectChip(box, {
      properties: {
        position: { x: 100, y: 200 },
        scale: 2,
      },
    });
    this._activateChildChip(spriteChip);
  }
}
```

If you provide a function as the value for the `DisplayObjectChip` properties, it will be called on each resize event. This is a nice way to handle responsive designs:

```ts
class ResponsiveBoxChip extends chip.Composite {
  protected _onActivate(): void {
    const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    const spriteChip = new booyahPixi.DisplayObjectChip(box, {
      properties: {
        anchor: new PIXI.Point(1, 0),
        // The sprite will stick to the right side of the screen, even when the screen is resized
        position: ({ renderSize }) => new PIXI.Point(renderSize.x, 0),
      },
      onResize: () =>
        console.log("Screen just resized. Maybe I should do something?"),
    });
    this._activateChildChip(spriteChip);
  }
}
```

### Showing animations

The `AnimatedSpriteChip` will display an animation, and optionally terminate itself when the animation completes.

```ts
const animationChip = new booyahPixi.AnimatedSpriteChip(
  // Provide the spritesheet that has the animation
  // If the animation continues to another sheet, it will look for it
  PIXI.Assets.get("worker"),
  {
    // Provide the name of the animation to load
    animationName: "worker-idle",
    // Easier to use than `PIXI.AnimatedSprite.animationSpeed`
    fps: 30,
    // Can loop, but also quit when the animation completes
    behaviorOnComplete: "loop",

    // Like the `DisplayOBjectChip`, you can set properties directly, and callback functions will be re-evaluated when the screen resizes
    properties: {
      anchor: 0.5,
      position: ({ renderSize }) =>
        new PIXI.Point(renderSize.x / 2, renderSize.y / 2),
    },
  }
);
this._activateChildChip(animationChip);
```

### Creating a new parent container

If you'd like to create a new container that child display objects are placed in, there are two ways to go about it.

The first is when calling `activateChildChip()`:

```ts
class MyChip extends chip.Composite {
  protected _onActivate(): void {
    // Create the new container, offset from the parent.
    // Don't forget to add it to the parent
    const container = new PIXI.Container();
    this._activateChildChip(
      new booyahPixi.DisplayObjectChip(container, {
        properties: {
          position: new PIXI.Point(100, 100),
        },
      })
    );

    // We'd like to put the sprite inside new container
    const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    this._activateChildChip(sprite, {
      context: {
        container,
      },
    });
  }
}
```

The second is to overload `contextModification`. This is useful if you are adding multiple objects to the container:

```ts
class MyChip extends chip.Composite {
  private _container: PIXI.Container;

  protected _onActivate(): void {
    // Create the new container, offset from the parent.
    // Don't forget to add it to the parent
    this._container = new PIXI.Container();
    this._activateChildChip(
      new booyahPixi.DisplayObjectChip(this._container, {
        properties: {
          position: new PIXI.Point(100, 100),
        },
      })
    );

    // The context modification will automatically add this to the new container
    const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    this._activateChildChip(sprite);
  }

  get contextModification() {
    return {
      container: this._container;
    }
  }
}
```

### Loading assets

If you are using PIXI.Assets to load your assets, then the `Loader` chip can be helpful for making a preloader screen.

```ts
// Loading audio assets with a glob using Parcel
// @ts-ignore
import * as audio from "../audio/*.mp3";

// This manifest defines what PIXI.Assets will load
const assetManifest = {
  bundles: [
    {
      name: "images",
      assets: {
        // Example of a spritesheet
        spritesheet: new URL("../images/spritesheet.json", import.meta.url)
          .pathname,
      },
    },
    {
      name: "audio",
      assets: audio,
    },
    {
      name: "fonts",
      assets: {
        myFont: {
          src: new URL("../fonts/my-font.woff2", import.meta.url).pathname,
          data: { family: "My Font" },
        },
      },
    },
  ],
};

class PreloaderScreen extends chip.Composite {
  protected _onActivate(): void {
    {
      // Create a loading text and show it
      const text = new PIXI.Text("Loading...", {
        fill: "white",
      });

      this._activateChildChip(
        new booyahPixi.DisplayObjectChip(text, {
          properties: {
            anchor: 0.5,
            position: ({ renderSize }) =>
              new PIXI.Point(renderSize.x / 2, renderSize.y / 2),
          },
        })
      );
    }

    // Start loading the assets
    const preloader = new booyahPixi.Loader({
      initOptions: { manifest: assetManifest },
      // These bundles will be loaded before the Loader complets
      bundlesToLoad: ["images", "audio", "fonts"],
    });

    // Once the loader completes, request termination
    const sequence = new chip.Sequence([
      preloader,
      new chip.Lambda(() => this._terminateSelf()),
    ]);
    this._activateChildChip(sequence);
  }
}
```

## Use with Parcel

If you are using [Parcel](https://parceljs.org/) to package your game or app, these plugins might come in handy:

- [parcel-transformer-spritesheet](https://github.com/play-curious/parcel-transformer-spritesheet) - Handles spritesheets exported by tools like TexturePacker
- [parcel-transformer-fnt](https://github.com/play-curious/parcel-transformer-fnt) - Handles bitmap font files

## Links & References

- PixiJS Documentation : https://pixijs.download/v7.x/docs/index.html
