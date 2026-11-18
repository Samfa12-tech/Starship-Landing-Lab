# Starship Landing Lab

A small **2D browser proof of concept** inspired by [Jochen's Starship Landing Lab idea on GameHavn](https://gamehavn.com/ideas/starship-landing-lab).

Tune **descent braking**, **drift correction** and **attitude stability**, then launch a rocket toward one landing pad. Watch altitude, speed, lateral error, tilt, thrust and fuel, review the flight-data chart, and change your tuning for the next attempt. Good control results in a soft upright landing; poor settings can cause a hard impact or miss the pad.

## Play / run

**Instant play:** Open `starship-landing-lab-play.html` in a browser. It is self-contained and needs no server.

**Editable version:** Requires Node.js 20 or newer. No external packages are required.

```bash
npm ci
npm run dev
```

Open **http://localhost:4173**. The source version consists of `index.html`, `styles.css`, `physics.js`, and `main.js`. Use `npm test` to run the simulation tests.

## Controls

- Mouse or touch: adjust the three sliders; select **Balanced**, **Hot landing** or **Wobbly** preset.
- **Launch**, **Pause/Resume**, **Reset** and **Run again** buttons.
- **Space:** launch/pause/resume. **R:** reset.
- You can adjust tuning in the middle of a flight.

## Scope

One simplified landing scenario, fixed gravity, one pad, tunable feedback-control parameters, real-time Canvas graphics and telemetry, charts and success/failure feedback. This is an approachable game simulation, **not** a flight-certified aerospace autopilot. No audio, multiplayer, weather, terrain variety or hosted playable deployment is included.

## Credits

- Original game idea: **Jochen**, via [GameHavn](https://gamehavn.com/ideas/starship-landing-lab).
- Prototype implementation: Samfa12.
- Graphics: Procedural Canvas drawing and CSS. **No third-party visual or audio assets.**

Original GameHavn idea ID: `5106bea1-6603-4ead-93b8-06f4fae4c19b`.
