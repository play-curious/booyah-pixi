import * as PIXI from "pixi.js";
import * as booyah from "booyah";

/** Returns the vector length of a a PIXI Point */
export function magnitude(a: PIXI.IPointData): number {
  return Math.sqrt(a.x * a.x + a.y * a.y);
}

/** Returns a copy of the PIXI Point x that has a magnitude between min and max */
export function clampMagnitude(
  a: PIXI.IPointData,
  min: number,
  max: number,
): PIXI.Point {
  const mag = magnitude(a);
  if (mag < min) {
    return multiply(a, min / mag);
  } else if (mag > max) {
    return multiply(a, max / mag);
  } else {
    return new PIXI.Point(a.x, a.y);
  }
}

/** Returns the distance between two PIXI Points */
export function distance(a: PIXI.IPointData, b: PIXI.IPointData): number {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return Math.sqrt(x * x + y * y);
}

/** Linear interpolation between points a and b, using the fraction p */
export function lerpPoint(
  a: PIXI.IPointData,
  b: PIXI.IPointData,
  p: number,
): PIXI.Point {
  const x = b.x - a.x;
  const y = b.y - a.y;
  return new PIXI.Point(a.x + p * x, a.y + p * y);
}

/** Returns the sum of PIXI points */
export function add(...points: PIXI.IPointData[]): PIXI.Point {
  const r = new PIXI.Point();
  for (const p of points) {
    r.x += p.x;
    r.y += p.y;
  }
  return r;
}

/** Returns the difference of PIXI points */
export function subtract(...points: PIXI.IPointData[]): PIXI.IPointData {
  const r = new PIXI.Point(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    r.x -= points[i].x;
    r.y -= points[i].y;
  }
  return r;
}

/** Returns the multiplication of a PIXI point by a scalar */
export function multiply(a: PIXI.IPointData, p: number): PIXI.Point {
  return new PIXI.Point(a.x * p, a.y * p);
}

/** Returns the division of a PIXI point by a scalar */
export function divide(a: PIXI.IPointData, p: number): PIXI.Point {
  return new PIXI.Point(a.x / p, a.y / p);
}

/** Returns a PIXI point with each element rounded down */
export function floor(p: PIXI.IPointData): PIXI.Point {
  return new PIXI.Point(Math.floor(p.x), Math.floor(p.y));
}

/** Returns a PIXI point with each element rounded */
export function round(p: PIXI.IPointData): PIXI.Point {
  return new PIXI.Point(Math.round(p.x), Math.round(p.y));
}

/** Returns a PIXI point that has the minimum of each component */
export function min(...points: PIXI.IPointData[]): PIXI.Point {
  const r = new PIXI.Point(Infinity, Infinity);
  for (const p of points) {
    r.x = Math.min(p.x, r.x);
    r.y = Math.min(p.y, r.y);
  }
  return r;
}

/** Returns a PIXI point that has the maximum of each component */
export function max(...points: PIXI.IPointData[]): PIXI.Point {
  const r = new PIXI.Point(-Infinity, -Infinity);
  for (const p of points) {
    r.x = Math.max(p.x, r.x);
    r.y = Math.max(p.y, r.y);
  }
  return r;
}

/** Returns true if the point p is between points min and max */
export function inRectangle(
  p: PIXI.IPointData,
  min: PIXI.IPointData,
  max: PIXI.IPointData,
) {
  return p.x >= min.x && p.x <= max.x && p.y >= min.y && p.y <= max.y;
}

/** Takes the mean of PIXI points */
export function average(...points: PIXI.IPointData[]): PIXI.Point {
  let sum = new PIXI.Point();
  for (const point of points) sum = add(sum, point);
  return divide(sum, points.length);
}

/**
 Returs a point along the line between a and b, moving at a given speed.
 Will not "overshoot" b.
 */
export function moveTowards(
  a: PIXI.IPointData,
  b: PIXI.IPointData,
  speed: number,
): PIXI.Point {
  const d = distance(a, b);
  return lerpPoint(a, b, booyah.clamp(speed / d, 0, 1));
}

export const moveTowardsPoint = moveTowards;

/** Returns a random point between a amd b, with each component considered separately */
export function randomPointInRange(
  min: PIXI.IPointData,
  max: PIXI.IPointData,
): PIXI.Point {
  return new PIXI.Point(
    booyah.randomInRange(min.x, max.x),
    booyah.randomInRange(min.y, max.y),
  );
}

/** Creates a vector pointing in the direction angle, with the length magnitude */
export function vectorFromAngle(angle: number, magnitude = 1): PIXI.IPointData {
  return new PIXI.Point(
    Math.cos(angle) * magnitude,
    Math.sin(angle) * magnitude,
  );
}

/* Returns true if point is within distance d of otherPoints */
export function withinDistanceOfPoints(
  point: PIXI.IPointData,
  d: number,
  otherPoints: PIXI.IPointData[],
): boolean {
  for (const otherPoint of otherPoints) {
    if (distance(point, otherPoint) <= d) return true;
  }
  return false;
}
