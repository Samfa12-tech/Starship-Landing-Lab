# Starship Landing Lab agent guide

- Edit the modular browser source (`physics.js`, `main.js`, `index.html`, `styles.css`). The standalone `starship-landing-lab-play.html` is also a supported play entry point and must keep working offline. Reflect player-facing or simulation changes in both versions.
- Run `npm test` for changes to the flight model. Try the affected controls and at least one landing outcome in the served app and the standalone file, including keyboard/touch where relevant. Keep the prototype dependency-free.
