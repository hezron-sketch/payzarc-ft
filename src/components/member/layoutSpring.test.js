import { stepSpring } from "./layoutSpring";

const run = (value, velocity, steps, dt = 1 / 60, response = 0.45) => {
  let state = [value, velocity];
  for (let i = 0; i < steps; i++) {
    state = stepSpring(state[0], state[1], response, dt);
  }
  return state;
};

test("settles on the target without overshooting", () => {
  let [x, v] = [200, 0];
  for (let i = 0; i < 120; i++) {
    [x, v] = stepSpring(x, v, 0.45, 1 / 60);
    expect(x).toBeGreaterThanOrEqual(0);
  }
  expect(Math.abs(x)).toBeLessThan(0.1);
});

test("lands the same at 60 and 120 fps", () => {
  const [at60] = run(200, 0, 15, 1 / 60);
  const [at120] = run(200, 0, 30, 1 / 120);
  expect(Math.abs(at60 - at120)).toBeLessThan(1e-6);
});

test("keeps moving the same way when reversed mid-flight", () => {
  // Heading to 0 from 200 (velocity negative); a new layout moves the target
  // past it, which only adds to the offset. Velocity must not reset.
  const [x, v] = run(200, 0, 6);
  expect(v).toBeLessThan(0);
  const [, next] = stepSpring(x - 400, v, 0.45, 1 / 240);
  expect(next).toBeLessThan(0);
});
