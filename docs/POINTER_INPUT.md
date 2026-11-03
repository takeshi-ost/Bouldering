# Touch and mouse input (0.4.56)

The game targets touch and mouse input. This update removes custom keyboard navigation rather than disabling the browser's standard text editing or native controls.

## Removed

- Enter/Space activation handlers on the title, map-player names, character color regions, tutorial/feature cards, clear results, and reward roulette.
- Arrow/Page/Home/End stage scrolling. Touch scrolling, edge dragging, and mouse wheel scrolling remain.
- Explicit tab stops and automatic focus or focus restoration on game scenes, navigation buttons, dialogs, calendar cells, color swatches, and sliders.
- The recently added map-player focus preservation and deferred Tab-transfer rendering. Pointer name display still lasts two seconds after release and defers online DOM refresh until the display is finished.
- Focus-only button/illustration color, brightness, opacity, and outline effects, plus keyboard-triggered audio activation and render wakeups.

## Retained for functional reasons

- Mouse `pointer`, `grab`, and `grabbing` cursors, hover/press feedback, selected states, and disabled states.
- Native input/select/range/button/form behavior and semantic labels. The app does not globally intercept typing or disable the operating system's virtual keyboard.
- Player-name IME/composition, validation focus on an invalid name, and blur on save/cancel and before opening the color palette to dismiss the virtual keyboard. Debug stage input also blurs before launch.
- Native `showModal()` isolation and `cancel`/`close` handling. These preserve the modal, pause, reward, and navigation invariants when the browser dismisses a dialog; they are not custom key bindings.
- Window focus/blur, visibility, page, and native-resume listeners. They handle interrupted gestures/audio, life recovery, date rollover, rendering, and network retries when the app returns to the foreground.
- Baseline outline suppression on non-text buttons and artwork. Focus does not add a new visual treatment. Text-editing fields retain their native editing affordances.

## Verification boundary

The focused input, name-display, editor, modal, sound, and lifecycle tests use controlled DOM/event doubles. They verify state transitions and do not constitute physical touchscreen/mouse or audio audition. Generated Web/native bundles are validated separately. The pointer cleanup does not change Firebase Rules, normal/Daily course identities, save namespace, player data, or ranking policy. The accompanying STAGE0/first-encounter change is documented separately in TUTORIAL_FIRST_ENCOUNTERS.md.
