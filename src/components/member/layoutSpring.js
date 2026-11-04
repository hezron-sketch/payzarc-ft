import { useEffect, useLayoutEffect, useRef } from "react";

// Critically damped spring, solved exactly so it behaves the same at any frame
// rate. `value` is the distance left to the target (0). `response` is Apple's
// parameter: roughly how many seconds the move takes to read as finished.
export function stepSpring(value, velocity, response, dt) {
  const w = (2 * Math.PI) / response;
  const k = velocity + w * value;
  const decay = Math.exp(-w * dt);
  return [(value + k * dt) * decay, (velocity - w * k * dt) * decay];
}

// A shove `v` on a critically damped spring peaks at v / (w * e), a beat after
// the flip (t = 1 / w). This response puts that peak around when the swap's two
// items cross, so the shove below lands the swing's full width right there.
const SWING_RESPONSE = 0.7;
const SWING_W = (2 * Math.PI) / SWING_RESPONSE;

const atRest = (value, velocity, eps) =>
  Math.abs(value) < eps && Math.abs(velocity) < eps * 10;

// Glides `items` ({ ref, response, scale?, swingX? }) to wherever each render lays them
// out. Motion is an offset from the real layout that decays to zero, so a new
// layout mid-flight just adds to the offset and keeps the velocity: reversing
// never jumps. offsetLeft/Top/Width ignore transforms, so nothing needs
// un-applying before measuring. Scale items follow width changes only when
// `mode` flips, so a balance finishing loading doesn't pulse. `swingX(x)` gets
// the item's current sideways offset and returns how many px to swing on a flip,
// to pass around something on the same path: a shove on a slower spring, which
// makes an arc that settles by itself.
export function useLayoutSpring(items, mode) {
  const states = useRef([]);
  const lastMode = useRef(mode);
  const raf = useRef(0);

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const modeChanged = lastMode.current !== mode;
    lastMode.current = mode;

    const apply = (el, s) => {
      el.style.transform =
        s.x || s.y || s.s
          ? `translate3d(${s.x}px, ${s.y}px, 0) scale(${1 + s.s})`
          : "";
      el.style.willChange = el.style.transform ? "transform" : "";
    };

    let moving = false;
    items.forEach(({ ref, scale, swingX }, i) => {
      const el = ref.current;
      if (!el) {
        states.current[i] = null;
        return;
      }
      const s = (states.current[i] ??= {
        x: 0, y: 0, s: 0, vx: 0, vy: 0, vs: 0,
        left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth,
      });
      if (scale) {
        if (modeChanged) s.s = ((1 + s.s) * s.width) / el.offsetWidth - 1;
        s.width = el.offsetWidth;
      } else {
        s.x += s.left - el.offsetLeft;
        s.y += s.top - el.offsetTop;
        s.left = el.offsetLeft;
        s.top = el.offsetTop;
        if (modeChanged && swingX) {
          // Only the part of the swing not already under way, so reversing
          // mid-swing doesn't stack a second arc on the first.
          s.vx = (swingX(s.x) - s.x) * SWING_W * Math.E;
        }
      }
      if (reduce) s.x = s.y = s.s = s.vx = s.vy = s.vs = 0;
      // Before paint, so the new layout never shows for a frame.
      apply(el, s);
      moving ||= !!(s.x || s.y || s.s || s.vx);
    });

    if (!moving || raf.current) return;
    let last = performance.now();
    const frame = (now) => {
      // A dropped tab or long task shouldn't teleport the motion.
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      let active = false;
      items.forEach(({ ref, response, swingX }, i) => {
        const s = states.current[i];
        const el = ref.current;
        if (!s || !el) return;
        [s.x, s.vx] = stepSpring(s.x, s.vx, swingX ? SWING_RESPONSE : response, dt);
        [s.y, s.vy] = stepSpring(s.y, s.vy, response, dt);
        [s.s, s.vs] = stepSpring(s.s, s.vs, response, dt);
        if (atRest(s.x, s.vx, 0.1)) s.x = s.vx = 0;
        if (atRest(s.y, s.vy, 0.1)) s.y = s.vy = 0;
        if (atRest(s.s, s.vs, 0.001)) s.s = s.vs = 0;
        apply(el, s);
        active ||= !!(s.x || s.y || s.s);
      });
      raf.current = active ? requestAnimationFrame(frame) : 0;
    };
    raf.current = requestAnimationFrame(frame);
  });

  useEffect(() => {
    // A resize is a new layout, not a move: adopt it without animating.
    const resync = () => {
      items.forEach(({ ref }, i) => {
        const s = states.current[i];
        const el = ref.current;
        if (!s || !el) return;
        s.left = el.offsetLeft;
        s.top = el.offsetTop;
        s.width = el.offsetWidth;
      });
    };
    window.addEventListener("resize", resync);
    return () => {
      window.removeEventListener("resize", resync);
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    // The refs inside `items` are stable; only their .current changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
