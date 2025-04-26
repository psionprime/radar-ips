# Auto Mode Feature Plan

## Overview
"Auto Mode" is a major feature that automates the movement of the mobile device along a selected SVG path in the simulation. This feature is separated into its own module (`autoMode.js`) for maintainability and modularity.

## Initial Requirements
- **Trigger:**
  - Auto Mode is enabled when the "Follow Path" checkbox is checked and after the mobile device has been moved to the closest point on the path to beacon 1.
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

---

## Advice for Prompting Cascade for Future Changes

To get the best results when requesting changes or new features from Cascade, consider these tips:

- **Be Specific:** Clearly describe the behavior you want, including what should trigger it and how it should interact with existing features.
- **Reference Existing Patterns:** If possible, mention functions, files, or UI elements that the change should use or affect. Cascade will always try to iterate on existing code rather than introduce new patterns.
- **Describe Inputs and Outputs:** If adding new logic, specify what data should go in and what should come out, especially for new APIs or UI elements.
- **State the Environment:** If your request is environment-specific (dev, test, prod), mention this so the solution fits your workflow.
- **Request Tests or Validation:** If you want automated tests or a way to verify the change, ask for it explicitly.
- **Ask for Explanations:** If you want to understand how or why something is being changed, request a summary or inline comments.
- **Iterative Changes:** For large features, break your requests into smaller steps. Cascade can help you plan and implement features incrementally.
- **UI/UX Details:** For UI changes, describe the desired user experience and visual feedback.
- **Error Handling:** If robustness is important, ask for error handling or graceful fallback behavior.
- **Sync and Commit:** If you want changes committed and pushed, request a git sync explicitly.

**Example Prompts:**
- "Update the auto mode so the mobile pauses at each beacon for 2 seconds."
- "Add a test that ensures the mobile never leaves the SVG path in auto mode."
- "Refactor the movement code to avoid duplication with manual controls."
- "Show a visual indicator when auto mode is active."

_Keep this section updated as you discover more effective ways to prompt Cascade for your workflow._
