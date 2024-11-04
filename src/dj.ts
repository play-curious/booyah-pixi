import * as chip from "booyah/dist/chip";
import * as PIXI from "pixi.js";
import * as sound from "@pixi/sound";

class DJChannelOptions {
  volume: number;
  singleInstance: boolean;
  loop: boolean;
}

type DJChannels = {
  musique: DJChannelOptions;
  soundEffect: DJChannelOptions;
};

class PlayingOptions {
  volume: number = 1;
  loop: boolean = false;
}

class DJChannel {
  private _playingInstances: Array<sound.IMediaInstance>;
  private _channelFilter: sound.Filter;
  private _volumeNode: GainNode;

  constructor(
    private readonly _getSoundRessource: (
      name: string,
    ) => sound.Sound | undefined,
    private readonly options: DJChannelOptions,
  ) {
    this._volumeNode = sound.sound.context.audioContext.createGain();
    this._volumeNode.gain.value = this.options.volume;
    this._channelFilter = new sound.filters.Filter(this._volumeNode);
    this._playingInstances = [];
  }

  public play(name: string, options?: Partial<PlayingOptions>) {
    const soundRessource = this._getSoundRessource(name);

    if (this.options.singleInstance) {
      if (
        this._playingInstances.length === 1 &&
        soundRessource.instances.includes(this._playingInstances[0])
      ) {
        return;
      }

      this.stop();
    }

    const completeOptions = chip.fillInOptions(options, new PlayingOptions());

    //because for some reason play don't last between context
    soundRessource.filters = [this._channelFilter];

    const instance = sound.sound.play(name, {
      loop: this.options.loop,
      volume: completeOptions.volume,
      complete: () => {
        const index = this._playingInstances.findIndex((playedInstance) => {
          return playedInstance.id === instance.id;
        });
        this._playingInstances.splice(index);
      },
    }) as sound.IMediaInstance;

    this._playingInstances.push(instance);

    return instance.id;
  }

  public set volume(value: number) {
    this._volumeNode.gain.value = value;
  }

  public get volume() {
    return this._volumeNode.gain.value;
  }

  public stop() {
    this._playingInstances.forEach(this._stopInstance);
  }

  public pause() {
    this._playingInstances.forEach(this._pauseInstance);
  }

  public resume() {
    this._playingInstances.forEach(this._resumeInstance);
  }

  public stopInstance(id: number) {
    const instance = this._playingInstances.find((instance) => {
      return instance.id === id;
    });

    if (instance) {
      this._stopInstance(instance);
    }
  }

  private _stopInstance(instance: sound.IMediaInstance) {
    instance.stop();
  }

  public pauseInstance(id: number) {
    const instance = this._playingInstances.find((instance) => {
      return instance.id === id;
    });

    if (instance) {
      this._pauseInstance(instance);
    }
  }

  private _pauseInstance(instance: sound.IMediaInstance) {
    instance.set("paused", true);
  }

  public resumeInstance(id: number) {
    const instance = this._playingInstances.find((instance) => {
      return instance.id === id;
    });

    if (instance) {
      this._resumeInstance(instance);
    }
  }

  private _resumeInstance(instance: sound.IMediaInstance) {
    instance.set("paused", false);
  }
}

export class DJOptions {
  musicChannelVolume = 0.25;
  fxChannelVolume = 1;
  missingAssetBehavior: "exception" | "warning" | "ignore" = "exception";
}

export class PlayingSoundOptions<AvailableChannel> {
  channel: AvailableChannel;
}

export class PlayingMusicOptions {
  volumeScale = 1;
  loop = true;
}

export class PlayingFxOptions {
  volumeScale = 1;
  loop = false;
  duckMusic = false;
}

class PlayingMusic extends PlayingMusicOptions {
  name: string;
}

/** 
  A music player, that only plays one track at a time.
  By default the volume is lowered to not interfere with sound effects.
*/
export class Dj extends chip.ChipBase {
  private _options: DJOptions;
  private _musicChannelVolume: number;
  private _fxChannelVolume: number;

  private _playingMusic?: PlayingMusic;
  private _playingFx: Record<string, PlayingFxOptions>;
  private _lastRequestedMusicName?: string;

  private _channels: Record<string, DJChannel>;

  constructor(options?: Partial<DJOptions>) {
    super();
    this._options = chip.fillInOptions(options, new DJOptions());
  }

