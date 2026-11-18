import {advance,clamp,DEFAULT_TUNING,freshState,PAD_HALF_WIDTH,PRESETS,STEP} from './physics.js';
const canvas = document.querySelector('#flightCanvas');
const cx = canvas.getContext('2d');
const chart = document.querySelector('#chartCanvas');
const gx = chart.getContext('2d');
const element = (id) => document.getElementById(id);
const launchButton = element('launchButton');
const launchText = element('launchText');
const launchIcon = element('launchIcon');
const status = element('runStatus');
const sliders = { braking: element('braking'), drift: element('drift'), stability: element('stability') };
let state = freshState();
let samples = [];
let paused = false;
let accumulator = 0;
let prev = 0;
let historyTimer = 0;
const STAR_COUNT = 92;
const stars = Array.from({ length: STAR_COUNT }, (_, i) => { const n = (j) => { let x = Math.sin((i + 1) * 124.537 + j * 89.12) * 43758.5453; return x - Math.floor(x); }; return { x: n(2), y: n(3) * 0.8, r: n(4) * 1.35 + 0.35, a: n(5) * 0.48 + 0.13 }; });
function tuning() { return { braking: Number(sliders.braking.value), drift: Number(sliders.drift.value), stability: Number(sliders.stability.value) }; }
function setTuning(t) { Object.keys(sliders).forEach(k => { sliders[k].value = String(t[k]); element(`${k}Value`).textContent = `${t[k]}%`; }); }
function setPreset(name) { const t = PRESETS[name]; if (!t)
    return; setTuning(t); document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('active', b.dataset.preset === name)); }
