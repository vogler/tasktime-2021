import { keyframes } from "@emotion/react";
import { useEffect, useRef } from "react";

export const delay = (time: number) => new Promise(res => setTimeout(res, time));

export const equals = <T>(a: T, b: T): boolean => {
  // console.log('equals', a === b, a, b, typeof a, typeof b);
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.every((v,i) => equals(v, b[i]));
  }
  if (a instanceof Object && b instanceof Object) {
    return Object.entries(a).every(([k,v]) => equals(v, b[k as keyof T]));
  }
  return false;
}
export const diff = <T extends {}>(a: T, b: T) => Object.fromEntries(Object.entries(b).filter(([k,v],i) => !equals(v, a[k as keyof T])));
