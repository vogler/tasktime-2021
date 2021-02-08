import { useEffect, useRef } from "react";

const delay = (time: number) => new Promise(res => setTimeout(res, time));

// Object.fromEntries(Object.entries(a).filter(([k,v],i) => {console.log(k,v); return b[k] != v}))
