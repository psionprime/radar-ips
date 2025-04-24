# Auto Mode Feature Plan

## Overview
"Auto Mode" is a major feature that automates the movement of the mobile device along a selected SVG path in the simulation. This feature is separated into its own module (`autoMode.js`) for maintainability and modularity.

## Initial Requirements
- **Trigger:**
  - Auto Mode is enabled when the "Follow Path" checkbox is checked and after the mobile device has been moved to the closest point on the path to anchor 1.
- **Integration:**
  - Auto Mode logic must be separated from manual movement and other simulation behaviors.
  - The `autoMode.js` module will expose an API for enabling, disabling, and checking the status of Auto Mode.

## Planned Steps
1. **Initialization and Trigger**
    - Listen for the "Follow Path" checkbox event in the UI.
    - After the mobile device is snapped to the path, call `enableAutoMode()` from `autoMode.js`.
    - Pass necessary parameters (path data, speed, sampling interval, etc.) to Auto Mode.

2. **Auto Mode Logic**
    - Continuously move the mobile device along the SVG path at the specified target speed.
    - Use the sample interval (ms) to determine update frequency.
    - Support pausing, resuming, and stopping Auto Mode.
    - Ensure keyboard/manual controls are disabled during Auto Mode.

3. **API Design**
    - `enableAutoMode(options)` — Start auto mode with given options.
    - `disableAutoMode()` — Stop auto mode and return control to user/manual mode.
    - `isAutoModeActive()` — Query whether auto mode is currently enabled.

4. **UI Feedback**
    - Indicate visually in the UI when Auto Mode is active (e.g., status message or highlight).

5. **Extensibility**
    - Design so that additional path following strategies, path types, or behaviors can be added in the future without major refactoring.

## Notes
- All logic for Auto Mode should be contained in `autoMode.js` and only referenced from `main.js`.
- No duplication of path-following logic in `main.js`—all such logic must reside in `autoMode.js`.
- The feature should be thoroughly tested in isolation before merging with other branches.

---

*This plan will be updated as requirements evolve.*
