import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// LTTB (Largest Triangle Three Buckets) downsampling algorithm
export function lttbDownsample(data: any[], threshold: number): any[] {
  if (threshold >= data.length || threshold <= 2) {
    return data;
  }

  const sampled = [];
  const bucketSize = (data.length - 2) / (threshold - 2);

  // Always add the first point
  sampled.push(data[0]);

  let a = 0;
  for (let i = 0; i < threshold - 2; i++) {
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    const avgRangeLength = avgRangeEnd - avgRangeStart;

    let avgX = 0;
    let avgY = 0;

    for (let j = avgRangeStart; j < avgRangeEnd && j < data.length; j++) {
      avgX += j;
      avgY += data[j].value;
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    const rangeOffs = Math.floor((i + 0) * bucketSize) + 1;
    const rangeTo = Math.floor((i + 1) * bucketSize) + 1;

    const pointAX = a;
    const pointAY = data[a].value;

    let maxArea = -1;
    let maxAreaPoint = rangeOffs;

    for (let j = rangeOffs; j < rangeTo && j < data.length; j++) {
      const area = Math.abs(
        (pointAX - avgX) * (data[j].value - pointAY) -
        (pointAX - j) * (avgY - pointAY)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = j;
      }
    }

    sampled.push(data[maxAreaPoint]);
    a = maxAreaPoint;
  }

  // Always add the last point
  sampled.push(data[data.length - 1]);

  return sampled;
}
