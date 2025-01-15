export type DynamicResolvable<Type, ResolvableContext> = (
  context: ResolvableContext,
) => Type;

export type Resolvable<Type, ResolvableContext> =
  | Type
  | DynamicResolvable<Type, ResolvableContext>;

export function isDynamicResolvable<Type, ResolvableContext>(
  resolvable: Resolvable<Type, ResolvableContext>,
): resolvable is DynamicResolvable<Type, ResolvableContext> {
  return typeof resolvable === "function";
}

export type ResolvableObject<DataType, ResolvableContext> = {
  [Property in keyof DataType]: Resolvable<
    DataType[Property],
    ResolvableContext
  >;
};

export class Resolver<DataType, ResolvableContext> {
  private _resolvedObject: Partial<DataType> = {};
  private _dynamicProperties: Array<keyof DataType>;

  constructor(
    private _resolvableObject: Partial<
      ResolvableObject<DataType, ResolvableContext>
    > = {},
  ) {
    // Figure out which properties are dynamic
    this._dynamicProperties = Object.keys(this._resolvableObject).filter(
      (key) =>
        isDynamicResolvable(this._resolvableObject[key as keyof DataType]),
    ) as Array<keyof DataType>;
  }

  /** Remove all dynamic values  */
  invalidate() {
    for (const key of this._dynamicProperties) {
      delete this._resolvedObject[key];
    }
  }

  resolve(key: keyof DataType, resolvableContext: ResolvableContext) {
    if (key in this._resolvedObject) {
      return this._resolvedObject[key];
    } else {
      const value = this._resolveValue(key, resolvableContext);
      this._resolvedObject[key] = value as DataType[typeof key];
      return value;
    }
  }

  get resolvedObject() {
    return this._resolvedObject;
  }

  get resolvableObject() {
    return this._resolvableObject;
  }

  get properties() {
    return Object.keys(this._resolvableObject) as (keyof DataType)[];
  }

  get dynamicProperties() {
    return this._dynamicProperties;
  }

  private _resolveValue(
    key: keyof DataType,
    resolvableContext: ResolvableContext,
  ) {
    const resolvable = this._resolvableObject[key];
    if (isDynamicResolvable(resolvable)) {
      return resolvable(resolvableContext);
    }

    return resolvable;
  }
}