Object.keys(sliders).forEach(k => sliders[k].addEventListener('input', () => { element(`${k}Value`).textContent = `${sliders[k].value}%`; document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active')); }));
document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => setPreset(b.dataset.preset)));
function sample() { const s = state; samples.push({ t: s.time, h: s.h, vx: s.vx, vy: s.vy, x: s.x, tilt: s.angle * 180 / Math.PI, thrust: s.thrust }); }
function reset() { state = freshState(); samples = []; paused = false; accumulator = 0; historyTimer = 0; updateUI(); render(); }
function launchOrPause() {
    if (state.phase === 'ready' || state.phase === 'landed' || state.phase === 'crashed') {
        if (state.phase !== 'ready')
            reset();
        state = { ...state, phase: 'flying' };
        paused = false;
        sample();
    }
    else if (state.phase === 'flying')
        paused = !paused;
    updateUI();
}
launchButton.addEventListener('click', launchOrPause);
element('resetButton').addEventListener('click', reset);
document.addEventListener('keydown', e => {
    const t = e.target;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON')
        return;
    if (e.code === 'Space') {
        e.preventDefault();
        launchOrPause();
    }
    if (e.code === 'KeyR') {
        e.preventDefault();
        reset();
    }
});
function signed(n, fraction = 1) { const abs = Math.abs(n).toFixed(fraction); const [whole, dec] = abs.split('.'); const sign = n < 0 ? '−' : '+'; return `${sign}${whole}<span>.${dec}</span>`; }
function metric(id, value, sign = true) { element(id).innerHTML = sign ? signed(value) : Math.abs(value).toFixed(1).replace(/(\.\d)$/, '<span>$1</span>'); }
function clock(t) { const m = Math.floor(t / 60).toString().padStart(2, '0'); return `${m}:${(t % 60).toFixed(1).padStart(4, '0')}`; }
function updateUI() {
    const running = state.phase === 'flying' && !paused;
    launchText.textContent = state.phase === 'ready' ? 'LAUNCH SIMULATION' : state.phase === 'flying' ? (paused ? 'RESUME SIMULATION' : 'PAUSE SIMULATION') : 'RUN AGAIN';
    launchIcon.textContent = state.phase === 'flying' && !paused ? 'Ⅱ' : '▶';
    const name = state.phase === 'flying' ? (paused ? 'PAUSED' : 'IN FLIGHT') : state.phase === 'landed' ? 'TOUCHDOWN' : state.phase === 'crashed' ? 'LANDING FAILED' : 'STANDBY';
    status.innerHTML = `<span class="status-led"></span> ${name}`;
    status.className = `status ${state.phase === 'flying' ? 'flying' : state.phase === 'crashed' ? 'crashed' : ''}`;
    metric('altitude', state.h, false);
    metric('speed', state.vy);
    metric('offset', state.x);
    metric('attitude', state.angle * 180 / Math.PI);
    element('altFill').style.width = `${clamp(state.h / 330 * 100, 0, 100)}%`;
    element('fuel').textContent = `FUEL ${state.fuel.toFixed(0)}%`;
    element('speedCaption').textContent = state.vy < 0 ? 'DESCENDING' : 'CLIMBING';
    element('elapsed').textContent = clock(state.time);
    const o = element('outcomePanel');
    o.className = 'outcome-card';
    if (state.phase === 'landed') {
        o.classList.add('success');
        element('outcomeIcon').textContent = '✓';
        element('outcomeHeading').textContent = 'MISSION SUCCESS';
        element('outcomeTitle').textContent = 'Nailed the touchdown.';
        element('outcomeDetail').textContent = `${state.outcome} Impact ${Math.abs(state.vy).toFixed(1)} m/s · pad error ${Math.abs(state.x).toFixed(1)} m.`;
    }
    else if (state.phase === 'crashed') {
        o.classList.add('failure');
        element('outcomeIcon').textContent = '×';
        element('outcomeHeading').textContent = 'FLIGHT REVIEW';
        element('outcomeTitle').textContent = 'Well, that was expensive.';
        element('outcomeDetail').textContent = state.outcome;
    }
    else if (state.phase === 'flying') {
        element('outcomeIcon').textContent = paused ? 'Ⅱ' : '↗';
        element('outcomeHeading').textContent = paused ? 'TELEMETRY HOLD' : 'AUTOPILOT ENGAGED';
        element('outcomeTitle').textContent = paused ? 'Flight paused.' : 'Approach in progress.';
        element('outcomeDetail').textContent = 'Watch the flight data. You can adjust the sliders while the simulation is running.';
    }
    else {
        element('outcomeIcon').textContent = '◎';
        element('outcomeHeading').textContent = 'MISSION BRIEFING';
        element('outcomeTitle').textContent = 'Ready when you are.';
        element('outcomeDetail').textContent = 'Make your adjustments, then launch the simulation. The flight data will help you tune the next attempt.';
    }
    void running;
}
const W = canvas.width, H = canvas.height;
const ground = H * 0.84, padX = W * 0.60, pxPerMeter = 1.20;
const shipX = (x) => padX + x * pxPerMeter;
const shipY = (h) => ground - h * pxPerMeter;
function rect(x, y, w, h, color) { cx.fillStyle = color; cx.fillRect(x, y, w, h); }
function label(text, x, y, size = 12, color = '#8ea6b8', align = 'left') {
    cx.fillStyle = color;
    cx.font = `${size}px ui-monospace,SFMono-Regular,Consolas,monospace`;
    cx.textAlign = align;
    cx.fillText(text, x, y);
    cx.textAlign = 'left';
}
function drawBackground() {
    const gr = cx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#081b30');
    gr.addColorStop(0.7, '#0b2639');
    gr.addColorStop(1, '#152b36');
    rect(0, 0, W, H, gr);
    for (const star of stars) {
        cx.globalAlpha = star.a;
        cx.fillStyle = '#d5f0f5';
        cx.beginPath();
        cx.arc(star.x * W, star.y * H, star.r, 0, Math.PI * 2);
        cx.fill();
    }
    cx.globalAlpha = 1;
    const glow = cx.createRadialGradient(850, 100, 4, 850, 100, 250);
    glow.addColorStop(0, 'rgba(80,149,172,.17)');
    glow.addColorStop(1, 'rgba(80,149,172,0)');
    cx.fillStyle = glow;
    cx.fillRect(540, 0, 500, 480);
    cx.strokeStyle = 'rgba(118,174,184,.13)';
    cx.lineWidth = 1;
    cx.setLineDash([4, 9]);
    for (let x = padX % 90; x < W; x += 90) {
        cx.beginPath();
        cx.moveTo(x, 44);
        cx.lineTo(x, ground);
        cx.stroke();
    }
    for (let y = 50; y < ground; y += 65) {
        cx.beginPath();
        cx.moveTo(0, y);
        cx.lineTo(W, y);
        cx.stroke();
    }
    cx.setLineDash([]);
    cx.fillStyle = '#10283a';
    cx.beginPath();
    cx.moveTo(0, ground);
    for (let x = 0; x <= W; x += 20) {
        let y = ground - 35 - 13 * Math.sin(x * 0.015) - 28 * Math.sin(x * 0.005);
        cx.lineTo(x, y);
    }
    cx.lineTo(W, ground);
    cx.closePath();
    cx.fill();
    cx.fillStyle = '#162e39';
    cx.beginPath();
    cx.moveTo(0, ground);
    for (let x = 0; x <= W; x += 25) {
        let y = ground - 8 - 8 * Math.sin(x * 0.02) - 11 * Math.sin(x * 0.008);
        cx.lineTo(x, y);
    }
    cx.lineTo(W, H);
    cx.lineTo(0, H);
    cx.closePath();
    cx.fill();
    rect(0, ground, W, H - ground, '#172d34');
    rect(0, ground, W, 3, '#385c61');
    // Landing platform, illuminated rails and centre target.
    const pW = (PAD_HALF_WIDTH * 2 + 15) * pxPerMeter;
    rect(padX - pW / 2, ground - 8, pW, 8, '#426e73');
    rect(padX - pW / 2, ground - 12, pW, 4, '#b5f18e');
    rect(padX - pW / 2 - 9, ground - 2, 11, 14, '#253f47');
    rect(padX + pW / 2 - 2, ground - 2, 11, 14, '#253f47');
    const padGlow = cx.createRadialGradient(padX, ground - 7, 1, padX, ground - 7, 150);
    padGlow.addColorStop(0, 'rgba(181,241,142,.12)');
    padGlow.addColorStop(1, 'rgba(181,241,142,0)');
    cx.fillStyle = padGlow;
    cx.fillRect(padX - 155, ground - 165, 310, 170);
    cx.strokeStyle = '#89e7c180';
    cx.setLineDash([5, 8]);
    cx.beginPath();
    cx.moveTo(padX, ground - 13);
    cx.lineTo(padX, 55);
    cx.stroke();
    cx.setLineDash([]);
    label('LANDING PAD / A01', padX, ground + 32, 12, '#b7e9bf', 'center');
    label('0 M', padX + 16, ground - 19, 11, '#8cc5bb');
    for (let i = 0; i < 5; i++) {
        const y = ground - i * 100 * pxPerMeter;
        cx.strokeStyle = '#6598a33b';
        cx.beginPath();
        cx.moveTo(32, y);
        cx.lineTo(105, y);
        cx.stroke();
        label(`${i * 100} M`, 35, y - 9, 11, '#7398ab');
    }
    rect(20, 21, 248, 49, 'rgba(4,16,28,.53)');
    label('DESCENT CORRIDOR / SECTOR 7', 34, 40, 12, '#9cbcc8');
    label('TARGET: PAD A01', 34, 58, 12, '#c1e4a4');
    rect(W - 251, 21, 231, 49, 'rgba(4,16,28,.53)');
    label(`AUTOPILOT ${state.phase === 'flying' ? 'ACTIVE' : 'READY'}`, W - 235, 40, 12, '#9cbcc8');
    label(`THRUST ${Math.round(state.thrust * 100)}%`, W - 235, 58, 12, '#c1e4a4');
}
function drawRocket() {
    const x = shipX(state.x), y = shipY(state.h) - 33;
    // Trace the actual flight path since ignition.
    if (samples.length > 1) {
        cx.strokeStyle = 'rgba(104,228,226,.35)';
        cx.lineWidth = 2;
        cx.setLineDash([3, 5]);
        cx.beginPath();
        for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            const sx = shipX(s.x), sy = shipY(s.h) - 33;
            if (i === 0)
                cx.moveTo(sx, sy);
            else
                cx.lineTo(sx, sy);
        }
        cx.stroke();
        cx.setLineDash([]);
    }
    if (state.phase === 'flying' && state.thrust > 0.06) {
        const jetLength = 24 + state.thrust * 85 + (Math.sin(state.time * 81) * 8);
        cx.save();
        cx.translate(x, y);
        cx.rotate(state.angle);
        const jet = cx.createLinearGradient(0, 25, 0, jetLength + 38);
        jet.addColorStop(0, '#fff9c8');
        jet.addColorStop(.24, '#ffe68a');
        jet.addColorStop(.62, '#ff9c48');
        jet.addColorStop(1, 'rgba(245,116,41,0)');
        cx.fillStyle = jet;
        cx.beginPath();
        cx.moveTo(-9, 23);
        cx.quadraticCurveTo(-7, jetLength * .77, 0, jetLength + 32);
        cx.quadraticCurveTo(7, jetLength * .74, 9, 23);
        cx.closePath();
        cx.fill();
        cx.fillStyle = 'rgba(255,184,105,.13)';
        cx.beginPath();
        cx.ellipse(0, jetLength * .6, 30, jetLength * .65, 0, 0, Math.PI * 2);
        cx.fill();
        cx.restore();
    }
    // Landing shadow tracks lateral error.
    cx.fillStyle = 'rgba(3,10,15,.35)';
    cx.beginPath();
    cx.ellipse(x, ground + 3, 24, 4, 0, 0, Math.PI * 2);
    cx.fill();
    cx.save();
    cx.translate(x, y);
    cx.rotate(state.angle);
    if (state.phase === 'crashed')
        cx.globalAlpha = .65;
    cx.shadowColor = 'rgba(104,220,230,.3)';
    cx.shadowBlur = 24;
    cx.fillStyle = '#dce8ed';
    cx.beginPath();
    cx.moveTo(0, -43);
    cx.lineTo(16, -15);
    cx.lineTo(16, 29);
    cx.lineTo(-16, 29);
    cx.lineTo(-16, -15);
    cx.closePath();
    cx.fill();
    cx.shadowBlur = 0;
    rect(-13, -14, 26, 25, '#d4e0e3');
    rect(-13, 2, 26, 5, '#e88957');
    rect(-13, -17, 26, 5, '#75c4d0');
    cx.fillStyle = '#526c83';
    cx.beginPath();
    cx.moveTo(-18, 12);
    cx.lineTo(-27, 31);
    cx.lineTo(-11, 28);
    cx.lineTo(-11, 8);
    cx.fill();
    cx.beginPath();
    cx.moveTo(18, 12);
    cx.lineTo(27, 31);
    cx.lineTo(11, 28);
    cx.lineTo(11, 8);
    cx.fill();
    cx.strokeStyle = '#d4e9ef';
    cx.lineWidth = 3;
    cx.beginPath();
    cx.moveTo(-15, 27);
    cx.lineTo(-22, 38);
    cx.lineTo(-30, 38);
    cx.moveTo(15, 27);
    cx.lineTo(22, 38);
    cx.lineTo(30, 38);
    cx.stroke();
    rect(-10, 28, 20, 8, '#637e89');
    rect(-7, 36, 14, 5, '#283c4e');
    cx.fillStyle = '#1d5166';
    cx.beginPath();
    cx.arc(0, -24, 5, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = '#70ecdd';
    cx.beginPath();
    cx.arc(0, -24, 3.2, 0, Math.PI * 2);
    cx.fill();
    cx.restore();
    // Tracking label and offset vector.
    cx.strokeStyle = 'rgba(127,225,213,.54)';
    cx.lineWidth = 1;
    cx.beginPath();
    cx.moveTo(x + 28, y - 17);
    cx.lineTo(x + 80, y - 39);
    cx.lineTo(x + 136, y - 39);
    cx.stroke();
    label('STARSHIP 01', x + 84, y - 46, 12, '#d7eeee');
    label(`ALT ${state.h.toFixed(0)} M`, x + 84, y - 23, 11, '#87bfc5');
    if (state.phase !== 'landed') {
        cx.strokeStyle = 'rgba(185,232,157,.35)';
        cx.setLineDash([5, 6]);
        cx.beginPath();
        cx.moveTo(x, ground - 7);
        cx.lineTo(padX, ground - 7);
        cx.stroke();
        cx.setLineDash([]);
    }
    if (state.phase === 'crashed') {
        label('IMPACT', x, y - 79, 17, '#ffb18c', 'center');
    }
    if (state.phase === 'landed') {
        label('TOUCHDOWN!', padX, ground - 135, 22, '#c4f7a5', 'center');
    }
}
function renderFlight() { cx.clearRect(0, 0, W, H); drawBackground(); drawRocket(); }
function renderChart() {
    const w = chart.width, h = chart.height;
    gx.clearRect(0, 0, w, h);
    const l = 57, r = w - 15, t = 14, b = h - 34;
    gx.font = '12px ui-monospace,monospace';
    gx.lineWidth = 1;
    gx.strokeStyle = '#274154';
    gx.fillStyle = '#68889b';
    for (let i = 0; i <= 4; i++) {
        const y = t + (b - t) * i / 4;
        gx.beginPath();
        gx.moveTo(l, y);
        gx.lineTo(r, y);
        gx.stroke();
        gx.fillText(`${Math.round(330 * (1 - i / 4))}`, 9, y + 3);
    }
    const timeMax = Math.max(36, Math.ceil(state.time / 10) * 10);
    for (let i = 0; i <= 6; i++) {
        const x = l + (r - l) * i / 6;
        gx.strokeStyle = '#1c3446';
        gx.beginPath();
        gx.moveTo(x, t);
        gx.lineTo(x, b);
        gx.stroke();
        gx.fillStyle = '#7290a5';
        gx.fillText(`${(timeMax * i / 6).toFixed(0)}s`, x - 8, h - 10);
    }
    if (samples.length < 2) {
        gx.fillStyle = '#66899c';
        gx.textAlign = 'center';
        gx.fillText('LAUNCH A SIMULATION TO RECORD TELEMETRY', w / 2, h / 2);
        gx.textAlign = 'left';
        return;
    }
    const xVal = (s) => l + s.t / timeMax * (r - l);
    gx.strokeStyle = '#b4ec86';
    gx.lineWidth = 3;
    gx.beginPath();
    samples.forEach((s, i) => { const x = xVal(s), y = t + (1 - clamp(s.h / 330, 0, 1)) * (b - t); if (!i)
        gx.moveTo(x, y);
    else
        gx.lineTo(x, y); });
    gx.stroke();
    gx.strokeStyle = '#6be1e5';
    gx.lineWidth = 2;
    gx.beginPath();
    samples.forEach((s, i) => { const x = xVal(s), y = t + clamp(Math.abs(s.vy) / 28, 0, 1) * (b - t); if (!i)
        gx.moveTo(x, y);
    else
        gx.lineTo(x, y); });
    gx.stroke();
    const latest = samples[samples.length - 1];
    gx.fillStyle = '#b4ec86';
    gx.beginPath();
    gx.arc(xVal(latest), t + (1 - clamp(latest.h / 330, 0, 1)) * (b - t), 4, 0, 2 * Math.PI);
    gx.fill();
}
function render() { renderFlight(); renderChart(); }
function frame(now) {
    if (!prev)
        prev = now;
    const realDt = clamp((now - prev) / 1000, 0, 0.065);
    prev = now;
    if (state.phase === 'flying' && !paused) {
        accumulator += realDt * 2.0;
        let count = 0;
        while (accumulator >= STEP && count < 15 && state.phase === 'flying') {
            state = advance(state, tuning(), STEP);
            accumulator -= STEP;
            historyTimer += STEP;
            count++;
            if (historyTimer >= .1 || state.phase !== 'flying') {
                sample();
                historyTimer = 0;
            }
        }
        if (count >= 15)
            accumulator = 0;
        updateUI();
    }
    render();
    requestAnimationFrame(frame);
}
setTuning(DEFAULT_TUNING);
updateUI();
render();
// The preview parameter runs the real physics to a representative near-landing point.
// It does not fabricate a scene or change any flight mechanics.
if (new URLSearchParams(location.search).get('preview') === '1') {
    state = { ...state, phase: 'flying' };
    sample();
    for (let i = 0; i < 24 * 60 && state.phase === 'flying'; i++) {
        state = advance(state, DEFAULT_TUNING);
        if (i % 6 === 0)
            sample();
    }
    paused = true;
    updateUI();
    render();
}
requestAnimationFrame(frame);