  protected _onActivate(): void {
    this._musicChannelVolume = this._options.musicChannelVolume;
    this._fxChannelVolume = this._options.fxChannelVolume;
    this._playingFx = {};
    this._channels = {};

    this._channels["music"] = new DJChannel(this._getSoundResource, {
      volume: 0.25,
      singleInstance: true,
      loop: true,
    });

    this._channels["soundEffect"] = new DJChannel(this._getSoundResource, {
      volume: 1,
      singleInstance: false,
      loop: false,
    });

    this._channels["forest"] = new DJChannel(this._getSoundResource, {
      volume: 0.01,
      singleInstance: true,
      loop: true,
    });
  }

  _onTerminate() {
    for (const channel in this._channels) {
      this._channels[channel].stop();
    }
  }

  protected _onPause(): void {
    for (const channel in this._channels) {
      this._channels[channel].pause();
    }
  }

  protected _onResume(): void {
    for (const channel in this._channels) {
      this._channels[channel].resume();
    }
  }

  async playSound(
    name: string,
    channel: string,
    options?: Partial<PlayingOptions>,
  ) {
    this._channels[channel].play(name, options);
  }

  public changeVolume(channel: string, value: number) {
    this._channels[channel].volume = value;
  }

  public getVolume(channel: string) {
    return this._channels[channel].volume;
  }

  get musicChannelVolume(): number {
    return this._channels["music"].volume;
  }

  set musicChannelVolume(value: number) {
    this._channels["music"].volume = value;
    this.emit("change:musicChannelVolume", value);
  }

  async playMusic(name: string, options?: Partial<PlayingMusicOptions>) {
    //console.log("playMusic() called", name, options, this._playingMusic);
    this._channels["music"].play(name, options);
  }

  stopMusic() {
    //console.log("stopMusic() called", this._playingMusic);
    this._channels["music"].stop();
  }

  pauseMusic(): void {
    this._channels["music"].pause();
  }

  resumeMusic(): void {
    this._channels["music"].resume();
  }

  /** Returns sound duration in ms */
  getDuration(name: string): number {
    const resource = this._getSoundResource(name);
    if (!resource) return 0;

    return resource.duration * 1000;
  }

  async playFx(name: string, options?: Partial<PlayingFxOptions>) {
    return this._channels["soundEffect"].play(name, options);
  }

  stopFx(id: number): void {
    this._channels["soundEffect"].stopInstance(id);
  }

  stopAllFx(): void {
    this._channels["soundEffect"].stop();
  }

  pauseFx(id: number): void {
    this._channels["soundEffect"].pauseInstance(id);
  }

  pauseAllFx(): void {
    this._channels["soundEffect"].pause();
  }

  resumeFx(id: number): void {
    this._channels["soundEffect"].resumeInstance(id);
  }

  resumeAllFx(): void {
    this._channels["soundEffect"].resume();
  }

  get fxChannelVolume(): number {
    return this._channels["soundEffect"].volume;
  }

  set fxChannelVolume(value: number) {
    this._channels["soundEffect"].volume = value;
    this.emit("change:fxChannelVolume", value);
  }

  private _getSoundResource(name: string): sound.Sound | undefined {
    const resource = PIXI.Assets.get<sound.Sound>(name);
    if (!resource) {
      if (this._options.missingAssetBehavior === "exception")
        throw new Error(`Sound asset ${name} is not loaded`);
      else if (this._options.missingAssetBehavior === "warning")
        console.warn(`Sound asset ${name} is not loaded`);
    }

    return resource;
  }
}

/**
  A chip that requests the music be changed
*/
export class PlayMusic extends chip.ChipBase {
  private _options: PlayingMusicOptions;

  constructor(
    private readonly _trackName: string,
    options?: Partial<PlayingMusicOptions>,
  ) {
    super();

    this._options = chip.fillInOptions(options, new PlayingMusicOptions());
  }

  _onActivate() {
    this._chipContext.dj.playMusic(this._trackName, this._options);
    this._terminateSelf();
  }
}

/**
  A chip that plays a sounds efect
*/
export class PlayFx extends chip.ChipBase {
  private _options: PlayingFxOptions;

  constructor(
    private readonly _trackName: string,
    options?: Partial<PlayingFxOptions>,
  ) {
    super();

    this._options = chip.fillInOptions(options, new PlayingFxOptions());
  }

  _onActivate() {
    this._chipContext.dj.playFx(this._trackName, this._options);
    this._terminateSelf();
  }
}
