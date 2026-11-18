export const GRAVITY = 9.81;
export const MAX_THRUST = 30.5;
export const PAD_HALF_WIDTH = 22;
export const STEP = 1 / 60;
export const DEFAULT_TUNING = { braking: 65, drift: 60, stability: 70 };
export const PRESETS = { balanced: DEFAULT_TUNING, hot: { braking: 17, drift: 25, stability: 40 }, wobble: { braking: 70, drift: 100, stability: 14 } };
export function freshState() {
    return { x: -96, h: 330, vx: 6.1, vy: -12.5, angle: 0.055, angularRate: 0, fuel: 100, time: 0, thrust: 0, requestedAngle: 0, phase: 'ready', outcome: '' };
}
export function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
export function classify(s) {
    if (Math.abs(s.x) > PAD_HALF_WIDTH - 5)
        return { success: false, detail: 'Missed the landing pad. Tune drift correction.' };
    if (Math.abs(s.vx) > 2.4)
        return { success: false, detail: 'Too much sideways speed. Increase drift correction.' };
    if (-s.vy > 3.8)
        return { success: false, detail: 'Hard impact. Increase descent braking.' };
    if (Math.abs(s.angle) > 0.14)
        return { success: false, detail: 'Too much tilt. Increase attitude stability.' };
    return { success: true, detail: 'Soft, upright touchdown on the pad. Nice flying!' };
}
export function advance(state, tuning, dt = STEP) {
    if (state.phase !== 'flying')
        return state;
    const s = { ...state };
    // Lower hover-target height reduces terminal speed; earlier in descent we allow speed.
    const targetVy = s.h > 155 ? -16 : s.h > 65 ? -10 : s.h > 20 ? -6 : -2.25;
    const brakeResponse = 0.055 + (tuning.braking / 100) * 0.63;
    const throttle = clamp((GRAVITY + (targetVy - s.vy) * brakeResponse) / MAX_THRUST, 0, 1);
    const desiredAx = clamp((-s.x * (0.008 + tuning.drift * 0.00023) - s.vx * (0.07 + tuning.drift * 0.0035)), -6.7, 6.7);
    const requestedAngle = Math.asin(clamp(desiredAx / (Math.max(12, throttle * MAX_THRUST)), -0.36, 0.36));
    // The ship has inertia: weak attitude response makes it oscillate during correction.
    const stiffness = 0.9 + tuning.stability * 0.10;
    const damping = 0.65 + tuning.stability * 0.046;
    const angularAccel = clamp((requestedAngle - s.angle) * stiffness - s.angularRate * damping, -4, 4);
    s.angularRate += angularAccel * dt;
    s.angle = clamp(s.angle + s.angularRate * dt, -1.25, 1.25);
    const actualThrust = throttle * MAX_THRUST * (s.fuel > 0 ? 1 : 0);
    s.vx += Math.sin(s.angle) * actualThrust * dt;
    s.vy += (Math.cos(s.angle) * actualThrust - GRAVITY) * dt;
    s.x += s.vx * dt;
    s.h += s.vy * dt;
    s.fuel = clamp(s.fuel - 0.13 * throttle * dt, 0, 100);
    s.time += dt;
    s.thrust = throttle;
    s.requestedAngle = requestedAngle;
    if (s.h <= 0) {
        s.h = 0;
        const outcome = classify(s);
        s.phase = outcome.success ? 'landed' : 'crashed';
        s.outcome = outcome.detail;
        s.thrust = 0;
    }
    if (s.time > 150) {
        s.phase = 'crashed';
        s.outcome = 'Flight timed out. Try stronger braking or correction.';
        s.thrust = 0;
    }
    return s;
}
export function simulate(tuning, maxSteps = 150 * 60) {
    let s = freshState();
    s.phase = 'flying';
    const samples = [];
    for (let i = 0; i < maxSteps && s.phase === 'flying'; i++) {
        s = advance(s, tuning);
        if (i % 6 === 0 || s.phase !== 'flying')
            samples.push({ t: s.time, h: s.h, x: s.x, vx: s.vx, vy: s.vy, tilt: s.angle * 180 / Math.PI, thrust: s.thrust });
    }
    return { state: s, samples };
}

