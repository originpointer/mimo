import {
    l as C,
    b as it
} from "./sendMessage.js";
import {
    i as rt
} from "./typeGuards.js";
const at = `/* ===== CSS 变量定义（从 colors.css 复制）===== */
/* 浅色模式变量（默认） */
:host {
  /* Text Colors */
  --text-primary: #34322d;
  --text-secondary: #5e5e5b;
  --text-tertiary: #858481;
  --text-disable: #b9b9b7;
  --text-blue: #0081f2;
  --text-onblack: #ffffff;
  --text-white: #ffffff;
  --text-white-tsp: #ffffff60;
  --theme-text-primary: #262626;
  --theme-text-quaternary: #8c8c8c;
  --logo-color: #34322d;
  --text-shining: #e5e5e5;

  /* Background Colors */
  --background-gray-main: #f8f8f7;
  --background-white-main: #ffffff;
  --background-menu-white: #ffffff;
  --background-menu-gray: #f8f8f7;
  --background-tsp-menu-white: #ffffff14;
  --background-tsp-card-gray: #37352f0a;
  --background-nav: #ebebeb;
  --background-card: #fafafa;
  --background-mask-black: #000000a6;
  --background-mask-white: #f8f8f7a6;
  --background-card-gray: #fafafa;
  --background-preview-mask: #000000d9;

  /* Border Colors */
  --border-main: #0000000f;
  --border-white: #ffffff33;
  --border-btn-main: #0000001f;
  --border-input-active: #0081f280;
  --border-light: #0000000a;
  --border-dark: #0000001f;
  --border-primary: #4f59661f;

  /* Icon Colors */
  --icon-primary: #34322d;
  --icon-secondary: #5e5e5b;
  --icon-tertiary: #858481;
  --icon-disable: #b9b9b7;
  --icon-blue: #0081f2;
  --icon-onblack: #ffffff;
  --icon-white: #ffffff;
  --icon-white-tsp: #ffffff60;

  /* Function Colors */
  --function-error: #f25a5a;
  --function-success: #25ba3b;
  --function-warning: #efa201;
  --function-error-tsp: #f25a5a14;
  --function-warning-tsp: #efa2011f;
  --function-success-tsp: #25ba3b14;

  /* Fill Colors */
  --fill-blue: #0081f214;
  --fill-tsp-white-main: #37352f0f;
  --fill-tsp-white-dark: #37352f14;
  --fill-tsp-white-light: #37352f0a;
  --fill-tsp-gray-dark: #37352f14;
  --fill-tsp-gray-main: #37352f0a;
  --fill-input-chat: #ffffff;
  --fill-white: #ffffff;
  --fill-black: #28282973;
  --fill-gray: #f8f8f7;

  /* Button Colors */
  --Button-primary-black: #1a1a19;
  --Button-primary-white: #ffffff;
  --Button-primary-brand: #0081f2;
  --Button-primary-brand-disabled: #7cbdf5;
  --Button-secondary-brand: #0081f21a;
  --Button-secondary-error-border: #f25a5a80;
  --Button-secondary-error-fill: #ffffff;
  --Button-secondary-main: #ffffff;
  --Button-secondary-gray: #37352f0f;

  /* Tab Colors */
  --tab-fill: rgba(0, 0, 0, 0.04);
  --tab-active-black: #1a1a19;

  /* Shadow Colors */
  --shadow-L: #0000003d;
  --shadow-M: #0000001f;
  --shadow-S: #00000014;
  --shadow-XS: #0000000f;
  --shadows-inner-0: #ffffff00;
  --shadows-inner-1: #16191d14;
  --shadows-inner-2: #16191d1f;
  --shadows-drop-1: #16191d08;
  --shadows-drop-2: #16191d0a;
  --shadows-drop-3: #16191d14;
  --shadows-drop-4: #16191d1f;
  --shadows-highlight-1: #cce5ff;
  --shadows-highlight-2: #1487fa;
  --shadows-danger-1: #fed7d7;
  --shadows-danger-2: #ee3a3a;
  --shadows-card-border: #16191d1f;
  --shadows-card-border-2: #16191d1f;

  /* Tooltips */
  --Tooltips-main: #000000e6;

  /* Gradual Colors */
  --gradual-white-0: #ffffff00;
  --gradual-gray-100: #ffffff00;
  --gradual-gray-0: #ffffff00;
  --gradual-dark-20: #00000033;

  /* input */
  --fill-input-chat: #ffffff;

  /* gradient */
  --gradient-bg-mask-gray-0: #eaeaeb00;

  --gradual-white-menu-0: #ffffff00;
}

/* 暗色模式变量（通过媒体查询自动响应系统主题） */
@media (prefers-color-scheme: dark) {
  :host {
    /* Text Colors */
    --text-primary: #dadada;
    --text-secondary: #acacac;
    --text-tertiary: #7f7f7f;
    --text-disable: #5f5f5f;
    --text-blue: #1a93fe;
    --text-onblack: #000000e6;
    --text-white: #ffffff;
    --text-white-tsp: #ffffff60;
    --theme-text-primary: #dbdbdb;
    --theme-text-quaternary: #7a7a7a;
    --logo-color: #dadada;
    --text-shining: #474747;

    /* Background Colors */
    --background-gray-main: #272728;
    --background-white-main: #161618;
    --background-menu-white: #383739;
    --background-menu-gray: #272728;
    --background-tsp-menu-white: #ffffff0f;
    --background-tsp-card-gray: #ffffff0f;
    --background-nav: #212122;
    --background-card: #383739;
    --background-mask-black: #000000a6;
    --background-mask-white: #272728a6;
    --background-card-gray: #383739;
    --background-preview-mask: #000000d9;

    /* Border Colors */
    --border-main: #ffffff14;
    --border-white: #00000014;
    --border-btn-main: #ffffff1a;
    --border-input-active: #1a93fe80;
    --border-light: #ffffff0f;
    --border-dark: #ffffff29;
    --border-primary: #56565f52;

    /* Icon Colors */
    --icon-primary: #dadada;
    --icon-secondary: #acacac;
    --icon-tertiary: #7f7f7f;
    --icon-disable: #5f5f5f;
    --icon-blue: #1a93fe;
    --icon-onblack: #000000d9;
    --icon-white: #ffffff;
    --icon-white-tsp: #ffffff60;

    /* Function Colors */
    --function-error: #eb4d4d;
    --function-success: #5eb92d;
    --function-warning: #ffbf36;
    --function-error-tsp: #eb4d4d14;
    --function-warning-tsp: #ffbf361f;
    --function-success-tsp: #25ba3b1f;

    /* Fill Colors */
    --fill-blue: #1a93fe1f;
    --fill-tsp-white-main: #ffffff0f;
    --fill-tsp-white-dark: #ffffff1f;
    --fill-tsp-white-light: #ffffff0a;
    --fill-tsp-gray-dark: #00000047;
    --fill-tsp-gray-main: #00000033;
    --fill-input-chat: #363537;
    --fill-white: #3e3d3e;
    --fill-black: #28282973;
    --fill-gray: #444345;

    /* Button Colors */
    --Button-primary-black: #ffffff;
    --Button-primary-white: #ffffff14;
    --Button-primary-brand: #1a93fe;
    --Button-primary-brand-disabled: #215d93;
    --Button-secondary-brand: #1a93fe1f;
    --Button-secondary-error-border: #eb4d4d29;
    --Button-secondary-error-fill: #eb4d4d1f;
    --Button-secondary-main: #ffffff1f;
    --Button-secondary-gray: #ffffff0f;

    /* Tab Colors */
    --tab-fill: rgba(255, 255, 255, 0.06);
    --tab-active-black: #ffffff;

    /* Shadow Colors */
    --shadow-L: #00000066;
    --shadow-M: #0000003d;
    --shadow-S: #00000029;
    --shadow-XS: #0000001f;
    --shadows-inner-0: #ffffff1f;
    --shadows-inner-1: #ffffff14;
    --shadows-inner-2: #ffffff1f;
    --shadows-drop-1: #0000001f;
    --shadows-drop-2: #00000033;
    --shadows-drop-3: #00000047;
    --shadows-drop-4: #0000005c;
    --shadows-highlight-1: #1b61a6;
    --shadows-highlight-2: #1487fa;
    --shadows-danger-1: #8f1919;
    --shadows-danger-2: #ee3a3a;
    --shadows-card-border: #ffffff1f;
    --shadows-card-border-2: #ffffff00;

    /* Tooltips */
    --Tooltips-main: #000000e6;

    /* Gradual Colors */
    --gradual-white-0: #27272800;
    --gradual-gray-100: #444345;
    --gradual-gray-0: #44434500;
    --gradual-dark-20: #ffffff33;

    /* input */
    --fill-input-chat: #363537;

    /* gradient */
    --gradient-bg-mask-gray-0: #1e1e1e00;

    --gradual-white-menu-0: #38373900;
  }
}

/* ===== 原有组件样式 ===== */
:host {
  all: initial;
}

/* Mask layer styles */
.manus-action-mask-interaction {
  position: fixed;
  inset: 0;
  background-color: transparent;
  pointer-events: none;
  cursor: wait;
  z-index: 1;
  opacity: 0;
  transition: opacity 200ms ease-out;
}

.manus-action-mask-interaction.manus-action-mask-visible {
  pointer-events: auto;
  opacity: 1;
}

.manus-action-mask-interaction.manus-action-mask-cdp-allowed {
  pointer-events: none;
}

/* Blue effect background styles */
.manus-action-mask-blue-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 140ms ease-in;
  display: block;
  z-index: 2;
}

.manus-action-mask-blue-effects.manus-action-mask-visible {
  opacity: 1;
  transition: opacity 200ms ease-out;
}

.manus-action-mask-blue-effects::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--manus-action-mask-effect-radius, 12px);
  pointer-events: none;
  box-shadow:
    inset 0 0 40px rgba(0, 129, 242, 0.16),
    inset 0 0 120px rgba(0, 129, 242, 0.08);
}

.manus-action-mask-blue-effects__edge {
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
}

.manus-action-mask-blue-effects__edge--top,
.manus-action-mask-blue-effects__edge--bottom {
  left: 0;
  right: 0;
  height: var(--manus-action-mask-edge-size, 100px);
  border-radius: inherit;
}

.manus-action-mask-blue-effects__edge--top {
  top: 0;
  background: linear-gradient(
    to bottom,
    var(--manus-action-mask-edge-color, rgba(0, 129, 242, 0.3)) 0%,
    rgba(255, 255, 255, 0) 100%
  );
}

.manus-action-mask-blue-effects__edge--bottom {
  bottom: 0;
  background: linear-gradient(
    to top,
    var(--manus-action-mask-edge-color, rgba(0, 129, 242, 0.3)) 0%,
    rgba(255, 255, 255, 0) 100%
  );
}

.manus-action-mask-blue-effects__edge--left,
.manus-action-mask-blue-effects__edge--right {
  top: 0;
  bottom: 0;
  width: var(--manus-action-mask-edge-size, 100px);
}

.manus-action-mask-blue-effects__edge--left {
  left: 0;
  background: linear-gradient(
    to right,
    var(--manus-action-mask-edge-color, rgba(0, 129, 242, 0.3)) 0%,
    rgba(255, 255, 255, 0) 100%
  );
}

.manus-action-mask-blue-effects__edge--right {
  right: 0;
  background: linear-gradient(
    to left,
    var(--manus-action-mask-edge-color, rgba(0, 129, 242, 0.3)) 0%,
    rgba(255, 255, 255, 0) 100%
  );
}

/* Action bar styles */
.manus-action-mask-action-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 140ms ease-in;
  background: var(--background-menu-white);
  border-radius: 12px;
  border: 0.5px solid var(--border-btn-main);
  padding: 8px 8px 8px 16px;
  min-width: 400px;
  box-shadow:
    0 4px 6px -1px var(--shadow-M),
    0 2px 4px -1px var(--shadow-S);
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  z-index: 3;
}

.manus-action-mask-action-bar.manus-action-mask-visible {
  opacity: 1;
  pointer-events: auto;
  transition: opacity 200ms ease-out;
}

.manus-action-mask-action-bar__left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.manus-action-mask-action-bar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.manus-action-mask-action-bar__icon {
  width: 20px;
  height: 20px;
  color: var(--icon-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.manus-action-mask-action-bar__status {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  white-space: nowrap;
}

.manus-action-mask-action-bar__button {
  display: flex;
  min-width: 64px;
  min-height: 32px;
  padding: 6px 8px;
  justify-content: center;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  background: var(--function-error);
  color: var(--text-white);
  border: none;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
  transition: background-color 150ms ease;
  flex-shrink: 0;
}

.manus-action-mask-action-bar__button:hover {
  background: color-mix(in srgb, var(--function-error) 90%, #000000);
}

.manus-action-mask-action-bar__button:active {
  background: color-mix(in srgb, var(--function-error) 80%, #000000);
}

.manus-action-mask-action-bar__button--black {
  background: var(--Button-primary-black);
  color: var(--text-onblack);
}

.manus-action-mask-action-bar__button--black:hover {
  background: color-mix(in srgb, var(--Button-primary-black) 85%, #ffffff);
}

.manus-action-mask-action-bar__button--black:active {
  background: color-mix(in srgb, var(--Button-primary-black) 75%, #000000);
}

/* 暗色模式下白色按钮的 hover 效果需要混合黑色 */
@media (prefers-color-scheme: dark) {
  .manus-action-mask-action-bar__button--black:hover {
    background: color-mix(in srgb, var(--Button-primary-black) 90%, #000000);
  }

  .manus-action-mask-action-bar__button--black:active {
    background: color-mix(in srgb, var(--Button-primary-black) 80%, #000000);
  }
}

.manus-action-mask-action-bar__button--stop {
  display: flex;
  min-width: 64px;
  min-height: 32px;
  padding: 6px 8px;
  justify-content: center;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  background: var(--Button-secondary-main);
  color: var(--text-primary);
  border: 1px solid var(--border-btn-main);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
  transition: background-color 150ms ease;
  flex-shrink: 0;
}

.manus-action-mask-action-bar__button--stop:hover {
  background: var(--fill-tsp-white-dark);
}

.manus-action-mask-action-bar__button--stop:active {
  background: var(--fill-tsp-white-main);
}

@media (prefers-color-scheme: dark) {
  .manus-action-mask-action-bar__button--stop:hover {
    background: #ffffff33;
  }

  .manus-action-mask-action-bar__button--stop:active {
    background: #ffffff29;
  }
}

/* Draggable left container */
.manus-action-mask-action-bar__left {
  cursor: grab;
}

.manus-action-mask-action-bar--dragging {
  user-select: none;
}

.manus-action-mask-action-bar--dragging .manus-action-mask-action-bar__left {
  cursor: grabbing;
}

/* Resume modal styles */
.manus-action-mask-resume-modal {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  z-index: 10;
  background-color: var(--background-mask-black);
}

.manus-action-mask-resume-modal.manus-action-mask-modal-visible {
  display: flex;
}

.manus-action-mask-resume-modal__content {
  width: 480px;
  max-width: 70vw;
  background: var(--background-gray-main);
  border: 1px solid var(--border-btn-main);
  border-radius: 20px;
  box-shadow: 0 20px 60px var(--shadow-M);
  backdrop-filter: blur(48px);
  -webkit-backdrop-filter: blur(48px);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.manus-action-mask-resume-modal__header {
  padding: 20px 16px 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.manus-action-mask-resume-modal__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 24px;
  letter-spacing: -0.45px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  flex: 1;
}

.manus-action-mask-resume-modal__body {
  padding: 0 20px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.manus-action-mask-resume-modal__description {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-secondary);
  margin-top: 12px;
  margin-bottom: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 20px;
  letter-spacing: -0.154px;
}

.manus-action-mask-resume-modal__textarea {
  min-height: 90px;
  border: none;
  border-radius: 10px;
  padding: 12px;
  font-family: inherit;
  font-size: 14px;
  line-height: 22px;
  letter-spacing: -0.154px;
  resize: none;
  outline: none;
  background: var(--fill-tsp-white-main);
  color: var(--text-primary);
}

.manus-action-mask-resume-modal__textarea::placeholder {
  color: var(--text-disable);
}

.manus-action-mask-resume-modal__textarea:focus {
  border-color: transparent;
  background: var(--fill-tsp-white-dark);
}

.manus-action-mask-resume-modal__footer {
  display: flex;
  justify-content: flex-end;
}

.manus-action-mask-resume-modal__submit {
  min-height: 36px;
  min-width: 72px;
  margin-top: 20px;
  padding: 8px 12px;
  background: var(--Button-primary-black);
  color: var(--text-onblack);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: -0.154px;
  transition: background-color 150ms ease;
}

.manus-action-mask-resume-modal__submit:hover {
  background: color-mix(in srgb, var(--Button-primary-black) 85%, #ffffff);
}

.manus-action-mask-resume-modal__submit:active {
  background: color-mix(in srgb, var(--Button-primary-black) 75%, #000000);
}

/* 暗色模式下白色按钮的 hover 效果需要混合黑色 */
@media (prefers-color-scheme: dark) {
  .manus-action-mask-resume-modal__submit:hover {
    background: color-mix(in srgb, var(--Button-primary-black) 90%, #000000);
  }

  .manus-action-mask-resume-modal__submit:active {
    background: color-mix(in srgb, var(--Button-primary-black) 80%, #000000);
  }
}

/* Pulsing animation for blue effects */
@keyframes manus-pulse {
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

.manus-action-mask-blue-effects--pulsing {
  animation: manus-pulse 1.5s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .manus-action-mask-blue-effects,
  .manus-action-mask-action-bar,
  .manus-action-mask-interaction {
    transition: none;
  }
  .manus-action-mask-blue-effects--pulsing {
    animation: none;
    opacity: 0.8;
  }
}
`,
    st = "manus-action-mask-host",
    D = "manus-action-mask-visible",
    Te = "manus-action-mask-modal-visible",
    ot = `
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M3.13351 2.85277C2.96089 3.20722 3.10623 3.63551 3.45812 3.80938C3.96356 4.05912 4.40218 4.30537 4.83646 4.79855C5.09654 5.09391 5.54509 5.12098 5.83832 4.859C6.13155 4.59703 6.15843 4.14522 5.89834 3.84986C5.2795 3.14708 4.6425 2.80213 4.08323 2.5258C3.73133 2.35193 3.30613 2.49832 3.13351 2.85277Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M6.9693 0.771391C6.58905 0.867144 6.35786 1.25526 6.45292 1.63827C6.51934 1.90586 6.58128 2.13467 6.63798 2.34412C6.7465 2.74501 6.83584 3.07502 6.90063 3.47038C6.96447 3.8599 7.32972 4.12355 7.71644 4.05925C8.10316 3.99494 8.36491 3.62704 8.30107 3.23751C8.22449 2.77023 8.10523 2.3281 7.98554 1.88434C7.93254 1.68783 7.87945 1.491 7.82994 1.29152C7.73487 0.908507 7.34956 0.675637 6.9693 0.771391Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M11.0262 1.21118C10.6911 1.00638 10.2546 1.11397 10.0513 1.4515C9.67415 2.07761 9.47589 2.69411 9.29174 3.43607C9.19668 3.81908 9.42787 4.2072 9.80812 4.30295C10.1884 4.3987 10.5737 4.16583 10.6688 3.78282C10.8394 3.09508 10.996 2.63931 11.2648 2.19315C11.4681 1.85562 11.3613 1.41598 11.0262 1.21118Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M14.6444 18.8703C16.0206 17.9908 16.9721 13.274 16.7628 11.8695C16.7628 11.8695 16.5447 11.1154 16.0124 11.1154C15.6046 11.1153 15.3792 11.4469 15.2961 11.602C15.2243 11.5754 15.1511 11.5513 15.0931 11.5326C15.0618 11.5225 15.0179 11.5085 14.9768 11.4955L14.8988 11.4706C14.8351 11.4502 14.7752 11.4305 14.7187 11.411L14.7189 11.391C14.7213 10.9351 14.675 10.2237 14.2028 9.48246C14.1272 9.36383 14.0559 9.25778 13.9949 9.16783L13.9567 9.11148C13.9113 9.04467 13.8757 8.99224 13.8415 8.93993C13.7574 8.81157 13.7345 8.76211 13.7256 8.73931L13.7252 8.73829C13.7217 8.72945 13.7146 8.71144 13.7127 8.65656C13.7103 8.58913 13.716 8.4615 13.7598 8.23826L13.9871 7.32996L13.9879 7.32529C14.0029 7.24192 14.0164 7.16697 14.0237 7.04495C14.0305 6.93261 14.0319 6.76936 14.0033 6.58002C13.9493 6.22136 13.7419 5.54151 13.0111 5.1474C12.8325 5.0511 12.6185 4.99344 12.4076 4.96587C12.2659 4.94732 12.0763 4.93464 11.8562 4.95164C11.4072 4.98632 10.818 5.148 10.2934 5.62891L10.1628 5.76632C9.85791 6.13457 9.53587 6.59054 9.29156 6.99406C8.54984 6.64492 7.67672 6.24408 7.0667 6.02857C6.39716 5.79204 5.64991 5.59412 4.94768 5.61959C4.16998 5.64779 3.29558 5.97383 2.83781 6.89663C2.64976 7.27572 2.56952 7.71844 2.66609 8.17986C2.75837 8.62079 2.9866 8.95803 3.20458 9.19332C3.60929 9.63021 4.1514 9.90085 4.53346 10.0649C4.82599 10.1905 5.12656 10.295 5.39267 10.3796C5.36457 10.4305 5.33641 10.4831 5.30925 10.5365C5.2288 10.6948 5.13253 10.9065 5.06916 11.1486C5.00596 11.3901 4.95613 11.7342 5.04622 12.1224C5.13869 12.5208 5.32165 12.832 5.53964 13.07C5.53136 13.1937 5.52828 13.3241 5.53287 13.4591C5.56352 14.3604 6.11389 14.9612 6.59798 15.302C7.0592 15.6266 7.60238 15.8259 8.04154 15.9598C8.46559 16.0892 8.9134 16.1918 9.27725 16.2752L9.35511 16.2931C9.74287 16.3822 10.1261 16.4852 10.5095 16.5883C10.9443 16.7053 11.3794 16.8222 11.8214 16.9189C11.9659 16.9505 12.1064 16.9808 12.2356 17.0084L12.2827 17.1311C12.8561 18.5963 13.6217 19.5238 14.6444 18.8703ZM9.40519 12.8732C9.32671 12.8413 9.28166 12.8201 9.2417 12.8C8.89441 12.6193 8.46718 12.7555 8.28652 13.105C8.10551 13.4552 8.24099 13.887 8.58864 14.0694C8.61712 14.0843 8.64605 14.0983 8.6751 14.112C8.7238 14.1349 8.79164 14.1655 8.87425 14.1991C9.03715 14.2653 9.26872 14.3476 9.53127 14.4037C9.99722 14.5033 10.8585 14.5792 11.4425 13.9051C11.7228 13.5814 11.8576 13.1562 11.9088 12.7586C11.9615 12.349 11.9352 11.8996 11.8323 11.4622C11.6295 10.6006 11.0928 9.65785 10.0907 9.21071C9.23198 8.82759 8.38339 8.73752 7.66778 8.81833C7.19 8.87228 6.73352 9.00771 6.36686 9.21411V9.19823C5.47017 8.94031 3.6857 8.42702 4.12514 7.54116C4.45827 6.86962 5.37096 6.92513 6.60889 7.36246C7.1117 7.54009 7.8104 7.85662 8.46947 8.16529C8.67377 8.26097 8.87426 8.3559 9.06392 8.4457C9.34036 8.57658 9.80252 8.79216 9.80252 8.79216C10.3282 8.15676 10.5323 7.80674 10.7124 7.49779C10.8363 7.2853 10.9489 7.09225 11.1469 6.83914C11.4273 6.48088 11.8804 6.25949 12.3452 6.38911C12.6692 6.56381 12.5869 7.00507 12.5869 7.00507L12.3617 7.90478C12.1468 8.96359 12.3847 9.31397 12.7768 9.89144C12.8457 9.99287 12.9194 10.1014 12.9961 10.2219C13.3089 10.7128 13.2944 11.1848 13.2826 11.5701C13.275 11.8179 13.2686 12.0298 13.3509 12.1877C13.5206 12.513 14.1555 12.7147 14.5718 12.8469C14.6718 12.8787 14.7592 12.9065 14.8245 12.931L14.8691 12.9486C14.8105 13.1319 14.7572 13.3216 14.7039 13.5111C14.4671 14.354 14.2314 15.1931 13.5285 15.4445C12.6414 15.7619 11.7542 15.4616 11.7542 15.4616C11.5943 15.4146 11.4315 15.3781 11.2687 15.3417C11.0657 15.2962 10.8627 15.2508 10.6651 15.1847C10.3897 15.0818 10.004 14.9933 9.58477 14.8971C8.58661 14.6681 7.39861 14.3955 7.0584 13.7803C7.00109 13.6766 6.96784 13.5633 6.96361 13.4388C6.94437 12.873 7.14116 12.3664 7.14116 12.3664C7.14116 12.3664 6.83596 12.3677 6.62193 12.1603C6.54215 12.083 6.47503 11.9767 6.44111 11.8305C6.37334 11.5385 6.43153 11.1153 6.78638 10.7579L6.96418 10.5792C7.05402 10.4887 7.32033 10.2962 7.82592 10.2391C8.30587 10.1849 8.89999 10.2431 9.5158 10.5179C9.98815 10.7287 10.3147 11.2121 10.4511 11.7919C10.5178 12.0752 10.53 12.3503 10.5011 12.5748C10.4707 12.8112 10.4037 12.9297 10.3729 12.9652C10.3347 13.0092 10.2002 13.0852 9.82583 13.0052C9.66822 12.9715 9.51852 12.9192 9.40519 12.8732Z" fill="currentColor"/>
</svg>
`;
class lt {
    constructor(t = {}) {
        this.maskHost = null, this.blueEffectContainer = null, this.actionBar = null, this.maskLayer = null, this.resumeModal = null, this.currentState = "idle", this.globalEventListeners = new Map, this.cdpAllowed = !1, this.isDragging = !1, this.dragStartX = 0, this.dragStartY = 0, this.actionBarStartX = 0, this.actionBarStartY = 0, this.defaultStatusText = t.defaultStatusText ?? "Manus is browsing...", this.onStop = t.onStop, this.onResume = t.onResume, this.onTakeover = t.onTakeover
    }
    changeActionMaskState(t) {
        this.currentState = t, this.update()
    }
    allowCDP(t = !1) {
        var e, n;
        this.cdpAllowed = !0, (e = this.maskLayer) == null || e.classList.add("manus-action-mask-cdp-allowed"), t && ((n = this.actionBar) == null || n.classList.remove(D))
    }
    disableCDP(t = !1) {
        var e, n;
        this.cdpAllowed = !1, (e = this.maskLayer) == null || e.classList.remove("manus-action-mask-cdp-allowed"), t && (this.currentState === "ongoing" || this.currentState === "takeover") && ((n = this.actionBar) == null || n.classList.add(D))
    }
    update() {
        switch (this.currentState) {
            case "idle":
                this.cleanup();
                break;
            case "hidden":
                this.showHiddenState();
                break;
            case "ongoing":
                this.showOngoingState();
                break;
            case "takeover":
                this.showTakeoverState();
                break
        }
    }
    showHiddenState() {
        var e, n, i, a;
        const {
            host: t
        } = this.ensureMaskHost();
        t.isConnected || document.documentElement.append(t), t.style.zIndex = "1000000", (e = this.blueEffectContainer) == null || e.classList.remove(D), (n = this.blueEffectContainer) == null || n.classList.remove("manus-action-mask-blue-effects--pulsing"), (i = this.maskLayer) == null || i.classList.add(D), (a = this.actionBar) == null || a.classList.remove(D), this.hideResumeModal(), this.enableGlobalEventBlocking()
    }
    showOngoingState() {
        var e, n, i, a;
        const {
            host: t
        } = this.ensureMaskHost();
        t.isConnected || document.documentElement.append(t), t.style.zIndex = "2147483646", (e = this.blueEffectContainer) == null || e.classList.add(D), (n = this.blueEffectContainer) == null || n.classList.add("manus-action-mask-blue-effects--pulsing"), (i = this.maskLayer) == null || i.classList.add(D), this.updateActionBar("ongoing"), (a = this.actionBar) == null || a.classList.add(D), this.hideResumeModal(), this.enableGlobalEventBlocking()
    }
    showTakeoverState() {
        var e, n, i, a;
        const {
            host: t
        } = this.ensureMaskHost();
        t.isConnected || document.documentElement.append(t), t.style.zIndex = "2147483646", (e = this.blueEffectContainer) == null || e.classList.remove(D), (n = this.blueEffectContainer) == null || n.classList.remove("manus-action-mask-blue-effects--pulsing"), (i = this.maskLayer) == null || i.classList.remove(D), this.updateActionBar("takeover"), (a = this.actionBar) == null || a.classList.add(D), this.hideResumeModal(), this.disableGlobalEventBlocking()
    }
    cleanup() {
        var t;
        (t = this.maskHost) != null && t.isConnected && this.maskHost.remove(), this.disableGlobalEventBlocking()
    }
    ensureMaskHost() {
        if (this.maskHost) return {
            host: this.maskHost
        };
        const t = document.createElement("div");
        t.id = st, t.style.position = "fixed", t.style.inset = "0", t.style.pointerEvents = "none", t.style.zIndex = "2147483646";
        const e = t.attachShadow({
                mode: "open"
            }),
            n = this.createStyles();
        return this.maskLayer = this.createMaskLayer(), this.blueEffectContainer = this.createBlueEffectBackground(), this.actionBar = this.createActionBar(), this.resumeModal = this.createResumeModal(), e.append(n, this.maskLayer, this.blueEffectContainer, this.actionBar, this.resumeModal), this.maskHost = t, {
            host: t
        }
    }
    createStyles() {
        const t = document.createElement("style");
        return t.textContent = at, t
    }
    createMaskLayer() {
        const t = document.createElement("div");
        t.className = "manus-action-mask-interaction";
        const e = i => {
                this.cdpAllowed || i.isTrusted && (i.preventDefault(), i.stopPropagation(), i.stopImmediatePropagation())
            },
            n = ["mousedown", "mouseup", "mousemove", "click", "dblclick", "contextmenu", "pointerdown", "pointermove", "pointerup", "drag", "dragstart", "dragend", "dragenter", "dragleave", "dragover", "drop"];
        for (const i of n) t.addEventListener(i, e, {
            capture: !0,
            passive: !1
        });
        return t
    }
    createBlueEffectBackground() {
        const t = document.createElement("div");
        t.className = "manus-action-mask-blue-effects";
        const e = document.createElement("div");
        e.className = "manus-action-mask-blue-effects__edge manus-action-mask-blue-effects__edge--top";
        const n = document.createElement("div");
        n.className = "manus-action-mask-blue-effects__edge manus-action-mask-blue-effects__edge--bottom";
        const i = document.createElement("div");
        i.className = "manus-action-mask-blue-effects__edge manus-action-mask-blue-effects__edge--left";
        const a = document.createElement("div");
        return a.className = "manus-action-mask-blue-effects__edge manus-action-mask-blue-effects__edge--right", t.append(e, n, i, a), t
    }
    createActionBar() {
        const t = document.createElement("div");
        t.className = "manus-action-mask-action-bar";
        const e = document.createElement("div");
        e.className = "manus-action-mask-action-bar__left";
        const n = document.createElement("div");
        n.className = "manus-action-mask-action-bar__icon", n.innerHTML = ot;
        const i = document.createElement("div");
        i.className = "manus-action-mask-action-bar__status", i.setAttribute("data-status", "true"), i.textContent = this.defaultStatusText, e.append(n, i);
        const a = document.createElement("div");
        a.className = "manus-action-mask-action-bar__right", a.setAttribute("data-action-buttons", "true");
        const s = document.createElement("button");
        return s.className = "manus-action-mask-action-bar__button", s.setAttribute("data-action-btn", "true"), s.textContent = "Take over", s.type = "button", a.append(s), t.append(e, a), this.setupDragListeners(t, e), t
    }
    setupDragListeners(t, e) {
        const n = s => {
                s.preventDefault(), e.setPointerCapture(s.pointerId), this.isDragging = !0, this.dragStartX = s.clientX, this.dragStartY = s.clientY;
                const o = t.getBoundingClientRect();
                this.actionBarStartX = o.left, this.actionBarStartY = o.top, t.classList.add("manus-action-mask-action-bar--dragging")
            },
            i = s => {
                if (!this.isDragging) return;
                const o = s.clientX - this.dragStartX,
                    l = s.clientY - this.dragStartY;
                let c = this.actionBarStartX + o,
                    h = this.actionBarStartY + l;
                const u = t.getBoundingClientRect(),
                    f = window.innerWidth - u.width,
                    d = window.innerHeight - u.height;
                c = Math.max(0, Math.min(c, f)), h = Math.max(0, Math.min(h, d)), t.style.left = `${c}px`, t.style.top = `${h}px`, t.style.bottom = "auto", t.style.transform = "none"
            },
            a = s => {
                this.isDragging && (e.releasePointerCapture(s.pointerId), this.isDragging = !1, t.classList.remove("manus-action-mask-action-bar--dragging"))
            };
        e.addEventListener("pointerdown", n), e.addEventListener("pointermove", i), e.addEventListener("pointerup", a), e.addEventListener("pointercancel", a)
    }
    updateActionBar(t) {
        var a, s;
        if (!this.actionBar) return;
        const e = this.actionBar.querySelector("[data-status]"),
            n = this.actionBar.querySelector("[data-action-btn]"),
            i = this.actionBar.querySelector("[data-action-buttons]");
        if (!(!e || !n || !i)) {
            if (t === "ongoing") {
                e.textContent = this.defaultStatusText, n.textContent = "Take over";
                const o = this.actionBar.querySelector("[data-stop-btn]");
                o == null || o.remove(), n.className = "manus-action-mask-action-bar__button manus-action-mask-action-bar__button--black";
                const l = n.cloneNode(!0);
                (a = n.parentNode) == null || a.replaceChild(l, n), l.addEventListener("click", c => {
                    var h;
                    c.stopPropagation(), (h = this.onTakeover) == null || h.call(this)
                })
            } else if (t === "takeover") {
                e.textContent = "User taking over control", n.textContent = "Resume", n.className = "manus-action-mask-action-bar__button manus-action-mask-action-bar__button--black";
                const o = n.cloneNode(!0);
                (s = n.parentNode) == null || s.replaceChild(o, n), o.addEventListener("click", c => {
                    c.stopPropagation(), this.showResumeModal()
                });
                let l = this.actionBar.querySelector("[data-stop-btn]");
                l || (l = document.createElement("button"), l.className = "manus-action-mask-action-bar__button--stop", l.setAttribute("data-stop-btn", "true"), l.setAttribute("aria-label", "Stop"), l.textContent = "Stop", l.type = "button", l.addEventListener("click", c => {
                    var h;
                    c.stopPropagation(), (h = this.onStop) == null || h.call(this)
                }), i.insertBefore(l, o))
            }
        }
    }
    createResumeModal() {
        const t = document.createElement("div");
        t.className = "manus-action-mask-resume-modal";
        const e = document.createElement("div");
        e.className = "manus-action-mask-resume-modal__content";
        const n = document.createElement("h2");
        n.className = "manus-action-mask-resume-modal__title", n.textContent = "Let Manus know what you've changed";
        const i = document.createElement("p");
        i.className = "manus-action-mask-resume-modal__description", i.textContent = "Summarize your browser actions to help Manus work smoothly.";
        const a = document.createElement("textarea");
        a.className = "manus-action-mask-resume-modal__textarea", a.placeholder = "This message will be sent to Manus...", a.setAttribute("data-textarea", "true");
        const s = document.createElement("div");
        s.className = "manus-action-mask-resume-modal__footer";
        const o = document.createElement("button");
        return o.className = "manus-action-mask-resume-modal__submit", o.textContent = "Send and continue", o.type = "button", o.onclick = l => {
            var u, f;
            l.stopPropagation();
            const c = (u = this.resumeModal) == null ? void 0 : u.querySelector("[data-textarea]"),
                h = (c == null ? void 0 : c.value.trim()) || void 0;
            (f = this.onResume) == null || f.call(this, h), this.hideResumeModal()
        }, s.appendChild(o), e.append(n, i, a, s), t.appendChild(e), t.addEventListener("click", l => {
            l.target === t && this.hideResumeModal()
        }), t
    }
    showResumeModal() {
        if (!this.resumeModal) return;
        const t = this.resumeModal.querySelector("[data-textarea]");
        t && (t.value = ""), this.resumeModal.classList.add(Te)
    }
    hideResumeModal() {
        this.resumeModal && this.resumeModal.classList.remove(Te)
    }
    enableGlobalEventBlocking() {
        this.disableGlobalEventBlocking();
        const t = n => {
                this.currentState !== "ongoing" || this.cdpAllowed || n.isTrusted && (n.preventDefault(), n.stopPropagation(), n.stopImmediatePropagation())
            },
            e = ["keydown", "keyup", "keypress", "wheel"];
        for (const n of e) this.globalEventListeners.set(n, t), document.addEventListener(n, t, {
            capture: !0,
            passive: !1
        })
    }
    disableGlobalEventBlocking() {
        for (const [t, e] of this.globalEventListeners.entries()) document.removeEventListener(t, e, {
            capture: !0
        });
        this.globalEventListeners.clear()
    }
}
var We = {
    exports: {}
};
(function(r) {
    function t(e, n) {
        if (n && n.documentElement) e = n, n = arguments[2];
        else if (!e || !e.documentElement) throw new Error("First argument to Readability constructor should be a document object.");
        if (n = n || {}, this._doc = e, this._docJSDOMParser = this._doc.firstChild.__JSDOMParser__, this._articleTitle = null, this._articleByline = null, this._articleDir = null, this._articleSiteName = null, this._attempts = [], this._debug = !!n.debug, this._maxElemsToParse = n.maxElemsToParse || this.DEFAULT_MAX_ELEMS_TO_PARSE, this._nbTopCandidates = n.nbTopCandidates || this.DEFAULT_N_TOP_CANDIDATES, this._charThreshold = n.charThreshold || this.DEFAULT_CHAR_THRESHOLD, this._classesToPreserve = this.CLASSES_TO_PRESERVE.concat(n.classesToPreserve || []), this._keepClasses = !!n.keepClasses, this._serializer = n.serializer || function(i) {
                return i.innerHTML
            }, this._disableJSONLD = !!n.disableJSONLD, this._allowedVideoRegex = n.allowedVideoRegex || this.REGEXPS.videos, this._flags = this.FLAG_STRIP_UNLIKELYS | this.FLAG_WEIGHT_CLASSES | this.FLAG_CLEAN_CONDITIONALLY, this._debug) {
            let i = function(a) {
                if (a.nodeType == a.TEXT_NODE) return `${a.nodeName} ("${a.textContent}")`;
                let s = Array.from(a.attributes || [], function(o) {
                    return `${o.name}="${o.value}"`
                }).join(" ");
                return `<${a.localName} ${s}>`
            };
            this.log = function() {
                if (typeof console < "u") {
                    let s = Array.from(arguments, o => o && o.nodeType == this.ELEMENT_NODE ? i(o) : o);
                    s.unshift("Reader: (Readability)"), console.log.apply(console, s)
                } else if (typeof dump < "u") {
                    var a = Array.prototype.map.call(arguments, function(s) {
                        return s && s.nodeName ? i(s) : s
                    }).join(" ");
                    dump("Reader: (Readability) " + a + `
`)
                }
            }
        } else this.log = function() {}
    }
    t.prototype = {
        FLAG_STRIP_UNLIKELYS: 1,
        FLAG_WEIGHT_CLASSES: 2,
        FLAG_CLEAN_CONDITIONALLY: 4,
        ELEMENT_NODE: 1,
        TEXT_NODE: 3,
        DEFAULT_MAX_ELEMS_TO_PARSE: 0,
        DEFAULT_N_TOP_CANDIDATES: 5,
        DEFAULT_TAGS_TO_SCORE: "section,h2,h3,h4,h5,h6,p,td,pre".toUpperCase().split(","),
        DEFAULT_CHAR_THRESHOLD: 500,
        REGEXPS: {
            unlikelyCandidates: /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,
            okMaybeItsACandidate: /and|article|body|column|content|main|shadow/i,
            positive: /article|body|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story/i,
            negative: /-ad-|hidden|^hid$| hid$| hid |^hid |banner|combx|comment|com-|contact|foot|footer|footnote|gdpr|masthead|media|meta|outbrain|promo|related|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|tags|tool|widget/i,
            extraneous: /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single|utility/i,
            byline: /byline|author|dateline|writtenby|p-author/i,
            replaceFonts: /<(\/?)font[^>]*>/gi,
            normalize: /\s{2,}/g,
            videos: /\/\/(www\.)?((dailymotion|youtube|youtube-nocookie|player\.vimeo|v\.qq)\.com|(archive|upload\.wikimedia)\.org|player\.twitch\.tv)/i,
            shareElements: /(\b|_)(share|sharedaddy)(\b|_)/i,
            nextLink: /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i,
            prevLink: /(prev|earl|old|new|<|«)/i,
            tokenize: /\W+/g,
            whitespace: /^\s*$/,
            hasContent: /\S$/,
            hashUrl: /^#.+/,
            srcsetUrl: /(\S+)(\s+[\d.]+[xw])?(\s*(?:,|$))/g,
            b64DataUrl: /^data:\s*([^\s;,]+)\s*;\s*base64\s*,/i,
            commas: /\u002C|\u060C|\uFE50|\uFE10|\uFE11|\u2E41|\u2E34|\u2E32|\uFF0C/g,
            jsonLdArticleTypes: /^Article|AdvertiserContentArticle|NewsArticle|AnalysisNewsArticle|AskPublicNewsArticle|BackgroundNewsArticle|OpinionNewsArticle|ReportageNewsArticle|ReviewNewsArticle|Report|SatiricalArticle|ScholarlyArticle|MedicalScholarlyArticle|SocialMediaPosting|BlogPosting|LiveBlogPosting|DiscussionForumPosting|TechArticle|APIReference$/
        },
        UNLIKELY_ROLES: ["menu", "menubar", "complementary", "navigation", "alert", "alertdialog", "dialog"],
        DIV_TO_P_ELEMS: new Set(["BLOCKQUOTE", "DL", "DIV", "IMG", "OL", "P", "PRE", "TABLE", "UL"]),
        ALTER_TO_DIV_EXCEPTIONS: ["DIV", "ARTICLE", "SECTION", "P"],
        PRESENTATIONAL_ATTRIBUTES: ["align", "background", "bgcolor", "border", "cellpadding", "cellspacing", "frame", "hspace", "rules", "style", "valign", "vspace"],
        DEPRECATED_SIZE_ATTRIBUTE_ELEMS: ["TABLE", "TH", "TD", "HR", "PRE"],
        PHRASING_ELEMS: ["ABBR", "AUDIO", "B", "BDO", "BR", "BUTTON", "CITE", "CODE", "DATA", "DATALIST", "DFN", "EM", "EMBED", "I", "IMG", "INPUT", "KBD", "LABEL", "MARK", "MATH", "METER", "NOSCRIPT", "OBJECT", "OUTPUT", "PROGRESS", "Q", "RUBY", "SAMP", "SCRIPT", "SELECT", "SMALL", "SPAN", "STRONG", "SUB", "SUP", "TEXTAREA", "TIME", "VAR", "WBR"],
        CLASSES_TO_PRESERVE: ["page"],
        HTML_ESCAPE_MAP: {
            lt: "<",
            gt: ">",
            amp: "&",
            quot: '"',
            apos: "'"
        },
        _postProcessContent: function(e) {
            this._fixRelativeUris(e), this._simplifyNestedElements(e), this._keepClasses || this._cleanClasses(e)
        },
        _removeNodes: function(e, n) {
            if (this._docJSDOMParser && e._isLiveNodeList) throw new Error("Do not pass live node lists to _removeNodes");
            for (var i = e.length - 1; i >= 0; i--) {
                var a = e[i],
                    s = a.parentNode;
                s && (!n || n.call(this, a, i, e)) && s.removeChild(a)
            }
        },
        _replaceNodeTags: function(e, n) {
            if (this._docJSDOMParser && e._isLiveNodeList) throw new Error("Do not pass live node lists to _replaceNodeTags");
            for (const i of e) this._setNodeTag(i, n)
        },
        _forEachNode: function(e, n) {
            Array.prototype.forEach.call(e, n, this)
        },
        _findNode: function(e, n) {
            return Array.prototype.find.call(e, n, this)
        },
        _someNode: function(e, n) {
            return Array.prototype.some.call(e, n, this)
        },
        _everyNode: function(e, n) {
            return Array.prototype.every.call(e, n, this)
        },
        _concatNodeLists: function() {
            var e = Array.prototype.slice,
                n = e.call(arguments),
                i = n.map(function(a) {
                    return e.call(a)
                });
            return Array.prototype.concat.apply([], i)
        },
        _getAllNodesWithTag: function(e, n) {
            return e.querySelectorAll ? e.querySelectorAll(n.join(",")) : [].concat.apply([], n.map(function(i) {
                var a = e.getElementsByTagName(i);
                return Array.isArray(a) ? a : Array.from(a)
            }))
        },
        _cleanClasses: function(e) {
            var n = this._classesToPreserve,
                i = (e.getAttribute("class") || "").split(/\s+/).filter(function(a) {
                    return n.indexOf(a) != -1
                }).join(" ");
            for (i ? e.setAttribute("class", i) : e.removeAttribute("class"), e = e.firstElementChild; e; e = e.nextElementSibling) this._cleanClasses(e)
        },
        _fixRelativeUris: function(e) {
            var n = this._doc.baseURI,
                i = this._doc.documentURI;

            function a(l) {
                if (n == i && l.charAt(0) == "#") return l;
                try {
                    return new URL(l, n).href
                } catch {}
                return l
            }
            var s = this._getAllNodesWithTag(e, ["a"]);
            this._forEachNode(s, function(l) {
                var c = l.getAttribute("href");
                if (c)
                    if (c.indexOf("javascript:") === 0)
                        if (l.childNodes.length === 1 && l.childNodes[0].nodeType === this.TEXT_NODE) {
                            var h = this._doc.createTextNode(l.textContent);
                            l.parentNode.replaceChild(h, l)
                        } else {
                            for (var u = this._doc.createElement("span"); l.firstChild;) u.appendChild(l.firstChild);
                            l.parentNode.replaceChild(u, l)
                        }
                else l.setAttribute("href", a(c))
            });
            var o = this._getAllNodesWithTag(e, ["img", "picture", "figure", "video", "audio", "source"]);
            this._forEachNode(o, function(l) {
                var c = l.getAttribute("src"),
                    h = l.getAttribute("poster"),
                    u = l.getAttribute("srcset");
                if (c && l.setAttribute("src", a(c)), h && l.setAttribute("poster", a(h)), u) {
                    var f = u.replace(this.REGEXPS.srcsetUrl, function(d, g, y, _) {
                        return a(g) + (y || "") + _
                    });
                    l.setAttribute("srcset", f)
                }
            })
        },
        _simplifyNestedElements: function(e) {
            for (var n = e; n;) {
                if (n.parentNode && ["DIV", "SECTION"].includes(n.tagName) && !(n.id && n.id.startsWith("readability"))) {
                    if (this._isElementWithoutContent(n)) {
                        n = this._removeAndGetNext(n);
                        continue
                    } else if (this._hasSingleTagInsideElement(n, "DIV") || this._hasSingleTagInsideElement(n, "SECTION")) {
                        for (var i = n.children[0], a = 0; a < n.attributes.length; a++) i.setAttribute(n.attributes[a].name, n.attributes[a].value);
                        n.parentNode.replaceChild(i, n), n = i;
                        continue
                    }
                }
                n = this._getNextNode(n)
            }
        },
        _getArticleTitle: function() {
            var e = this._doc,
                n = "",
                i = "";
            try {
                n = i = e.title.trim(), typeof n != "string" && (n = i = this._getInnerText(e.getElementsByTagName("title")[0]))
            } catch {}
            var a = !1;

            function s(f) {
                return f.split(/\s+/).length
            }
            if (/ [\|\-\\\/>»] /.test(n)) a = / [\\\/>»] /.test(n), n = i.replace(/(.*)[\|\-\\\/>»] .*/gi, "$1"), s(n) < 3 && (n = i.replace(/[^\|\-\\\/>»]*[\|\-\\\/>»](.*)/gi, "$1"));
            else if (n.indexOf(": ") !== -1) {
                var o = this._concatNodeLists(e.getElementsByTagName("h1"), e.getElementsByTagName("h2")),
                    l = n.trim(),
                    c = this._someNode(o, function(f) {
                        return f.textContent.trim() === l
                    });
                c || (n = i.substring(i.lastIndexOf(":") + 1), s(n) < 3 ? n = i.substring(i.indexOf(":") + 1) : s(i.substr(0, i.indexOf(":"))) > 5 && (n = i))
            } else if (n.length > 150 || n.length < 15) {
                var h = e.getElementsByTagName("h1");
                h.length === 1 && (n = this._getInnerText(h[0]))
            }
            n = n.trim().replace(this.REGEXPS.normalize, " ");
            var u = s(n);
            return u <= 4 && (!a || u != s(i.replace(/[\|\-\\\/>»]+/g, "")) - 1) && (n = i), n
        },
        _prepDocument: function() {
            var e = this._doc;
            this._removeNodes(this._getAllNodesWithTag(e, ["style"])), e.body && this._replaceBrs(e.body), this._replaceNodeTags(this._getAllNodesWithTag(e, ["font"]), "SPAN")
        },
        _nextNode: function(e) {
            for (var n = e; n && n.nodeType != this.ELEMENT_NODE && this.REGEXPS.whitespace.test(n.textContent);) n = n.nextSibling;
            return n
        },
        _replaceBrs: function(e) {
            this._forEachNode(this._getAllNodesWithTag(e, ["br"]), function(n) {
                for (var i = n.nextSibling, a = !1;
                    (i = this._nextNode(i)) && i.tagName == "BR";) {
                    a = !0;
                    var s = i.nextSibling;
                    i.parentNode.removeChild(i), i = s
                }
                if (a) {
                    var o = this._doc.createElement("p");
                    for (n.parentNode.replaceChild(o, n), i = o.nextSibling; i;) {
                        if (i.tagName == "BR") {
                            var l = this._nextNode(i.nextSibling);
                            if (l && l.tagName == "BR") break
                        }
                        if (!this._isPhrasingContent(i)) break;
                        var c = i.nextSibling;
                        o.appendChild(i), i = c
                    }
                    for (; o.lastChild && this._isWhitespace(o.lastChild);) o.removeChild(o.lastChild);
                    o.parentNode.tagName === "P" && this._setNodeTag(o.parentNode, "DIV")
                }
            })
        },
        _setNodeTag: function(e, n) {
            if (this.log("_setNodeTag", e, n), this._docJSDOMParser) return e.localName = n.toLowerCase(), e.tagName = n.toUpperCase(), e;
            for (var i = e.ownerDocument.createElement(n); e.firstChild;) i.appendChild(e.firstChild);
            e.parentNode.replaceChild(i, e), e.readability && (i.readability = e.readability);
            for (var a = 0; a < e.attributes.length; a++) try {
                i.setAttribute(e.attributes[a].name, e.attributes[a].value)
            } catch {}
            return i
        },
        _prepArticle: function(e) {
            this._cleanStyles(e), this._markDataTables(e), this._fixLazyImages(e), this._cleanConditionally(e, "form"), this._cleanConditionally(e, "fieldset"), this._clean(e, "object"), this._clean(e, "embed"), this._clean(e, "footer"), this._clean(e, "link"), this._clean(e, "aside");
            var n = this.DEFAULT_CHAR_THRESHOLD;
            this._forEachNode(e.children, function(i) {
                this._cleanMatchedNodes(i, function(a, s) {
                    return this.REGEXPS.shareElements.test(s) && a.textContent.length < n
                })
            }), this._clean(e, "iframe"), this._clean(e, "input"), this._clean(e, "textarea"), this._clean(e, "select"), this._clean(e, "button"), this._cleanHeaders(e), this._cleanConditionally(e, "table"), this._cleanConditionally(e, "ul"), this._cleanConditionally(e, "div"), this._replaceNodeTags(this._getAllNodesWithTag(e, ["h1"]), "h2"), this._removeNodes(this._getAllNodesWithTag(e, ["p"]), function(i) {
                var a = i.getElementsByTagName("img").length,
                    s = i.getElementsByTagName("embed").length,
                    o = i.getElementsByTagName("object").length,
                    l = i.getElementsByTagName("iframe").length,
                    c = a + s + o + l;
                return c === 0 && !this._getInnerText(i, !1)
            }), this._forEachNode(this._getAllNodesWithTag(e, ["br"]), function(i) {
                var a = this._nextNode(i.nextSibling);
                a && a.tagName == "P" && i.parentNode.removeChild(i)
            }), this._forEachNode(this._getAllNodesWithTag(e, ["table"]), function(i) {
                var a = this._hasSingleTagInsideElement(i, "TBODY") ? i.firstElementChild : i;
                if (this._hasSingleTagInsideElement(a, "TR")) {
                    var s = a.firstElementChild;
                    if (this._hasSingleTagInsideElement(s, "TD")) {
                        var o = s.firstElementChild;
                        o = this._setNodeTag(o, this._everyNode(o.childNodes, this._isPhrasingContent) ? "P" : "DIV"), i.parentNode.replaceChild(o, i)
                    }
                }
            })
        },
        _initializeNode: function(e) {
            switch (e.readability = {
                    contentScore: 0
                }, e.tagName) {
                case "DIV":
                    e.readability.contentScore += 5;
                    break;
                case "PRE":
                case "TD":
                case "BLOCKQUOTE":
                    e.readability.contentScore += 3;
                    break;
                case "ADDRESS":
                case "OL":
                case "UL":
                case "DL":
                case "DD":
                case "DT":
                case "LI":
                case "FORM":
                    e.readability.contentScore -= 3;
                    break;
                case "H1":
                case "H2":
                case "H3":
                case "H4":
                case "H5":
                case "H6":
                case "TH":
                    e.readability.contentScore -= 5;
                    break
            }
            e.readability.contentScore += this._getClassWeight(e)
        },
        _removeAndGetNext: function(e) {
            var n = this._getNextNode(e, !0);
            return e.parentNode.removeChild(e), n
        },
        _getNextNode: function(e, n) {
            if (!n && e.firstElementChild) return e.firstElementChild;
            if (e.nextElementSibling) return e.nextElementSibling;
            do e = e.parentNode; while (e && !e.nextElementSibling);
            return e && e.nextElementSibling
        },
        _textSimilarity: function(e, n) {
            var i = e.toLowerCase().split(this.REGEXPS.tokenize).filter(Boolean),
                a = n.toLowerCase().split(this.REGEXPS.tokenize).filter(Boolean);
            if (!i.length || !a.length) return 0;
            var s = a.filter(l => !i.includes(l)),
                o = s.join(" ").length / a.join(" ").length;
            return 1 - o
        },
        _checkByline: function(e, n) {
            if (this._articleByline) return !1;
            if (e.getAttribute !== void 0) var i = e.getAttribute("rel"),
                a = e.getAttribute("itemprop");
            return (i === "author" || a && a.indexOf("author") !== -1 || this.REGEXPS.byline.test(n)) && this._isValidByline(e.textContent) ? (this._articleByline = e.textContent.trim(), !0) : !1
        },
        _getNodeAncestors: function(e, n) {
            n = n || 0;
            for (var i = 0, a = []; e.parentNode && (a.push(e.parentNode), !(n && ++i === n));) e = e.parentNode;
            return a
        },
        _grabArticle: function(e) {
            this.log("**** grabArticle ****");
            var n = this._doc,
                i = e !== null;
            if (e = e || this._doc.body, !e) return this.log("No body found in document. Abort."), null;
            for (var a = e.innerHTML;;) {
                this.log("Starting grabArticle loop");
                var s = this._flagIsActive(this.FLAG_STRIP_UNLIKELYS),
                    o = [],
                    l = this._doc.documentElement;
                let ke = !0;
                for (; l;) {
                    l.tagName === "HTML" && (this._articleLang = l.getAttribute("lang"));
                    var c = l.className + " " + l.id;
                    if (!this._isProbablyVisible(l)) {
                        this.log("Removing hidden node - " + c), l = this._removeAndGetNext(l);
                        continue
                    }
                    if (l.getAttribute("aria-modal") == "true" && l.getAttribute("role") == "dialog") {
                        l = this._removeAndGetNext(l);
                        continue
                    }
                    if (this._checkByline(l, c)) {
                        l = this._removeAndGetNext(l);
                        continue
                    }
                    if (ke && this._headerDuplicatesTitle(l)) {
                        this.log("Removing header: ", l.textContent.trim(), this._articleTitle.trim()), ke = !1, l = this._removeAndGetNext(l);
                        continue
                    }
                    if (s) {
                        if (this.REGEXPS.unlikelyCandidates.test(c) && !this.REGEXPS.okMaybeItsACandidate.test(c) && !this._hasAncestorTag(l, "table") && !this._hasAncestorTag(l, "code") && l.tagName !== "BODY" && l.tagName !== "A") {
                            this.log("Removing unlikely candidate - " + c), l = this._removeAndGetNext(l);
                            continue
                        }
                        if (this.UNLIKELY_ROLES.includes(l.getAttribute("role"))) {
                            this.log("Removing content with role " + l.getAttribute("role") + " - " + c), l = this._removeAndGetNext(l);
                            continue
                        }
                    }
                    if ((l.tagName === "DIV" || l.tagName === "SECTION" || l.tagName === "HEADER" || l.tagName === "H1" || l.tagName === "H2" || l.tagName === "H3" || l.tagName === "H4" || l.tagName === "H5" || l.tagName === "H6") && this._isElementWithoutContent(l)) {
                        l = this._removeAndGetNext(l);
                        continue
                    }
                    if (this.DEFAULT_TAGS_TO_SCORE.indexOf(l.tagName) !== -1 && o.push(l), l.tagName === "DIV") {
                        for (var h = null, u = l.firstChild; u;) {
                            var f = u.nextSibling;
                            if (this._isPhrasingContent(u)) h !== null ? h.appendChild(u) : this._isWhitespace(u) || (h = n.createElement("p"), l.replaceChild(h, u), h.appendChild(u));
                            else if (h !== null) {
                                for (; h.lastChild && this._isWhitespace(h.lastChild);) h.removeChild(h.lastChild);
                                h = null
                            }
                            u = f
                        }
                        if (this._hasSingleTagInsideElement(l, "P") && this._getLinkDensity(l) < .25) {
                            var d = l.children[0];
                            l.parentNode.replaceChild(d, l), l = d, o.push(l)
                        } else this._hasChildBlockElement(l) || (l = this._setNodeTag(l, "P"), o.push(l))
                    }
                    l = this._getNextNode(l)
                }
                var g = [];
                this._forEachNode(o, function(B) {
                    if (!(!B.parentNode || typeof B.parentNode.tagName > "u")) {
                        var F = this._getInnerText(B);
                        if (!(F.length < 25)) {
                            var Ne = this._getNodeAncestors(B, 5);
                            if (Ne.length !== 0) {
                                var ee = 0;
                                ee += 1, ee += F.split(this.REGEXPS.commas).length, ee += Math.min(Math.floor(F.length / 100), 3), this._forEachNode(Ne, function($, le) {
                                    if (!(!$.tagName || !$.parentNode || typeof $.parentNode.tagName > "u")) {
                                        if (typeof $.readability > "u" && (this._initializeNode($), g.push($)), le === 0) var ce = 1;
                                        else le === 1 ? ce = 2 : ce = le * 3;
                                        $.readability.contentScore += ee / ce
                                    }
                                })
                            }
                        }
                    }
                });
                for (var y = [], _ = 0, w = g.length; _ < w; _ += 1) {
                    var k = g[_],
                        R = k.readability.contentScore * (1 - this._getLinkDensity(k));
                    k.readability.contentScore = R, this.log("Candidate:", k, "with score " + R);
                    for (var I = 0; I < this._nbTopCandidates; I++) {
                        var A = y[I];
                        if (!A || R > A.readability.contentScore) {
                            y.splice(I, 0, k), y.length > this._nbTopCandidates && y.pop();
                            break
                        }
                    }
                }
                var p = y[0] || null,
                    b = !1,
                    m;
                if (p === null || p.tagName === "BODY") {
                    for (p = n.createElement("DIV"), b = !0; e.firstChild;) this.log("Moving child out:", e.firstChild), p.appendChild(e.firstChild);
                    e.appendChild(p), this._initializeNode(p)
                } else if (p) {
                    for (var v = [], E = 1; E < y.length; E++) y[E].readability.contentScore / p.readability.contentScore >= .75 && v.push(this._getNodeAncestors(y[E]));
                    var N = 3;
                    if (v.length >= N)
                        for (m = p.parentNode; m.tagName !== "BODY";) {
                            for (var H = 0, W = 0; W < v.length && H < N; W++) H += Number(v[W].includes(m));
                            if (H >= N) {
                                p = m;
                                break
                            }
                            m = m.parentNode
                        }
                    p.readability || this._initializeNode(p), m = p.parentNode;
                    for (var M = p.readability.contentScore, P = M / 3; m.tagName !== "BODY";) {
                        if (!m.readability) {
                            m = m.parentNode;
                            continue
                        }
                        var X = m.readability.contentScore;
                        if (X < P) break;
                        if (X > M) {
                            p = m;
                            break
                        }
                        M = m.readability.contentScore, m = m.parentNode
                    }
                    for (m = p.parentNode; m.tagName != "BODY" && m.children.length == 1;) p = m, m = p.parentNode;
                    p.readability || this._initializeNode(p)
                }
                var T = n.createElement("DIV");
                i && (T.id = "readability-content");
                var Z = Math.max(10, p.readability.contentScore * .2);
                m = p.parentNode;
                for (var G = m.children, x = 0, ve = G.length; x < ve; x++) {
                    var S = G[x],
                        z = !1;
                    if (this.log("Looking at sibling node:", S, S.readability ? "with score " + S.readability.contentScore : ""), this.log("Sibling has score", S.readability ? S.readability.contentScore : "Unknown"), S === p) z = !0;
                    else {
                        var Ee = 0;
                        if (S.className === p.className && p.className !== "" && (Ee += p.readability.contentScore * .2), S.readability && S.readability.contentScore + Ee >= Z) z = !0;
                        else if (S.nodeName === "P") {
                            var _e = this._getLinkDensity(S),
                                we = this._getInnerText(S),
                                se = we.length;
                            (se > 80 && _e < .25 || se < 80 && se > 0 && _e === 0 && we.search(/\.( |$)/) !== -1) && (z = !0)
                        }
                    }
                    z && (this.log("Appending node:", S), this.ALTER_TO_DIV_EXCEPTIONS.indexOf(S.nodeName) === -1 && (this.log("Altering sibling:", S, "to div."), S = this._setNodeTag(S, "DIV")), T.appendChild(S), G = m.children, x -= 1, ve -= 1)
                }
                if (this._debug && this.log("Article content pre-prep: " + T.innerHTML), this._prepArticle(T), this._debug && this.log("Article content post-prep: " + T.innerHTML), b) p.id = "readability-page-1", p.className = "page";
                else {
                    var Q = n.createElement("DIV");
                    for (Q.id = "readability-page-1", Q.className = "page"; T.firstChild;) Q.appendChild(T.firstChild);
                    T.appendChild(Q)
                }
                this._debug && this.log("Article content after paging: " + T.innerHTML);
                var oe = !0,
                    K = this._getInnerText(T, !0).length;
                if (K < this._charThreshold)
                    if (oe = !1, e.innerHTML = a, this._flagIsActive(this.FLAG_STRIP_UNLIKELYS)) this._removeFlag(this.FLAG_STRIP_UNLIKELYS), this._attempts.push({
                        articleContent: T,
                        textLength: K
                    });
                    else if (this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) this._removeFlag(this.FLAG_WEIGHT_CLASSES), this._attempts.push({
                    articleContent: T,
                    textLength: K
                });
                else if (this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY)) this._removeFlag(this.FLAG_CLEAN_CONDITIONALLY), this._attempts.push({
                    articleContent: T,
                    textLength: K
                });
                else {
                    if (this._attempts.push({
                            articleContent: T,
                            textLength: K
                        }), this._attempts.sort(function(B, F) {
                            return F.textLength - B.textLength
                        }), !this._attempts[0].textLength) return null;
                    T = this._attempts[0].articleContent, oe = !0
                }
                if (oe) {
                    var nt = [m, p].concat(this._getNodeAncestors(m));
                    return this._someNode(nt, function(B) {
                        if (!B.tagName) return !1;
                        var F = B.getAttribute("dir");
                        return F ? (this._articleDir = F, !0) : !1
                    }), T
                }
            }
        },
        _isValidByline: function(e) {
            return typeof e == "string" || e instanceof String ? (e = e.trim(), e.length > 0 && e.length < 100) : !1
        },
        _unescapeHtmlEntities: function(e) {
            if (!e) return e;
            var n = this.HTML_ESCAPE_MAP;
            return e.replace(/&(quot|amp|apos|lt|gt);/g, function(i, a) {
                return n[a]
            }).replace(/&#(?:x([0-9a-z]{1,4})|([0-9]{1,4}));/gi, function(i, a, s) {
                var o = parseInt(a || s, a ? 16 : 10);
                return String.fromCharCode(o)
            })
        },
        _getJSONLD: function(e) {
            var n = this._getAllNodesWithTag(e, ["script"]),
                i;
            return this._forEachNode(n, function(a) {
                if (!i && a.getAttribute("type") === "application/ld+json") try {
                    var s = a.textContent.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, ""),
                        o = JSON.parse(s);
                    if (!o["@context"] || !o["@context"].match(/^https?\:\/\/schema\.org$/) || (!o["@type"] && Array.isArray(o["@graph"]) && (o = o["@graph"].find(function(u) {
                            return (u["@type"] || "").match(this.REGEXPS.jsonLdArticleTypes)
                        })), !o || !o["@type"] || !o["@type"].match(this.REGEXPS.jsonLdArticleTypes))) return;
                    if (i = {}, typeof o.name == "string" && typeof o.headline == "string" && o.name !== o.headline) {
                        var l = this._getArticleTitle(),
                            c = this._textSimilarity(o.name, l) > .75,
                            h = this._textSimilarity(o.headline, l) > .75;
                        h && !c ? i.title = o.headline : i.title = o.name
                    } else typeof o.name == "string" ? i.title = o.name.trim() : typeof o.headline == "string" && (i.title = o.headline.trim());
                    o.author && (typeof o.author.name == "string" ? i.byline = o.author.name.trim() : Array.isArray(o.author) && o.author[0] && typeof o.author[0].name == "string" && (i.byline = o.author.filter(function(u) {
                        return u && typeof u.name == "string"
                    }).map(function(u) {
                        return u.name.trim()
                    }).join(", "))), typeof o.description == "string" && (i.excerpt = o.description.trim()), o.publisher && typeof o.publisher.name == "string" && (i.siteName = o.publisher.name.trim()), typeof o.datePublished == "string" && (i.datePublished = o.datePublished.trim());
                    return
                } catch (u) {
                    this.log(u.message)
                }
            }), i || {}
        },
        _getArticleMetadata: function(e) {
            var n = {},
                i = {},
                a = this._doc.getElementsByTagName("meta"),
                s = /\s*(article|dc|dcterm|og|twitter)\s*:\s*(author|creator|description|published_time|title|site_name)\s*/gi,
                o = /^\s*(?:(dc|dcterm|og|twitter|weibo:(article|webpage))\s*[\.:]\s*)?(author|creator|description|title|site_name)\s*$/i;
            return this._forEachNode(a, function(l) {
                var c = l.getAttribute("name"),
                    h = l.getAttribute("property"),
                    u = l.getAttribute("content");
                if (u) {
                    var f = null,
                        d = null;
                    h && (f = h.match(s), f && (d = f[0].toLowerCase().replace(/\s/g, ""), i[d] = u.trim())), !f && c && o.test(c) && (d = c, u && (d = d.toLowerCase().replace(/\s/g, "").replace(/\./g, ":"), i[d] = u.trim()))
                }
            }), n.title = e.title || i["dc:title"] || i["dcterm:title"] || i["og:title"] || i["weibo:article:title"] || i["weibo:webpage:title"] || i.title || i["twitter:title"], n.title || (n.title = this._getArticleTitle()), n.byline = e.byline || i["dc:creator"] || i["dcterm:creator"] || i.author, n.excerpt = e.excerpt || i["dc:description"] || i["dcterm:description"] || i["og:description"] || i["weibo:article:description"] || i["weibo:webpage:description"] || i.description || i["twitter:description"], n.siteName = e.siteName || i["og:site_name"], n.publishedTime = e.datePublished || i["article:published_time"] || null, n.title = this._unescapeHtmlEntities(n.title), n.byline = this._unescapeHtmlEntities(n.byline), n.excerpt = this._unescapeHtmlEntities(n.excerpt), n.siteName = this._unescapeHtmlEntities(n.siteName), n.publishedTime = this._unescapeHtmlEntities(n.publishedTime), n
        },
        _isSingleImage: function(e) {
            return e.tagName === "IMG" ? !0 : e.children.length !== 1 || e.textContent.trim() !== "" ? !1 : this._isSingleImage(e.children[0])
        },
        _unwrapNoscriptImages: function(e) {
            var n = Array.from(e.getElementsByTagName("img"));
            this._forEachNode(n, function(a) {
                for (var s = 0; s < a.attributes.length; s++) {
                    var o = a.attributes[s];
                    switch (o.name) {
                        case "src":
                        case "srcset":
                        case "data-src":
                        case "data-srcset":
                            return
                    }
                    if (/\.(jpg|jpeg|png|webp)/i.test(o.value)) return
                }
                a.parentNode.removeChild(a)
            });
            var i = Array.from(e.getElementsByTagName("noscript"));
            this._forEachNode(i, function(a) {
                var s = e.createElement("div");
                if (s.innerHTML = a.innerHTML, !!this._isSingleImage(s)) {
                    var o = a.previousElementSibling;
                    if (o && this._isSingleImage(o)) {
                        var l = o;
                        l.tagName !== "IMG" && (l = o.getElementsByTagName("img")[0]);
                        for (var c = s.getElementsByTagName("img")[0], h = 0; h < l.attributes.length; h++) {
                            var u = l.attributes[h];
                            if (u.value !== "" && (u.name === "src" || u.name === "srcset" || /\.(jpg|jpeg|png|webp)/i.test(u.value))) {
                                if (c.getAttribute(u.name) === u.value) continue;
                                var f = u.name;
                                c.hasAttribute(f) && (f = "data-old-" + f), c.setAttribute(f, u.value)
                            }
                        }
                        a.parentNode.replaceChild(s.firstElementChild, o)
                    }
                }
            })
        },
        _removeScripts: function(e) {
            this._removeNodes(this._getAllNodesWithTag(e, ["script", "noscript"]))
        },
        _hasSingleTagInsideElement: function(e, n) {
            return e.children.length != 1 || e.children[0].tagName !== n ? !1 : !this._someNode(e.childNodes, function(i) {
                return i.nodeType === this.TEXT_NODE && this.REGEXPS.hasContent.test(i.textContent)
            })
        },
        _isElementWithoutContent: function(e) {
            return e.nodeType === this.ELEMENT_NODE && e.textContent.trim().length == 0 && (e.children.length == 0 || e.children.length == e.getElementsByTagName("br").length + e.getElementsByTagName("hr").length)
        },
        _hasChildBlockElement: function(e) {
            return this._someNode(e.childNodes, function(n) {
                return this.DIV_TO_P_ELEMS.has(n.tagName) || this._hasChildBlockElement(n)
            })
        },
        _isPhrasingContent: function(e) {
            return e.nodeType === this.TEXT_NODE || this.PHRASING_ELEMS.indexOf(e.tagName) !== -1 || (e.tagName === "A" || e.tagName === "DEL" || e.tagName === "INS") && this._everyNode(e.childNodes, this._isPhrasingContent)
        },
        _isWhitespace: function(e) {
            return e.nodeType === this.TEXT_NODE && e.textContent.trim().length === 0 || e.nodeType === this.ELEMENT_NODE && e.tagName === "BR"
        },
        _getInnerText: function(e, n) {
            n = typeof n > "u" ? !0 : n;
            var i = e.textContent.trim();
            return n ? i.replace(this.REGEXPS.normalize, " ") : i
        },
        _getCharCount: function(e, n) {
            return n = n || ",", this._getInnerText(e).split(n).length - 1
        },
        _cleanStyles: function(e) {
            if (!(!e || e.tagName.toLowerCase() === "svg")) {
                for (var n = 0; n < this.PRESENTATIONAL_ATTRIBUTES.length; n++) e.removeAttribute(this.PRESENTATIONAL_ATTRIBUTES[n]);
                this.DEPRECATED_SIZE_ATTRIBUTE_ELEMS.indexOf(e.tagName) !== -1 && (e.removeAttribute("width"), e.removeAttribute("height"));
                for (var i = e.firstElementChild; i !== null;) this._cleanStyles(i), i = i.nextElementSibling
            }
        },
        _getLinkDensity: function(e) {
            var n = this._getInnerText(e).length;
            if (n === 0) return 0;
            var i = 0;
            return this._forEachNode(e.getElementsByTagName("a"), function(a) {
                var s = a.getAttribute("href"),
                    o = s && this.REGEXPS.hashUrl.test(s) ? .3 : 1;
                i += this._getInnerText(a).length * o
            }), i / n
        },
        _getClassWeight: function(e) {
            if (!this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) return 0;
            var n = 0;
            return typeof e.className == "string" && e.className !== "" && (this.REGEXPS.negative.test(e.className) && (n -= 25), this.REGEXPS.positive.test(e.className) && (n += 25)), typeof e.id == "string" && e.id !== "" && (this.REGEXPS.negative.test(e.id) && (n -= 25), this.REGEXPS.positive.test(e.id) && (n += 25)), n
        },
        _clean: function(e, n) {
            var i = ["object", "embed", "iframe"].indexOf(n) !== -1;
            this._removeNodes(this._getAllNodesWithTag(e, [n]), function(a) {
                if (i) {
                    for (var s = 0; s < a.attributes.length; s++)
                        if (this._allowedVideoRegex.test(a.attributes[s].value)) return !1;
                    if (a.tagName === "object" && this._allowedVideoRegex.test(a.innerHTML)) return !1
                }
                return !0
            })
        },
        _hasAncestorTag: function(e, n, i, a) {
            i = i || 3, n = n.toUpperCase();
            for (var s = 0; e.parentNode;) {
                if (i > 0 && s > i) return !1;
                if (e.parentNode.tagName === n && (!a || a(e.parentNode))) return !0;
                e = e.parentNode, s++
            }
            return !1
        },
        _getRowAndColumnCount: function(e) {
            for (var n = 0, i = 0, a = e.getElementsByTagName("tr"), s = 0; s < a.length; s++) {
                var o = a[s].getAttribute("rowspan") || 0;
                o && (o = parseInt(o, 10)), n += o || 1;
                for (var l = 0, c = a[s].getElementsByTagName("td"), h = 0; h < c.length; h++) {
                    var u = c[h].getAttribute("colspan") || 0;
                    u && (u = parseInt(u, 10)), l += u || 1
                }
                i = Math.max(i, l)
            }
            return {
                rows: n,
                columns: i
            }
        },
        _markDataTables: function(e) {
            for (var n = e.getElementsByTagName("table"), i = 0; i < n.length; i++) {
                var a = n[i],
                    s = a.getAttribute("role");
                if (s == "presentation") {
                    a._readabilityDataTable = !1;
                    continue
                }
                var o = a.getAttribute("datatable");
                if (o == "0") {
                    a._readabilityDataTable = !1;
                    continue
                }
                var l = a.getAttribute("summary");
                if (l) {
                    a._readabilityDataTable = !0;
                    continue
                }
                var c = a.getElementsByTagName("caption")[0];
                if (c && c.childNodes.length > 0) {
                    a._readabilityDataTable = !0;
                    continue
                }
                var h = ["col", "colgroup", "tfoot", "thead", "th"],
                    u = function(d) {
                        return !!a.getElementsByTagName(d)[0]
                    };
                if (h.some(u)) {
                    this.log("Data table because found data-y descendant"), a._readabilityDataTable = !0;
                    continue
                }
                if (a.getElementsByTagName("table")[0]) {
                    a._readabilityDataTable = !1;
                    continue
                }
                var f = this._getRowAndColumnCount(a);
                if (f.rows >= 10 || f.columns > 4) {
                    a._readabilityDataTable = !0;
                    continue
                }
                a._readabilityDataTable = f.rows * f.columns > 10
            }
        },
        _fixLazyImages: function(e) {
            this._forEachNode(this._getAllNodesWithTag(e, ["img", "picture", "figure"]), function(n) {
                if (n.src && this.REGEXPS.b64DataUrl.test(n.src)) {
                    var i = this.REGEXPS.b64DataUrl.exec(n.src);
                    if (i[1] === "image/svg+xml") return;
                    for (var a = !1, s = 0; s < n.attributes.length; s++) {
                        var o = n.attributes[s];
                        if (o.name !== "src" && /\.(jpg|jpeg|png|webp)/i.test(o.value)) {
                            a = !0;
                            break
                        }
                    }
                    if (a) {
                        var l = n.src.search(/base64\s*/i) + 7,
                            c = n.src.length - l;
                        c < 133 && n.removeAttribute("src")
                    }
                }
                if (!((n.src || n.srcset && n.srcset != "null") && n.className.toLowerCase().indexOf("lazy") === -1)) {
                    for (var h = 0; h < n.attributes.length; h++)
                        if (o = n.attributes[h], !(o.name === "src" || o.name === "srcset" || o.name === "alt")) {
                            var u = null;
                            if (/\.(jpg|jpeg|png|webp)\s+\d/.test(o.value) ? u = "srcset" : /^\s*\S+\.(jpg|jpeg|png|webp)\S*\s*$/.test(o.value) && (u = "src"), u) {
                                if (n.tagName === "IMG" || n.tagName === "PICTURE") n.setAttribute(u, o.value);
                                else if (n.tagName === "FIGURE" && !this._getAllNodesWithTag(n, ["img", "picture"]).length) {
                                    var f = this._doc.createElement("img");
                                    f.setAttribute(u, o.value), n.appendChild(f)
                                }
                            }
                        }
                }
            })
        },
        _getTextDensity: function(e, n) {
            var i = this._getInnerText(e, !0).length;
            if (i === 0) return 0;
            var a = 0,
                s = this._getAllNodesWithTag(e, n);
            return this._forEachNode(s, o => a += this._getInnerText(o, !0).length), a / i
        },
        _cleanConditionally: function(e, n) {
            this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY) && this._removeNodes(this._getAllNodesWithTag(e, [n]), function(i) {
                var a = function(m) {
                        return m._readabilityDataTable
                    },
                    s = n === "ul" || n === "ol";
                if (!s) {
                    var o = 0,
                        l = this._getAllNodesWithTag(i, ["ul", "ol"]);
                    this._forEachNode(l, m => o += this._getInnerText(m).length), s = o / this._getInnerText(i).length > .9
                }
                if (n === "table" && a(i) || this._hasAncestorTag(i, "table", -1, a) || this._hasAncestorTag(i, "code")) return !1;
                var c = this._getClassWeight(i);
                this.log("Cleaning Conditionally", i);
                var h = 0;
                if (c + h < 0) return !0;
                if (this._getCharCount(i, ",") < 10) {
                    for (var u = i.getElementsByTagName("p").length, f = i.getElementsByTagName("img").length, d = i.getElementsByTagName("li").length - 100, g = i.getElementsByTagName("input").length, y = this._getTextDensity(i, ["h1", "h2", "h3", "h4", "h5", "h6"]), _ = 0, w = this._getAllNodesWithTag(i, ["object", "embed", "iframe"]), k = 0; k < w.length; k++) {
                        for (var R = 0; R < w[k].attributes.length; R++)
                            if (this._allowedVideoRegex.test(w[k].attributes[R].value)) return !1;
                        if (w[k].tagName === "object" && this._allowedVideoRegex.test(w[k].innerHTML)) return !1;
                        _++
                    }
                    var I = this._getLinkDensity(i),
                        A = this._getInnerText(i).length,
                        p = f > 1 && u / f < .5 && !this._hasAncestorTag(i, "figure") || !s && d > u || g > Math.floor(u / 3) || !s && y < .9 && A < 25 && (f === 0 || f > 2) && !this._hasAncestorTag(i, "figure") || !s && c < 25 && I > .2 || c >= 25 && I > .5 || _ === 1 && A < 75 || _ > 1;
                    if (s && p) {
                        for (var b = 0; b < i.children.length; b++)
                            if (i.children[b].children.length > 1) return p;
                        let m = i.getElementsByTagName("li").length;
                        if (f == m) return !1
                    }
                    return p
                }
                return !1
            })
        },
        _cleanMatchedNodes: function(e, n) {
            for (var i = this._getNextNode(e, !0), a = this._getNextNode(e); a && a != i;) n.call(this, a, a.className + " " + a.id) ? a = this._removeAndGetNext(a) : a = this._getNextNode(a)
        },
        _cleanHeaders: function(e) {
            let n = this._getAllNodesWithTag(e, ["h1", "h2"]);
            this._removeNodes(n, function(i) {
                let a = this._getClassWeight(i) < 0;
                return a && this.log("Removing header with low class weight:", i), a
            })
        },
        _headerDuplicatesTitle: function(e) {
            if (e.tagName != "H1" && e.tagName != "H2") return !1;
            var n = this._getInnerText(e, !1);
            return this.log("Evaluating similarity of header:", n, this._articleTitle), this._textSimilarity(this._articleTitle, n) > .75
        },
        _flagIsActive: function(e) {
            return (this._flags & e) > 0
        },
        _removeFlag: function(e) {
            this._flags = this._flags & ~e
        },
        _isProbablyVisible: function(e) {
            return (!e.style || e.style.display != "none") && (!e.style || e.style.visibility != "hidden") && !e.hasAttribute("hidden") && (!e.hasAttribute("aria-hidden") || e.getAttribute("aria-hidden") != "true" || e.className && e.className.indexOf && e.className.indexOf("fallback-image") !== -1)
        },
        parse: function() {
            if (this._maxElemsToParse > 0) {
                var e = this._doc.getElementsByTagName("*").length;
                if (e > this._maxElemsToParse) throw new Error("Aborting parsing document; " + e + " elements found")
            }
            this._unwrapNoscriptImages(this._doc);
            var n = this._disableJSONLD ? {} : this._getJSONLD(this._doc);
            this._removeScripts(this._doc), this._prepDocument();
            var i = this._getArticleMetadata(n);
            this._articleTitle = i.title;
            var a = this._grabArticle();
            if (!a) return null;
            if (this.log("Grabbed: " + a.innerHTML), this._postProcessContent(a), !i.excerpt) {
                var s = a.getElementsByTagName("p");
                s.length > 0 && (i.excerpt = s[0].textContent.trim())
            }
            var o = a.textContent;
            return {
                title: this._articleTitle,
                byline: i.byline || this._articleByline,
                dir: this._articleDir,
                lang: this._articleLang,
                content: this._serializer(a),
                textContent: o,
                length: o.length,
                excerpt: i.excerpt,
                siteName: i.siteName || this._articleSiteName,
                publishedTime: i.publishedTime
            }
        }
    }, r.exports = t
})(We);
var ct = We.exports,
    Ge = {
        exports: {}
    };
(function(r) {
    var t = {
        unlikelyCandidates: /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,
        okMaybeItsACandidate: /and|article|body|column|content|main|shadow/i
    };

    function e(i) {
        return (!i.style || i.style.display != "none") && !i.hasAttribute("hidden") && (!i.hasAttribute("aria-hidden") || i.getAttribute("aria-hidden") != "true" || i.className && i.className.indexOf && i.className.indexOf("fallback-image") !== -1)
    }

    function n(i, a = {}) {
        typeof a == "function" && (a = {
            visibilityChecker: a
        });
        var s = {
            minScore: 20,
            minContentLength: 140,
            visibilityChecker: e
        };
        a = Object.assign(s, a);
        var o = i.querySelectorAll("p, pre, article"),
            l = i.querySelectorAll("div > br");
        if (l.length) {
            var c = new Set(o);
            [].forEach.call(l, function(u) {
                c.add(u.parentNode)
            }), o = Array.from(c)
        }
        var h = 0;
        return [].some.call(o, function(u) {
            if (!a.visibilityChecker(u)) return !1;
            var f = u.className + " " + u.id;
            if (t.unlikelyCandidates.test(f) && !t.okMaybeItsACandidate.test(f) || u.matches("li p")) return !1;
            var d = u.textContent.trim().length;
            return d < a.minContentLength ? !1 : (h += Math.sqrt(d - a.minContentLength), h > a.minScore)
        })
    }
    r.exports = n
})(Ge);
var ut = Ge.exports,
    ht = ct,
    ft = ut,
    dt = {
        Readability: ht,
        isProbablyReaderable: ft
    },
    Ae = /highlight-(?:text|source)-([a-z0-9]+)/;

function mt(r) {
    r.addRule("highlightedCodeBlock", {
        filter: function(t) {
            var e = t.firstChild;
            return t.nodeName === "DIV" && Ae.test(t.className) && e && e.nodeName === "PRE"
        },
        replacement: function(t, e, n) {
            var i = e.className || "",
                a = (i.match(Ae) || [null, ""])[1];
            return `

` + n.fence + a + `
` + e.firstChild.textContent + `
` + n.fence + `

`
        }
    })
}

function gt(r) {
    r.addRule("strikethrough", {
        filter: ["del", "s", "strike"],
        replacement: function(t) {
            return "~" + t + "~"
        }
    })
}
var pt = Array.prototype.indexOf,
    bt = Array.prototype.every,
    U = {};
U.tableCell = {
    filter: ["th", "td"],
    replacement: function(r, t) {
        return Ve(r, t)
    }
};
U.tableRow = {
    filter: "tr",
    replacement: function(r, t) {
        var e = "",
            n = {
                left: ":--",
                right: "--:",
                center: ":-:"
            };
        if (ge(t))
            for (var i = 0; i < t.childNodes.length; i++) {
                var a = "---",
                    s = (t.childNodes[i].getAttribute("align") || "").toLowerCase();
                s && (a = n[s] || a), e += Ve(a, t.childNodes[i])
            }
        return `
` + r + (e ? `
` + e : "")
    }
};
U.table = {
    filter: function(r) {
        return r.nodeName === "TABLE" && ge(r.rows[0])
    },
    replacement: function(r) {
        return r = r.replace(`

`, `
`), `

` + r + `

`
    }
};
U.tableSection = {
    filter: ["thead", "tbody", "tfoot"],
    replacement: function(r) {
        return r
    }
};

function ge(r) {
    var t = r.parentNode;
    return t.nodeName === "THEAD" || t.firstChild === r && (t.nodeName === "TABLE" || yt(t)) && bt.call(r.childNodes, function(e) {
        return e.nodeName === "TH"
    })
}

function yt(r) {
    var t = r.previousSibling;
    return r.nodeName === "TBODY" && (!t || t.nodeName === "THEAD" && /^\s*$/i.test(t.textContent))
}

function Ve(r, t) {
    var e = pt.call(t.parentNode.childNodes, t),
        n = " ";
    return e === 0 && (n = "| "), n + r + " |"
}

function vt(r) {
    r.keep(function(e) {
        return e.nodeName === "TABLE" && !ge(e.rows[0])
    });
    for (var t in U) r.addRule(t, U[t])
}

function Et(r) {
    r.addRule("taskListItems", {
        filter: function(t) {
            return t.type === "checkbox" && t.parentNode.nodeName === "LI"
        },
        replacement: function(t, e) {
            return (e.checked ? "[x]" : "[ ]") + " "
        }
    })
}

function _t(r) {
    r.use([mt, gt, vt, Et])
}
var wt = Object.defineProperty,
    kt = (r, t, e) => t in r ? wt(r, t, {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: e
    }) : r[t] = e,
    Se = (r, t, e) => kt(r, typeof t != "symbol" ? t + "" : t, e);

function Nt(r, t) {
    const e = new Intl.Segmenter("en", {
            granularity: "sentence"
        }),
        n = [];
    for (const b of e.segment(r)) {
        const m = b.segment.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
        m.length > 0 && n.push(m)
    }
    const i = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        s = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff]/.test(t) ? new RegExp(i, "ui") : new RegExp(`(?<!\\p{L})${i}(?!\\p{L})`, "ui"),
        o = [];
    n.forEach((b, m) => {
        s.test(b) && o.push(m)
    });
    const l = 20,
        c = [],
        h = [...o].sort((b, m) => b - m);
    if (h.length === 0) return c;
    const u = b => b.trim().split(/\s+/).length,
        f = b => {
            const m = b.trim();
            return m.length < 10 ? !0 : [/^\s*$/, /^[0-9]+\.\s*$/, /^[a-z]\)\s*$/, /^[•·▪▫]\s*$/].some(E => E.test(m))
        },
        d = b => {
            const m = b.trim();
            return [/^[A-Z][^.!?]*$/, /^[A-Z][A-Z\s]+$/, /^[A-Z][a-z\s]+[A-Z][a-z\s]*$/, /^[A-Z][a-z\s]+:$/].some(E => E.test(m))
        },
        g = b => {
            const m = b.trim();
            return m.length >= 10 && !f(m)
        },
        y = b => {
            const m = b.trim();
            return g(m) || d(m)
        },
        _ = (b, m) => {
            for (const v of m) {
                if (v === b) continue;
                const E = Math.max(0, v - 2),
                    N = Math.min(n.length - 1, v + 2);
                if (b >= E && b <= N) return !0
            }
            return !1
        },
        w = (b, m) => {
            let v = b,
                E = b,
                N = u(n[b] || "");
            for (; N < l && (v > 0 || E < n.length - 1);) {
                const H = v > 0,
                    W = E < n.length - 1;
                if (H && W) {
                    const M = n[v - 1] || "",
                        P = n[E + 1] || "",
                        X = f(M),
                        T = f(P);
                    if (X && T) {
                        if (v > 1) {
                            const x = n[v - 2] || "";
                            y(x) && !_(v - 2, m) && (v -= 2, N += u(x))
                        }
                        if (E < n.length - 2) {
                            const x = n[E + 2] || "";
                            y(x) && !_(E + 2, m) && (E += 2, N += u(x))
                        }
                        break
                    }
                    if (X) {
                        if (!T) E++, N += u(P);
                        else if (E < n.length - 2) {
                            const x = n[E + 2] || "";
                            y(x) && !_(E + 2, m) && (E += 2, N += u(x))
                        }
                        break
                    } else if (T) {
                        if (v--, N += u(M), v > 1) {
                            const x = n[v - 2] || "";
                            y(x) && !_(v - 2, m) && (v -= 2, N += u(x))
                        }
                        break
                    }
                    const Z = u(M),
                        G = u(P);
                    Z <= G ? (v--, N += Z) : (E++, N += G)
                } else if (H) {
                    const M = n[v - 1] || "";
                    if (f(M)) {
                        if (v > 1) {
                            const P = n[v - 2] || "";
                            y(P) && !_(v - 2, m) && (v -= 2, N += u(P))
                        }
                        break
                    }
                    v--, N += u(M)
                } else if (W) {
                    const M = n[E + 1] || "";
                    if (f(M)) {
                        if (E < n.length - 2) {
                            const P = n[E + 2] || "";
                            y(P) && !_(E + 2, m) && (E += 2, N += u(P))
                        }
                        break
                    }
                    E++, N += u(M)
                }
            }
            return {
                start: v,
                end: E
            }
        },
        k = h[0];
    if (k === void 0) return c;
    const R = w(k, h);
    let I = R.start,
        A = R.end;
    for (let b = 1; b < h.length; b++) {
        const m = h[b];
        if (m === void 0) continue;
        const v = w(m, h),
            E = v.start,
            N = v.end;
        if (E <= A + 1) A = N;
        else {
            const H = n.slice(I, A + 1).join(". ").replace(/\.\s*\./g, ".");
            c.push(H), I = E, A = N
        }
    }
    const p = n.slice(I, A + 1).join(". ").replace(/\.\s*\./g, ".");
    return c.push(p), c
}
const O = {
    INTERACTIVE_TAG_NAMES: new Set(["a", "button", "input", "textarea", "select", "option", "label", "details", "summary", "embed", "menu", "menuitem", "object"]),
    INTERACTIVE_ROLE_VALUES: new Set(["button", "tab", "link", "checkbox", "radio", "textbox", "combobox", "listbox", "option", "menuitem", "menuitemcheckbox", "menuitemradio", "switch", "slider", "splitbutton", "searchbox", "treeitem"]),
    CLICK_JS_ACTIONS: new Set(["click", "clickmod", "dblclick"]),
    ELEMENT_BLACKLIST: new Set(["html", "head", "body", "svg", "script", "style", "link", "meta"]),
    ARIA_INTERACTIVE_ATTRS: ["aria-expanded", "aria-pressed", "aria-selected", "aria-checked"],
    EVENT_HANDLER_ATTRS: ["onclick", "ng-click", "@click", "v-on:click"]
};
class Tt {
    hasClickJsaction(t) {
        if (!t) return !1;
        const e = t.replace(/,/g, ";").split(";");
        for (const n of e) {
            const i = n.trim();
            if (!i) continue;
            const a = i.indexOf(":"),
                s = a >= 0 ? i.slice(0, a).trim().toLowerCase() : i.toLowerCase();
            if (O.CLICK_JS_ACTIONS.has(s)) return !0
        }
        return !1
    }
    isDraggableEnabled(t, e) {
        if ((e == null ? void 0 : e.toLowerCase()) === "img" || t === void 0) return !1;
        const n = t.trim().toLowerCase();
        return n ? n !== "false" : !0
    }
    isContenteditableEnabled(t) {
        if (t === void 0) return !1;
        const e = t.trim().toLowerCase();
        return e ? e !== "false" && e !== "off" : !0
    }
    hasInteractiveRole(t) {
        if (!t) return !1;
        const e = t.split(/\s+/);
        for (const n of e) {
            const i = n.trim().toLowerCase();
            if (i && O.INTERACTIVE_ROLE_VALUES.has(i)) return !0
        }
        return !1
    }
    isInteractiveTag(t, e = {}) {
        const n = t.toLowerCase();
        return O.INTERACTIVE_TAG_NAMES.has(n) ? n === "input" ? (e.type || "").trim().toLowerCase() !== "hidden" : !0 : !1
    }
    hasAriaInteractiveAttrs(t) {
        for (const e of O.ARIA_INTERACTIVE_ATTRS)
            if (e in t) return !0;
        return !1
    }
    hasEventHandlerAttrs(t) {
        for (const e of O.EVENT_HANDLER_ATTRS)
            if (e in t) return !0;
        return !1
    }
    hasCustomInteractiveAttrs(t) {
        const e = t["data-action"];
        return e === "a-dropdown-select" || e === "a-dropdown-button"
    }
    shouldIncludeCandidate(t, e, n) {
        const i = t.toLowerCase();
        return O.ELEMENT_BLACKLIST.has(i) ? !1 : !!(e || this.hasClickJsaction(n.jsaction) || this.isDraggableEnabled(n.draggable, i) || this.isInteractiveTag(i, n) || this.hasInteractiveRole(n.role) || this.isContenteditableEnabled(n.contenteditable) || this.hasAriaInteractiveAttrs(n) || this.hasEventHandlerAttrs(n) || this.hasCustomInteractiveAttrs(n))
    }
    isElementClickable(t) {
        const e = t.tagName.toLowerCase();
        if (O.ELEMENT_BLACKLIST.has(e)) return {
            isClickable: !1,
            reason: "blacklist"
        };
        if (O.INTERACTIVE_TAG_NAMES.has(e)) return e === "input" && (t.getAttribute("type") || "").trim().toLowerCase() === "hidden" ? {
            isClickable: !1,
            reason: "hiddenInput"
        } : {
            isClickable: !0,
            reason: "tagName"
        };
        const n = t.getAttribute("jsaction");
        if (this.hasClickJsaction(n ?? void 0)) return {
            isClickable: !0,
            reason: "jsaction"
        };
        const i = t.getAttribute("role");
        if (this.hasInteractiveRole(i ?? void 0)) return {
            isClickable: !0,
            reason: "role"
        };
        const a = t.getAttribute("aria-role");
        if (this.hasInteractiveRole(a ?? void 0)) return {
            isClickable: !0,
            reason: "ariaRole"
        };
        const s = t.getAttribute("contenteditable");
        if (this.isContenteditableEnabled(s ?? void 0)) return {
            isClickable: !0,
            reason: "isEditable"
        };
        const o = t.getAttribute("data-action");
        if (o === "a-dropdown-select" || o === "a-dropdown-button") return {
            isClickable: !0,
            reason: "customInteractive"
        };
        if (t.onclick !== null || t.getAttribute("onclick") !== null || t.hasAttribute("ng-click") || t.hasAttribute("@click") || t.hasAttribute("v-on:click")) return {
            isClickable: !0,
            reason: "clickHandler"
        };
        if (t.hasAttribute("aria-expanded") || t.hasAttribute("aria-pressed") || t.hasAttribute("aria-selected") || t.hasAttribute("aria-checked")) return {
            isClickable: !0,
            reason: "ariaProps"
        };
        const h = e === "img";
        return (t.draggable || t.getAttribute("draggable") === "true") && !h ? {
            isClickable: !0,
            reason: "draggable"
        } : {
            isClickable: !1
        }
    }
}
const At = new Tt,
    St = {
        highlightColors: ["#FF0000", "#48BC00", "#0000FF", "#FFA500", "#800080", "#008080", "#FF69B4", "#4B0082", "#FF4500", "#2E8B57", "#DC143C", "#4682B4"]
    },
    ue = "playwright-highlight-container";
class Ct {
    removeHighlights() {
        try {
            const t = document.getElementById(ue);
            t && t.remove(), document.querySelectorAll('[browser-user-highlight-id^="playwright-highlight-"]').forEach(n => {
                n.removeAttribute("browser-user-highlight-id")
            })
        } catch (t) {
            console.error("Failed to remove highlights:", t)
        }
    }
    highlightElement(t, e, n = null) {
        if (!document.body) return console.error("Document.body not ready, cannot create highlight container"), e;
        let i = document.getElementById(ue);
        i || (i = document.createElement("div"), i.id = ue, i.style.position = "absolute", i.style.pointerEvents = "none", i.style.top = "0", i.style.left = "0", i.style.width = "100%", i.style.height = "100%", i.style.zIndex = "2147483647", document.body.appendChild(i));
        const a = St.highlightColors,
            s = e % a.length,
            o = a[s],
            l = `${o}1A`,
            c = document.createElement("div");
        c.style.position = "absolute", c.style.border = `2px solid ${o}`, c.style.backgroundColor = l, c.style.pointerEvents = "none", c.style.boxSizing = "border-box";
        const h = t.getBoundingClientRect();
        let u = h.top + window.scrollY,
            f = h.left + window.scrollX;
        if (n) {
            const k = n.getBoundingClientRect();
            u += k.top, f += k.left
        }
        c.style.top = `${u}px`, c.style.left = `${f}px`, c.style.width = `${h.width}px`, c.style.height = `${h.height}px`;
        const d = document.createElement("div");
        d.className = "playwright-highlight-label", d.style.position = "absolute", d.style.background = o, d.style.color = "white", d.style.padding = "1px 4px", d.style.borderRadius = "4px", d.style.fontSize = `${Math.min(12,Math.max(8,h.height/2))}px`, d.textContent = e.toString();
        const g = 20,
            y = 16;
        let _ = u + 2,
            w = f + h.width - g - 2;
        return (h.width < g + 4 || h.height < y + 4) && (_ = u - y - 2, w = f + h.width - g), d.style.top = `${_}px`, d.style.left = `${w}px`, i.appendChild(c), i.appendChild(d), t.setAttribute("browser-user-highlight-id", `playwright-highlight-${e}`), e + 1
    }
}

function xt(r) {
    return r instanceof HTMLElement
}

function Lt(r = 5e3) {
    return document.body ? Promise.resolve(!0) : new Promise(t => {
        const e = new MutationObserver(() => {
            document.body && (e.disconnect(), t(!0))
        });
        e.observe(document.documentElement, {
            childList: !0,
            subtree: !0
        }), setTimeout(() => {
            e.disconnect(), t(!1)
        }, r)
    })
}

function Ue(r, t, e = !1, n = !1) {
    const i = new TextEncoder,
        a = i.encode(r);
    if (a.length <= t) return r;
    const s = a.length - t,
        o = n ? `...${s} bytes truncated...` : "...";
    if (e) {
        let l = 0,
            c = r.length;
        for (; c > 0 && l < t;) c--, l += i.encode(r[c]).length;
        return l > t && c++, o + r.slice(c)
    } else {
        let l = 0,
            c = 0;
        for (; c < r.length && l < t;) l += i.encode(r[c]).length, c++;
        return l > t && c--, r.slice(0, c) + o
    }
}
const Rt = "data-manus_clickable",
    Y = "data-manus_click_id",
    It = .5,
    te = 1,
    Ce = 5,
    ne = 8,
    Mt = ne * ne;
class Pt {
    constructor() {
        Se(this, "highlightHelper", new Ct), Se(this, "clickableElements", {})
    }
    async refreshClickableElements(t = {}) {
        const e = {},
            n = t.useCdpMarkers;
        document.querySelectorAll(`[${Y}]`).forEach(d => {
            d.removeAttribute(Y)
        });
        let i;
        n ? i = this.findCdpMarkedElements() : i = this.findClickableElements(), i = this.filterOverlappingElements(i);
        const a = new Map;
        i.forEach(({
            element: d,
            rect: g
        }) => {
            a.set(d, g)
        });
        const s = [],
            o = new Set,
            l = d => {
                !d || !(d instanceof HTMLElement) || (a.has(d) && (s.push(d), o.add(d)), Array.from(d.children).forEach(g => {
                    l(g)
                }))
            },
            c = document.body ?? document.documentElement;
        c && l(c), i.forEach(({
            element: d
        }) => {
            o.has(d) || s.push(d)
        });
        const h = this.getViewportSnapshot(),
            u = d => {
                const g = d.right > 0 && d.left < h.width,
                    y = d.bottom > 0 && d.top < h.height;
                return g && y
            };
        let f = 1;
        return s.forEach(d => {
            const g = a.get(d);
            if (!g || g.width <= 0 || g.height <= 0 || !u(g)) return;
            const y = f;
            f += 1, d.setAttribute(Y, String(y));
            const {
                text: _,
                description: w
            } = Dt(d);
            e[y] = {
                element: d,
                index: y,
                text: _,
                description: w
            }
        }), this.clickableElements = e, e
    }
    async getVisibleClickableRects(t = {}) {
        await this.refreshClickableElements(t);
        const e = this.getViewportSnapshot(),
            n = [];
        for (const {
                element: i,
                index: a
            }
            of Object.values(this.clickableElements)) {
            if (!i.isConnected) continue;
            const s = i.getBoundingClientRect();
            if (!this.hasRenderableSize(s)) continue;
            const o = this.clipRectToViewport(s, e);
            if (!o || !this.isElementVisuallyVisible(i) || this.computeVisibilityRatio(i, o) < It) continue;
            const c = {
                index: a,
                bounds: [o.left, o.top, o.width, o.height],
                tagName: i.tagName.toLowerCase()
            };
            if (ze(i) && i instanceof HTMLInputElement) {
                const h = (i.getAttribute("type") || "text").toLowerCase();
                h && (c.inputType = h)
            }
            n.push(c)
        }
        return {
            elements: n,
            viewport: {
                width: e.width,
                height: e.height,
                devicePixelRatio: e.devicePixelRatio
            }
        }
    }
    findClickableElements() {
        const t = [],
            e = Array.from(document.querySelectorAll("*"));
        for (const n of e) {
            if (!xt(n) || O.ELEMENT_BLACKLIST.has(n.tagName.toLowerCase())) continue;
            const i = n.tagName.toLowerCase() === "img",
                {
                    isClickable: a
                } = At.isElementClickable(n);
            if (!a)
                if (i) {
                    if (n.offsetWidth < 28 || n.offsetHeight < 28) continue
                } else continue;
            if (!xe(n)) continue;
            const s = n.getBoundingClientRect();
            t.push({
                element: n,
                rect: s
            })
        }
        return t
    }
    findCdpMarkedElements() {
        const t = [],
            e = document.querySelectorAll(`[${Rt}]`);
        for (const n of e) {
            if (!xe(n)) continue;
            const i = n.getBoundingClientRect();
            t.push({
                element: n,
                rect: i
            })
        }
        return t
    }
    filterOverlappingElements(t) {
        if (t.length <= 1) return t;
        const e = new Set(t),
            n = .8;
        for (let i = 0; i < t.length; i++)
            for (let a = i + 1; a < t.length; a++) {
                const s = t[i],
                    o = t[a];
                if (!e.has(s) || !e.has(o) || Ht(s.rect, o.rect) < n) continue;
                const c = (Math.max(s.rect.left, o.rect.left) + Math.min(s.rect.right, o.rect.right)) / 2,
                    h = (Math.max(s.rect.top, o.rect.top) + Math.min(s.rect.bottom, o.rect.bottom)) / 2,
                    u = document.elementFromPoint(c, h);
                if (!u) continue;
                const f = s.element === u || s.element.contains(u),
                    d = o.element === u || o.element.contains(u);
                f && !d ? e.delete(o) : d && !f && e.delete(s)
            }
        return t.filter(i => e.has(i))
    }
    getCidSelector(t) {
        return t ? `[${Y}="${t}"]` : `[${Y}]`
    }
    getElementByCid(t) {
        return document.querySelector(this.getCidSelector(t))
    }
    findElementFromPoint(t, e) {
        return ie(t, e)
    }
    denormalizeCoordinates(t, e, n, i) {
        const a = window.innerWidth,
            s = window.innerHeight,
            o = n / t,
            l = i / e,
            c = Math.round(o * a),
            h = Math.round(l * s);
        return {
            x: c,
            y: h
        }
    }
    getViewportSnapshot() {
        const t = window.visualViewport;
        return {
            width: (t == null ? void 0 : t.width) ?? window.innerWidth,
            height: (t == null ? void 0 : t.height) ?? window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1
        }
    }
    hasRenderableSize(t) {
        return t.width > te && t.height > te
    }
    clipRectToViewport(t, e) {
        const n = Math.max(t.left, 0),
            i = Math.max(t.top, 0),
            a = Math.min(t.right, e.width),
            s = Math.min(t.bottom, e.height),
            o = a - n,
            l = s - i;
        return o <= te || l <= te ? null : {
            left: n,
            top: i,
            width: o,
            height: l
        }
    }
    isElementVisuallyVisible(t) {
        const e = window.getComputedStyle(t);
        if (e.display === "none" || e.visibility === "hidden" || e.visibility === "collapse") return !1;
        const n = Number.parseFloat(e.opacity || "1");
        return !Number.isNaN(n) && n <= 0 || e.pointerEvents === "none" ? !1 : !t.closest("[hidden], template")
    }
    computeVisibilityRatio(t, e) {
        const n = this.buildSamplePoints(e);
        if (!n.length) return 1;
        let i = 0;
        for (const a of n) this.isElementOnTopAtPoint(t, a.x, a.y) && (i += 1);
        return i / n.length
    }
    buildSamplePoints(t) {
        const e = Math.min(ne, Math.max(1, Math.round(t.width / Ce))),
            n = Math.min(ne, Math.max(1, Math.round(t.height / Ce))),
            i = t.width / e,
            a = t.height / n,
            s = [];
        for (let o = 0; o < n; o += 1)
            for (let l = 0; l < e; l += 1) {
                const c = t.left + i * (l + .5),
                    h = t.top + a * (o + .5);
                if (s.push({
                        x: c,
                        y: h
                    }), s.length >= Mt) return s
            }
        return s
    }
    isElementOnTopAtPoint(t, e, n) {
        const i = this.getTopElementAtPoint(e, n);
        return i ? i === t ? !0 : this.isDescendantOf(i, t) : !1
    }
    getTopElementAtPoint(t, e) {
        const n = document.elementFromPoint(t, e);
        return n ? n.shadowRoot && n.shadowRoot.elementFromPoint(t, e) || n : null
    }
    isDescendantOf(t, e) {
        if (t === e) return !0;
        const n = new Set;
        let i = t;
        for (; i && !n.has(i);) {
            if (i === e) return !0;
            if (n.add(i), i.parentElement) {
                i = i.parentElement;
                continue
            }
            const a = i.getRootNode();
            a instanceof ShadowRoot ? i = a.host : i = null
        }
        return !1
    }
}
const V = new Pt;

function ie(r, t, e, n) {
    const i = e ?? document,
        a = n ?? [],
        o = (i.elementsFromPoint ? i.elementsFromPoint(r, t) : [i.elementFromPoint(r, t)].filter(Boolean)).find(l => {
            if (!l || a.includes(l)) return !1;
            const c = l.id || "",
                h = typeof l.className == "string" ? l.className : "";
            return !c.includes("manus-action") && !h.includes("manus-action") && !c.includes("monica-action") && !h.includes("monica-action")
        }) || null;
    return o ? (a.push(o), o.shadowRoot ? ie(r, t, o.shadowRoot, a) : o) : null
}

function Dt(r) {
    var t;
    const e = r.tagName.toLowerCase(),
        n = 50;

    function i(f) {
        return Ue(Xe(f), n)
    }
    let a = r instanceof HTMLSelectElement ? Bt(r, 200) : i(r.innerText || r.textContent || "");
    const s = [];
    r.id && s.push(`domId:"${i(r.id)}"`);
    const o = r.title || r.ariaLabel || r.role;
    o && s.push(`hint:"${i(o)}"`);
    const l = ze(r);
    r instanceof HTMLInputElement && (r.type && s.push(`type:"${r.type}"`), r.placeholder && s.push(`placeholder:"${i(r.placeholder)}"`)), r instanceof HTMLTextAreaElement && r.placeholder && s.push(`placeholder:"${i(r.placeholder)}"`), r.getAttribute("contenteditable") === "true" && s.push('contenteditable:"true"');
    const c = (t = r.getAttribute("role")) == null ? void 0 : t.toLowerCase();
    if (c && ["textbox", "searchbox", "combobox"].includes(c) && s.push(`role:"${c}"`), r instanceof HTMLAnchorElement || r instanceof HTMLAreaElement) {
        const f = Ot(r);
        f && s.push(`link:"${f}"`)
    }
    if (l)
        if (r instanceof HTMLInputElement || r instanceof HTMLTextAreaElement) {
            const f = r instanceof HTMLInputElement && r.type === "submit" ? "submit" : "";
            a = i(r.value || f)
        } else {
            const f = r.textContent || r.getAttribute("placeholder") || "";
            f && (a = i(f))
        } const h = s.length ? `{${s.join(",")}}` : "{}",
        u = `${e} ${h}${a?` ${a}`:""}`.trim();
    return {
        text: a,
        description: u
    }
}

function Xe(r) {
    return r.replace(/\s+/g, " ").trim()
}

function Bt(r, t) {
    return Array.from(r.querySelectorAll("option")).slice(0, 20).map((n, i) => {
        const a = Xe(n.innerText || n.textContent || "");
        return `option#${i}:"${Ue(a,t)}"`
    }).join(", ")
}

function ze(r) {
    var t;
    if (r instanceof HTMLInputElement || r instanceof HTMLTextAreaElement || r.getAttribute("contenteditable") === "true") return !0;
    const e = (t = r.getAttribute("role")) == null ? void 0 : t.toLowerCase();
    return !!(e && ["textbox", "searchbox"].includes(e))
}

function Ot(r) {
    const t = r.getAttribute("href");
    if (!t) return null;
    const e = t.trim().toLowerCase();
    return e === "" || e.startsWith("#") || e.startsWith("javascript:") || e.startsWith("data:") || e.startsWith("blob:") ? null : t
}

function xe(r) {
    if (r.ownerDocument !== window.document) return !0;
    const e = r.getBoundingClientRect(),
        n = ie(e.left + e.width * .5, e.top + e.height * .5);
    if (n && (r.contains(n) || n.contains(r))) return !0;
    const i = [e.top + .1, e.bottom - .1],
        a = [e.left + .1, e.right - .1];
    for (const s of i)
        for (const o of a) {
            const l = ie(o, s);
            if (l && (r.contains(l) || l.contains(r))) return !0
        }
    return !1
}

function Ht(r, t) {
    const e = Math.max(r.left, t.left),
        n = Math.min(r.right, t.right),
        i = Math.max(r.top, t.top),
        a = Math.min(r.bottom, t.bottom);
    if (e >= n || i >= a) return 0;
    const s = (n - e) * (a - i),
        o = r.width * r.height,
        l = t.width * t.height,
        c = Math.min(o, l);
    return c > 0 ? s / c : 0
}
class Ft {
    inputText(t, e) {
        "value" in t ? this.inputToStandardElement(t, e) : this.inputToContentEditable(t, e), t.dispatchEvent(new Event("change", {
            bubbles: !0
        }))
    }
    isRichTextEditor(t) {
        return !!(Array.from(t.classList).some(n => n.includes("DraftEditor")) || t.hasAttribute("data-contents") || t.closest(".DraftEditor-root"))
    }
    inputToStandardElement(t, e) {
        var n;
        const i = (n = Object.getOwnPropertyDescriptor(t instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, "value")) == null ? void 0 : n.set;
        i ? i.call(t, e) : t.value = e, t.dispatchEvent(new Event("input", {
            bubbles: !0
        }))
    }
    inputToContentEditable(t, e) {
        t.focus();
        try {
            const n = window.getSelection();
            if (n) {
                const i = document.createRange();
                i.selectNodeContents(t), n.removeAllRanges(), n.addRange(i)
            }
        } catch {}
        this.isRichTextEditor(t) ? this.inputToRichTextEditor(t, e) : this.inputWithInputEvent(t, e)
    }
    inputToRichTextEditor(t, e) {
        t.textContent && document.execCommand("delete", !1), document.execCommand("insertText", !1, e) || this.inputWithInputEvent(t, e)
    }
    inputWithInputEvent(t, e) {
        t.textContent = e, t.dispatchEvent(new InputEvent("beforeinput", {
            bubbles: !0,
            cancelable: !0,
            inputType: "insertText",
            data: e
        })), t.dispatchEvent(new InputEvent("input", {
            bubbles: !0,
            cancelable: !1,
            inputType: "insertText",
            data: e
        }))
    }
}
const $t = new Ft,
    Wt = new Set(["ctrl", "control", "shift", "alt", "meta", "cmd", "command"]),
    Gt = {
        ...Object.fromEntries(Array.from({
            length: 26
        }, (r, t) => {
            const e = String.fromCharCode(97 + t);
            return [e, `Key${e.toUpperCase()}`]
        })),
        ...Object.fromEntries(Array.from({
            length: 10
        }, (r, t) => [String(t), `Digit${t}`])),
        ...Object.fromEntries(Array.from({
            length: 12
        }, (r, t) => [`f${t+1}`, `F${t+1}`])),
        enter: "Enter",
        return: "Enter",
        tab: "Tab",
        escape: "Escape",
        esc: "Escape",
        space: "Space",
        " ": "Space",
        backspace: "Backspace",
        delete: "Delete",
        del: "Delete",
        insert: "Insert",
        ins: "Insert",
        arrowup: "ArrowUp",
        arrowdown: "ArrowDown",
        arrowleft: "ArrowLeft",
        arrowright: "ArrowRight",
        up: "ArrowUp",
        down: "ArrowDown",
        left: "ArrowLeft",
        right: "ArrowRight",
        home: "Home",
        end: "End",
        pageup: "PageUp",
        pagedown: "PageDown",
        shift: "ShiftLeft",
        ctrl: "ControlLeft",
        control: "ControlLeft",
        alt: "AltLeft",
        meta: "MetaLeft",
        cmd: "MetaLeft",
        command: "MetaLeft",
        ",": "Comma",
        ".": "Period",
        "/": "Slash",
        "\\": "Backslash",
        "[": "BracketLeft",
        "]": "BracketRight",
        ";": "Semicolon",
        "'": "Quote",
        "`": "Backquote",
        "-": "Minus",
        "=": "Equal",
        numpad0: "Numpad0",
        numpad1: "Numpad1",
        numpad2: "Numpad2",
        numpad3: "Numpad3",
        numpad4: "Numpad4",
        numpad5: "Numpad5",
        numpad6: "Numpad6",
        numpad7: "Numpad7",
        numpad8: "Numpad8",
        numpad9: "Numpad9",
        numpadadd: "NumpadAdd",
        numpadsubtract: "NumpadSubtract",
        numpadmultiply: "NumpadMultiply",
        numpaddivide: "NumpadDivide",
        numpaddecimal: "NumpadDecimal",
        numpadenter: "NumpadEnter"
    },
    Vt = {
        ...Object.fromEntries(Array.from({
            length: 26
        }, (r, t) => [String.fromCharCode(97 + t), 65 + t])),
        ...Object.fromEntries(Array.from({
            length: 10
        }, (r, t) => [String(t), 48 + t])),
        ...Object.fromEntries(Array.from({
            length: 12
        }, (r, t) => [`f${t+1}`, 112 + t])),
        enter: 13,
        return: 13,
        tab: 9,
        escape: 27,
        esc: 27,
        space: 32,
        " ": 32,
        backspace: 8,
        delete: 46,
        del: 46,
        insert: 45,
        ins: 45,
        arrowup: 38,
        arrowdown: 40,
        arrowleft: 37,
        arrowright: 39,
        up: 38,
        down: 40,
        left: 37,
        right: 39,
        home: 36,
        end: 35,
        pageup: 33,
        pagedown: 34,
        shift: 16,
        ctrl: 17,
        control: 17,
        alt: 18,
        meta: 91,
        cmd: 91,
        command: 91,
        ",": 188,
        ".": 190,
        "/": 191,
        "\\": 220,
        "[": 219,
        "]": 221,
        ";": 186,
        "'": 222,
        "`": 192,
        "-": 189,
        "=": 187
    };

function Ut(r) {
    const t = r.toLowerCase();
    return Gt[t] ?? r
}

function Xt(r) {
    const t = r.toLowerCase();
    return Vt[t] ?? 0
}

function zt(r) {
    const t = r.split("+").map(n => n.trim()),
        e = {
            key: "",
            code: "",
            keyCode: 0,
            ctrlKey: !1,
            shiftKey: !1,
            altKey: !1,
            metaKey: !1
        };
    for (const n of t) {
        const i = n.toLowerCase();
        Wt.has(i) ? i === "ctrl" || i === "control" ? e.ctrlKey = !0 : i === "shift" ? e.shiftKey = !0 : i === "alt" ? e.altKey = !0 : (i === "meta" || i === "cmd" || i === "command") && (e.metaKey = !0) : (e.key = n.length === 1 ? n : Kt(i), e.code = Ut(n), e.keyCode = Xt(n))
    }
    return e
}

function Kt(r) {
    return r.charAt(0).toUpperCase() + r.slice(1)
}

function Yt(r, t) {
    const e = {
            key: t.key,
            code: t.code,
            keyCode: t.keyCode,
            which: t.keyCode,
            ctrlKey: t.ctrlKey,
            shiftKey: t.shiftKey,
            altKey: t.altKey,
            metaKey: t.metaKey,
            bubbles: !0,
            cancelable: !0,
            view: window
        },
        n = new KeyboardEvent("keydown", e);
    if (r.dispatchEvent(n), t.key.length === 1 && !t.ctrlKey && !t.metaKey) {
        const s = new KeyboardEvent("keypress", e);
        r.dispatchEvent(s)
    }
    const a = new KeyboardEvent("keyup", e);
    r.dispatchEvent(a)
}

function Le(r, t) {
    if (!r || !r.trim()) return {
        success: !1,
        error: "Key string cannot be empty"
    };
    const e = zt(r);
    if (!e.key) return {
        success: !1,
        error: `Failed to parse key string: "${r}"`
    };
    const n = t ?? document.activeElement ?? document.body;
    Yt(n, e);
    const i = [];
    return e.ctrlKey && i.push("Ctrl"), e.shiftKey && i.push("Shift"), e.altKey && i.push("Alt"), e.metaKey && i.push("Meta"), {
        success: !0,
        message: `Pressed key: ${i.length>0?`${i.join("+")}+${e.key}`:e.key}`,
        config: e
    }
}
const j = {
        MISSING_REQUIRED_PARAMS: "Container scroll requires direction, coordinateX, coordinateY, viewportWidth, and viewportHeight",
        POINT_SCROLL_FAILED: "Point scroll failed to execute",
        POINT_DID_NOT_SCROLL: "Point did not scroll",
        NO_TARGET_AT_POINT: "No element found at the specified coordinates",
        NO_SCROLLABLE_CONTAINER: "No scrollable container found at point"
    },
    jt = 500,
    qt = 10,
    Jt = 100,
    Zt = 2e3,
    Qt = 80;
class en {
    async pageScroll(t) {
        const {
            direction: e,
            toEnd: n
        } = t, i = this.getAxisFromDirection(e), a = Date.now(), s = this.findScrollableContainers(i, a), o = this.calculateMaxAvailableScroll(i, e, s), l = () => this.getScrollPositions(i, s), c = l(), h = ["Page scroll", "Fallback container scroll"], u = [() => this.scrollByWindow(i, e, n), () => this.scrollByElement(s[0], i, e, n)];
        let f = !1,
            d = -1;
        for (let _ = 0; _ < u.length; _++) {
            u[_]();
            const w = l();
            if (this.checkScrollSuccess(c, w, i, o).success) {
                f = !0, d = _;
                break
            }
        }
        const g = l(),
            y = this.calculateActualScrollDistance(c, g, i);
        return f ? {
            success: !0,
            message: `Scrolled ${e} by ${Math.round(y)}px with ${h[d]} strategy.`,
            data: {
                scrolled: !0,
                scrollDistance: y,
                strategy: h[d]
            }
        } : {
            success: !0,
            message: `Scroll ${e} attempted (no position change detected)`,
            data: {
                scrolled: !1,
                scrollDistance: 0
            }
        }
    }
    async containerScroll(t) {
        const {
            coordinateX: e,
            coordinateY: n,
            viewportWidth: i,
            viewportHeight: a,
            direction: s,
            toEnd: o
        } = t;
        if (e === void 0 || n === void 0 || i === void 0 || a === void 0) return {
            success: !1,
            error: j.MISSING_REQUIRED_PARAMS
        };
        const l = this.getAxisFromDirection(s),
            c = s === "up" || s === "left" ? -1 : 1,
            h = this.calculateScrollDelta(l),
            {
                x: u,
                y: f
            } = V.denormalizeCoordinates(i, a, e, n),
            d = document.elementFromPoint(u, f);
        if (!d) return {
            success: !1,
            error: j.NO_TARGET_AT_POINT
        };
        let g = d,
            y = 0;
        for (; g && y < Qt;) {
            if (!this.isScrollable(g, l)) {
                g = this.getParentElement(g), y++;
                continue
            }
            const w = this.getScrollPosition(g, l),
                k = this.getMaxScrollOffset(g, l),
                R = c < 0 ? w <= 1 : w >= k - 1,
                I = o ? c < 0 ? 0 : k : Math.min(Math.max(w + c * h, 0), k);
            try {
                this.scrollElementTo(g, l, I)
            } catch {
                return {
                    success: !1,
                    error: j.POINT_SCROLL_FAILED,
                    data: {
                        targetDescription: this.describeElement(g)
                    }
                }
            }
            const A = await this.waitForScrollSettle(g, w, l),
                p = Math.abs(A - w) > 1,
                b = c < 0 ? A <= 1 : A >= k - 1;
            return p ? {
                success: !0,
                message: `Scrolled container ${s} by ${Math.round(Math.abs(A-w))}px`,
                data: {
                    scrolled: !0,
                    targetDescription: this.describeElement(g),
                    path: this.buildPath(g),
                    before: w,
                    after: A,
                    atBoundary: b,
                    boundaryBefore: R,
                    maxOffset: k
                }
            } : {
                success: !1,
                error: j.POINT_DID_NOT_SCROLL,
                data: {
                    scrolled: !1,
                    targetDescription: this.describeElement(g),
                    path: this.buildPath(g),
                    before: w,
                    after: A,
                    atBoundary: b,
                    boundaryBefore: R,
                    maxOffset: k
                }
            }
        }
        return {
            success: !1,
            error: j.NO_SCROLLABLE_CONTAINER
        }
    }
    getAxisFromDirection(t) {
        return t === "left" || t === "right" ? "x" : "y"
    }
    calculateScrollDelta(t) {
        const e = t === "y" ? window.innerHeight : window.innerWidth;
        return Math.max(120, Math.round(e * .6))
    }
    findScrollableContainers(t, e) {
        const n = [];
        let i = 0;
        const a = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
            acceptNode: o => {
                const l = o;
                return l.tagName === "SCRIPT" || l.tagName === "STYLE" || l.tagName === "NOSCRIPT" ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
            }
        });
        let s = a.nextNode();
        for (; s && !(Date.now() - e > Zt || i >= jt || n.length >= qt);) {
            const o = s;
            i++, this.isScrollableContainer(o, t) && n.push(o), s = a.nextNode()
        }
        return n.sort((o, l) => l.clientWidth * l.clientHeight - o.clientWidth * o.clientHeight), n
    }
    isScrollableContainer(t, e) {
        const n = e === "y" ? t.clientHeight : t.clientWidth,
            i = e === "y" ? t.scrollHeight : t.scrollWidth;
        if (n < Jt || i <= n) return !1;
        const a = getComputedStyle(t);
        if (a.display === "none" || a.visibility === "hidden") return !1;
        const s = e === "y" ? a.overflowY : a.overflowX;
        return ["auto", "scroll", "overlay"].includes(s)
    }
    isScrollable(t, e) {
        if (!(t instanceof Element)) return !1;
        const n = e === "y" ? t.clientHeight : t.clientWidth;
        if (n === 0) return !1;
        const i = getComputedStyle(t);
        if (i.display === "none" || i.visibility === "hidden") return !1;
        const s = (e === "y" ? t.scrollHeight : t.scrollWidth) - n;
        return s > 1 && Number.isFinite(s)
    }
    calculateMaxAvailableScroll(t, e, n) {
        const i = t === "y" ? Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) : Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
            a = t === "y" ? window.innerHeight : window.innerWidth,
            s = t === "y" ? window.scrollY : window.scrollX,
            o = i - a - s,
            c = e === "down" || e === "right" ? o : s;
        let h = 0;
        if (n.length > 0) {
            const u = n[0],
                f = t === "y" ? u.scrollHeight : u.scrollWidth,
                d = t === "y" ? u.clientHeight : u.clientWidth,
                g = t === "y" ? u.scrollTop : u.scrollLeft,
                y = f - d - g;
            h = e === "down" || e === "right" ? y : g
        }
        return Math.max(c, h)
    }
    getScrollPositions(t, e) {
        return {
            windowPos: t === "y" ? window.scrollY : window.scrollX,
            containerPositions: e.map(n => t === "y" ? n.scrollTop : n.scrollLeft)
        }
    }
    getScrollPosition(t, e) {
        if (t === document.body || t === document.documentElement) {
            const i = e === "y" ? window.scrollY : window.scrollX;
            if (typeof i == "number" && Number.isFinite(i)) return i
        }
        const n = e === "y" ? t.scrollTop : t.scrollLeft;
        return typeof n == "number" && Number.isFinite(n) ? n : 0
    }
    getMaxScrollOffset(t, e) {
        const n = e === "y" ? t.scrollHeight : t.scrollWidth,
            i = e === "y" ? t.clientHeight : t.clientWidth;
        return Math.max(n - i, 0)
    }
    scrollByWindow(t, e, n) {
        const i = {
                behavior: "auto"
            },
            a = t === "y" ? window.innerHeight : window.innerWidth,
            s = t === "y" ? window.scrollY : window.scrollX;
        if (e === "up" || e === "left") {
            const o = n ? 0 : Math.max(s - a, 0);
            t === "y" ? i.top = o : i.left = o
        } else {
            const o = t === "y" ? Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) : Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
                l = n ? o : s + a;
            t === "y" ? i.top = l : i.left = l
        }
        window.scrollTo(i)
    }
    scrollByElement(t, e, n, i) {
        if (!t) return;
        const a = {
                behavior: "auto"
            },
            s = e === "y" ? t.clientHeight : t.clientWidth,
            o = e === "y" ? t.scrollTop : t.scrollLeft;
        if (n === "up" || n === "left") {
            const l = i ? 0 : Math.max(o - s, 0);
            e === "y" ? a.top = l : a.left = l
        } else {
            const l = e === "y" ? t.scrollHeight : t.scrollWidth,
                c = i ? l : o + s;
            e === "y" ? a.top = c : a.left = c
        }
        t.scrollTo(a)
    }
    scrollElementTo(t, e, n) {
        e === "y" ? typeof t.scrollTo == "function" ? t.scrollTo({
            top: n,
            behavior: "auto"
        }) : t.scrollTop = n : typeof t.scrollTo == "function" ? t.scrollTo({
            left: n,
            behavior: "auto"
        }) : t.scrollLeft = n
    }
    checkScrollSuccess(t, e, n, i) {
        const s = Math.min(200, i * .8),
            o = Math.abs(e.windowPos - t.windowPos);
        if (o >= s) return {
            success: !0,
            type: "window",
            delta: o
        };
        for (let l = 0; l < t.containerPositions.length; l++) {
            const c = Math.abs((e.containerPositions[l] ?? 0) - (t.containerPositions[l] ?? 0));
            if (c >= s) return {
                success: !0,
                type: "container",
                delta: c
            }
        }
        return {
            success: !1,
            type: "none",
            delta: 0
        }
    }
    calculateActualScrollDistance(t, e, n) {
        const i = Math.abs(e.windowPos - t.windowPos),
            a = Math.max(0, ...t.containerPositions.map((s, o) => Math.abs((e.containerPositions[o] ?? 0) - s)));
        return Math.max(i, a)
    }
    async waitForScrollSettle(t, e, n) {
        const i = this.getScrollPosition(t, n);
        if (Math.abs(i - e) > 1) return i;
        await new Promise(s => requestAnimationFrame(s));
        const a = this.getScrollPosition(t, n);
        return Math.abs(a - e) > 1 ? a : (await new Promise(s => setTimeout(s, 50)), this.getScrollPosition(t, n))
    }
    getParentElement(t) {
        const e = t.getRootNode ? t.getRootNode() : null;
        return e && typeof ShadowRoot < "u" && e instanceof ShadowRoot && e.host && t !== e.host ? e.host : t.parentElement
    }
    describeElement(t) {
        const e = t.tagName ? t.tagName.toLowerCase() : "element",
            n = t.id ? `#${t.id}` : "",
            i = (t.className || "").toString().trim().split(/\s+/).filter(Boolean).slice(0, 2),
            a = i.length ? `.${i.join(".")}` : "",
            s = t.getAttribute ? t.getAttribute("aria-label") : null,
            o = s ? `[aria-label="${s.slice(0,40)}"]` : "";
        return `${e}${n}${a}${o}`
    }
    buildPath(t) {
        const e = [];
        let n = t,
            i = 0;
        for (; n && i < 8 && n instanceof Element;) e.unshift(this.describeElement(n)), n = this.getParentElement(n), i++;
        return e.join(" > ")
    }
}
const Re = new en;
class tn {
    async execute(t) {
        switch (t.type) {
            case "browser_click":
                return this.executeClick(t.target);
            case "browser_input":
                return this.executeInput(t.target, t.text, t.pressEnter);
            case "browser_scroll":
                return this.executeScroll(t);
            case "browser_find_keyword":
                return this.executeFindKeyword(t.keyword);
            case "browser_press_key":
                return this.executeKeyboard(t.key);
            default:
                return {
                    success: !1, error: "Unsupported action type"
                }
        }
    }
    async resolveTarget(t) {
        switch (t.strategy) {
            case "bySelector":
                return document.querySelector(t.selector);
            case "byIndex": {
                const e = V.getElementByCid(t.index);
                return e || null
            }
            case "byCoordinates": {
                let e = t.coordinateX,
                    n = t.coordinateY;
                if (t.viewportWidth && t.viewportHeight) {
                    const i = V.denormalizeCoordinates(t.viewportWidth, t.viewportHeight, t.coordinateX, t.coordinateY);
                    e = i.x, n = i.y
                }
                return V.findElementFromPoint(e, n)
            }
            default:
                return null
        }
    }
    ensureInteractable(t) {
        return t instanceof HTMLElement
    }
    async executeClick(t) {
        const e = await this.resolveTarget(t);
        return this.ensureInteractable(e) ? (e.scrollIntoView({
            block: "center",
            inline: "center",
            behavior: "auto"
        }), e.dispatchEvent(new MouseEvent("click", {
            bubbles: !0,
            cancelable: !0,
            view: window
        })), {
            success: !0,
            message: "Click action executed",
            data: this.describeElement(e)
        }) : {
            success: !1,
            error: "Target element not found for click action."
        }
    }
    async executeInput(t, e, n = !1) {
        const i = await this.resolveTarget(t);
        return this.ensureInteractable(i) ? ($t.inputText(i, e), n && Le("Enter", i), {
            success: !0,
            message: "Input action executed",
            data: {
                textLength: e.length
            }
        }) : {
            success: !1,
            error: "Target element not found for input action."
        }
    }
    async executeScroll(t) {
        const {
            direction: e,
            toEnd: n,
            target: i,
            coordinateX: a,
            coordinateY: s,
            viewportWidth: o,
            viewportHeight: l
        } = t;
        if (i === "container") {
            if (a === void 0 || s === void 0 || o === void 0 || l === void 0) return {
                success: !1,
                error: "Container scroll requires coordinateX, coordinateY, viewportWidth, and viewportHeight"
            };
            const h = await Re.containerScroll({
                coordinateX: a,
                coordinateY: s,
                viewportWidth: o,
                viewportHeight: l,
                direction: e,
                toEnd: n
            });
            return {
                success: h.success,
                message: h.message,
                error: h.error,
                data: h.data
            }
        }
        const c = await Re.pageScroll({
            direction: e,
            toEnd: n
        });
        return {
            success: c.success,
            message: c.message,
            error: c.error,
            data: c.data
        }
    }
    async executeFindKeyword(t) {
        try {
            const e = t.trim();
            if (!e) return {
                success: !1,
                error: "Keyword cannot be empty"
            };
            const n = Nt(document.body.innerText, e);
            if (!n || n.length === 0) return {
                success: !1,
                error: `No text found containing "${e}" on the current page`
            };
            const i = n.length;
            return {
                success: !0,
                message: [`Attempted to find keyword, found ${i} occurrences of "${e}"`, "[Search results]", ...n].join(`
`),
                data: {
                    results: n,
                    totalMatches: i
                }
            }
        } catch (e) {
            return {
                success: !1,
                error: e instanceof Error ? e.message : String(e)
            }
        }
    }
    executeKeyboard(t) {
        return Le(t)
    }
    describeElement(t) {
        const e = t.getBoundingClientRect();
        return {
            tag: t.tagName,
            id: t.id,
            classes: Array.from(t.classList),
            textContent: t.textContent,
            rect: {
                top: e.top,
                left: e.left,
                width: e.width,
                height: e.height
            }
        }
    }
}

function nn(r) {
    for (var t = 1; t < arguments.length; t++) {
        var e = arguments[t];
        for (var n in e) Object.hasOwn(e, n) && (r[n] = e[n])
    }
    return r
}

function me(r, t) {
    return Array(t + 1).join(r)
}

function rn(r) {
    return r.replace(/^\n*/, "")
}

function an(r) {
    for (var t = r.length; t > 0 && r[t - 1] === `
`;) t--;
    return r.substring(0, t)
}
var sn = ["ADDRESS", "ARTICLE", "ASIDE", "AUDIO", "BLOCKQUOTE", "BODY", "CANVAS", "CENTER", "DD", "DIR", "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "FRAMESET", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HGROUP", "HR", "HTML", "ISINDEX", "LI", "MAIN", "MENU", "NAV", "NOFRAMES", "NOSCRIPT", "OL", "OUTPUT", "P", "PRE", "SECTION", "TABLE", "TBODY", "TD", "TFOOT", "TH", "THEAD", "TR", "UL"];

function pe(r) {
    return be(r, sn)
}
var Ke = ["AREA", "BASE", "BR", "COL", "COMMAND", "EMBED", "HR", "IMG", "INPUT", "KEYGEN", "LINK", "META", "PARAM", "SOURCE", "TRACK", "WBR"];

function Ye(r) {
    return be(r, Ke)
}

function on(r) {
    return qe(r, Ke)
}
var je = ["A", "TABLE", "THEAD", "TBODY", "TFOOT", "TH", "TD", "IFRAME", "SCRIPT", "AUDIO", "VIDEO"];

function ln(r) {
    return be(r, je)
}

function cn(r) {
    return qe(r, je)
}

function be(r, t) {
    return t.indexOf(r.nodeName) >= 0
}

function qe(r, t) {
    return r.getElementsByTagName && t.some(e => r.getElementsByTagName(e).length)
}
var L = {};
L.paragraph = {
    filter: "p",
    replacement: r => `

` + r + `

`
};
L.lineBreak = {
    filter: "br",
    replacement: (r, t, e) => e.br + `
`
};
L.heading = {
    filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
    replacement: (r, t, e) => {
        var n = Number(t.nodeName.charAt(1));
        if (e.headingStyle === "setext" && n < 3) {
            var i = me(n === 1 ? "=" : "-", r.length);
            return `

` + r + `
` + i + `

`
        } else return `

` + me("#", n) + " " + r + `

`
    }
};
L.blockquote = {
    filter: "blockquote",
    replacement: r => (r = r.replace(/^\n+|\n+$/g, ""), r = r.replace(/^/gm, "> "), `

` + r + `

`)
};
L.list = {
    filter: ["ul", "ol"],
    replacement: (r, t) => {
        var e = t.parentNode;
        return e.nodeName === "LI" && e.lastElementChild === t ? `
` + r : `

` + r + `

`
    }
};
L.listItem = {
    filter: "li",
    replacement: (r, t, e) => {
        r = r.replace(/^\n+/, "").replace(/\n+$/, `
`).replace(/\n/gm, `
    `);
        var n = e.bulletListMarker + "   ",
            i = t.parentNode;
        if (i.nodeName === "OL") {
            var a = i.getAttribute("start"),
                s = Array.prototype.indexOf.call(i.children, t);
            n = (a ? Number(a) + s : s + 1) + ".  "
        }
        return n + r + (t.nextSibling && !/\n$/.test(r) ? `
` : "")
    }
};
L.indentedCodeBlock = {
    filter: (r, t) => t.codeBlockStyle === "indented" && r.nodeName === "PRE" && r.firstChild && r.firstChild.nodeName === "CODE",
    replacement: (r, t, e) => `

    ` + t.firstChild.textContent.replace(/\n/g, `
    `) + `

`
};
L.fencedCodeBlock = {
    filter: (r, t) => t.codeBlockStyle === "fenced" && r.nodeName === "PRE" && r.firstChild && r.firstChild.nodeName === "CODE",
    replacement: (r, t, e) => {
        for (var n = t.firstChild.getAttribute("class") || "", i = (n.match(/language-(\S+)/) || [null, ""])[1], a = t.firstChild.textContent, s = e.fence.charAt(0), o = 3, l = new RegExp("^" + s + "{3,}", "gm"), c; c = l.exec(a);) c[0].length >= o && (o = c[0].length + 1);
        var h = me(s, o);
        return `

` + h + i + `
` + a.replace(/\n$/, "") + `
` + h + `

`
    }
};
L.horizontalRule = {
    filter: "hr",
    replacement: (r, t, e) => `

` + e.hr + `

`
};
L.inlineLink = {
    filter: (r, t) => t.linkStyle === "inlined" && r.nodeName === "A" && r.getAttribute("href"),
    replacement: (r, t) => {
        var e = t.getAttribute("href");
        e && (e = e.replace(/([()])/g, "\\$1"));
        var n = re(t.getAttribute("title"));
        return n && (n = ' "' + n.replace(/"/g, '\\"') + '"'), "[" + r + "](" + e + n + ")"
    }
};
L.referenceLink = {
    filter: (r, t) => t.linkStyle === "referenced" && r.nodeName === "A" && r.getAttribute("href"),
    replacement: function(r, t, e) {
        var n = t.getAttribute("href"),
            i = re(t.getAttribute("title"));
        i && (i = ' "' + i + '"');
        var a, s;
        switch (e.linkReferenceStyle) {
            case "collapsed":
                a = "[" + r + "][]", s = "[" + r + "]: " + n + i;
                break;
            case "shortcut":
                a = "[" + r + "]", s = "[" + r + "]: " + n + i;
                break;
            default: {
                var o = this.references.length + 1;
                a = "[" + r + "][" + o + "]", s = "[" + o + "]: " + n + i
            }
        }
        return this.references.push(s), a
    },
    references: [],
    append: function(r) {
        var t = "";
        return this.references.length && (t = `

` + this.references.join(`
`) + `

`, this.references = []), t
    }
};
L.emphasis = {
    filter: ["em", "i"],
    replacement: (r, t, e) => r.trim() ? e.emDelimiter + r + e.emDelimiter : ""
};
L.strong = {
    filter: ["strong", "b"],
    replacement: (r, t, e) => r.trim() ? e.strongDelimiter + r + e.strongDelimiter : ""
};
L.code = {
    filter: r => {
        var t = r.previousSibling || r.nextSibling,
            e = r.parentNode.nodeName === "PRE" && !t;
        return r.nodeName === "CODE" && !e
    },
    replacement: r => {
        if (!r) return "";
        r = r.replace(/\r?\n|\r/g, " ");
        for (var t = /^`|^ .*?[^ ].* $|`$/.test(r) ? " " : "", e = "`", n = r.match(/`+/gm) || []; n.indexOf(e) !== -1;) e = e + "`";
        return e + t + r + t + e
    }
};
L.image = {
    filter: "img",
    replacement: (r, t) => {
        var e = re(t.getAttribute("alt")),
            n = t.getAttribute("src") || "",
            i = re(t.getAttribute("title")),
            a = i ? ' "' + i + '"' : "";
        return n ? "![" + e + "](" + n + a + ")" : ""
    }
};

function re(r) {
    return r ? r.replace(/(\n+\s*)+/g, `
`) : ""
}

function Je(r) {
    this.options = r, this._keep = [], this._remove = [], this.blankRule = {
        replacement: r.blankReplacement
    }, this.keepReplacement = r.keepReplacement, this.defaultRule = {
        replacement: r.defaultReplacement
    }, this.array = [];
    for (var t in r.rules) this.array.push(r.rules[t])
}
Je.prototype = {
    add: function(r, t) {
        this.array.unshift(t)
    },
    keep: function(r) {
        this._keep.unshift({
            filter: r,
            replacement: this.keepReplacement
        })
    },
    remove: function(r) {
        this._remove.unshift({
            filter: r,
            replacement: () => ""
        })
    },
    forNode: function(r) {
        if (r.isBlank) return this.blankRule;
        var t;
        return (t = he(this.array, r, this.options)) || (t = he(this._keep, r, this.options)) || (t = he(this._remove, r, this.options)) ? t : this.defaultRule
    },
    forEach: function(r) {
        for (var t = 0; t < this.array.length; t++) r(this.array[t], t)
    }
};

function he(r, t, e) {
    for (var n = 0; n < r.length; n++) {
        var i = r[n];
        if (un(i, t, e)) return i
    }
}

function un(r, t, e) {
    var n = r.filter;
    if (typeof n == "string") {
        if (n === t.nodeName.toLowerCase()) return !0
    } else if (Array.isArray(n)) {
        if (n.indexOf(t.nodeName.toLowerCase()) > -1) return !0
    } else if (typeof n == "function") {
        if (n.call(r, t, e)) return !0
    } else throw new TypeError("`filter` needs to be a string, array, or function")
}

function hn(r) {
    var t = r.element,
        e = r.isBlock,
        n = r.isVoid,
        i = r.isPre || (u => u.nodeName === "PRE");
    if (!(!t.firstChild || i(t))) {
        for (var a = null, s = !1, o = null, l = Ie(o, t, i); l !== t;) {
            if (l.nodeType === 3 || l.nodeType === 4) {
                var c = l.data.replace(/[ \r\n\t]+/g, " ");
                if ((!a || / $/.test(a.data)) && !s && c[0] === " " && (c = c.substr(1)), !c) {
                    l = fe(l);
                    continue
                }
                l.data = c, a = l
            } else if (l.nodeType === 1) e(l) || l.nodeName === "BR" ? (a && (a.data = a.data.replace(/ $/, "")), a = null, s = !1) : n(l) || i(l) ? (a = null, s = !0) : a && (s = !1);
            else {
                l = fe(l);
                continue
            }
            var h = Ie(o, l, i);
            o = l, l = h
        }
        a && (a.data = a.data.replace(/ $/, ""), a.data || fe(a))
    }
}

function fe(r) {
    var t = r.nextSibling || r.parentNode;
    return r.parentNode.removeChild(r), t
}

function Ie(r, t, e) {
    return r && r.parentNode === t || e(t) ? t.nextSibling || t.parentNode : t.firstChild || t.nextSibling || t.parentNode
}
var ye = typeof window < "u" ? window : {};

function fn() {
    var r = ye.DOMParser,
        t = !1;
    try {
        new r().parseFromString("", "text/html") && (t = !0)
    } catch {}
    return t
}

function dn() {
    var r = () => {};
    return mn() ? r.prototype.parseFromString = t => {
        var e = new window.ActiveXObject("htmlfile");
        return e.designMode = "on", e.open(), e.write(t), e.close(), e
    } : r.prototype.parseFromString = t => {
        var e = document.implementation.createHTMLDocument("");
        return e.open(), e.write(t), e.close(), e
    }, r
}

function mn() {
    var r = !1;
    try {
        document.implementation.createHTMLDocument("").open()
    } catch {
        ye.ActiveXObject && (r = !0)
    }
    return r
}
var gn = fn() ? ye.DOMParser : dn();

function pn(r, t) {
    var e;
    if (typeof r == "string") {
        var n = bn().parseFromString('<x-turndown id="turndown-root">' + r + "</x-turndown>", "text/html");
        e = n.getElementById("turndown-root")
    } else e = r;
    return hn({
        element: e,
        isBlock: pe,
        isVoid: Ye,
        isPre: t.preformattedCode ? yn : null
    }), e
}
var de;

function bn() {
    return de = de || new gn, de
}

function yn(r) {
    return r.nodeName === "PRE" || r.nodeName === "CODE"
}

function vn(r, t) {
    return r.isBlock = pe(r), r.isCode = r.nodeName === "CODE" || r.parentNode.isCode, r.isBlank = En(r), r.flankingWhitespace = _n(r, t), r
}

function En(r) {
    return !Ye(r) && !ln(r) && /^\s*$/i.test(r.textContent) && !on(r) && !cn(r)
}

function _n(r, t) {
    if (r.isBlock || t.preformattedCode && r.isCode) return {
        leading: "",
        trailing: ""
    };
    var e = wn(r.textContent);
    return e.leadingAscii && Me("left", r, t) && (e.leading = e.leadingNonAscii), e.trailingAscii && Me("right", r, t) && (e.trailing = e.trailingNonAscii), {
        leading: e.leading,
        trailing: e.trailing
    }
}

function wn(r) {
    var t = r.match(/^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/);
    return {
        leading: t[1],
        leadingAscii: t[2],
        leadingNonAscii: t[3],
        trailing: t[4],
        trailingNonAscii: t[5],
        trailingAscii: t[6]
    }
}

function Me(r, t, e) {
    var n, i, a;
    return r === "left" ? (n = t.previousSibling, i = / $/) : (n = t.nextSibling, i = /^ /), n && (n.nodeType === 3 ? a = i.test(n.nodeValue) : e.preformattedCode && n.nodeName === "CODE" ? a = !1 : n.nodeType === 1 && !pe(n) && (a = i.test(n.textContent))), a
}
var kn = Array.prototype.reduce,
    Nn = [
        [/\\/g, "\\\\"],
        [/\*/g, "\\*"],
        [/^-/g, "\\-"],
        [/^\+ /g, "\\+ "],
        [/^(=+)/g, "\\$1"],
        [/^(#{1,6}) /g, "\\$1 "],
        [/`/g, "\\`"],
        [/^~~~/g, "\\~~~"],
        [/\[/g, "\\["],
        [/\]/g, "\\]"],
        [/^>/g, "\\>"],
        [/_/g, "\\_"],
        [/^(\d+)\. /g, "$1\\. "]
    ];

function ae(r) {
    if (!(this instanceof ae)) return new ae(r);
    var t = {
        rules: L,
        headingStyle: "setext",
        hr: "* * *",
        bulletListMarker: "*",
        codeBlockStyle: "indented",
        fence: "```",
        emDelimiter: "_",
        strongDelimiter: "**",
        linkStyle: "inlined",
        linkReferenceStyle: "full",
        br: "  ",
        preformattedCode: !1,
        blankReplacement: (e, n) => n.isBlock ? `

` : "",
        keepReplacement: (e, n) => n.isBlock ? `

` + n.outerHTML + `

` : n.outerHTML,
        defaultReplacement: (e, n) => n.isBlock ? `

` + e + `

` : e
    };
    this.options = nn({}, t, r), this.rules = new Je(this.options)
}
ae.prototype = {
    turndown: function(r) {
        if (!Sn(r)) throw new TypeError(r + " is not a string, or an element/document/fragment node.");
        if (r === "") return "";
        var t = Ze.call(this, new pn(r, this.options));
        return Tn.call(this, t)
    },
    use: function(r) {
        if (Array.isArray(r))
            for (var t = 0; t < r.length; t++) this.use(r[t]);
        else if (typeof r == "function") r(this);
        else throw new TypeError("plugin must be a Function or an Array of Functions");
        return this
    },
    addRule: function(r, t) {
        return this.rules.add(r, t), this
    },
    keep: function(r) {
        return this.rules.keep(r), this
    },
    remove: function(r) {
        return this.rules.remove(r), this
    },
    escape: r => Nn.reduce((t, e) => t.replace(e[0], e[1]), r)
};

function Ze(r) {
    return kn.call(r.childNodes, (t, e) => {
        e = new vn(e, this.options);
        var n = "";
        return e.nodeType === 3 ? n = e.isCode ? e.nodeValue : this.escape(e.nodeValue) : e.nodeType === 1 && (n = An.call(this, e)), Qe(t, n)
    }, "")
}

function Tn(r) {
    return this.rules.forEach(t => {
        typeof t.append == "function" && (r = Qe(r, t.append(this.options)))
    }), r.replace(/^[\t\r\n]+/, "").replace(/[\t\r\n\s]+$/, "")
}

function An(r) {
    var t = this.rules.forNode(r),
        e = Ze.call(this, r),
        n = r.flankingWhitespace;
    return (n.leading || n.trailing) && (e = e.trim()), n.leading + t.replacement(e, r, this.options) + n.trailing
}

function Qe(r, t) {
    var e = an(r),
        n = rn(t),
        i = Math.max(r.length - e.length, t.length - n.length),
        a = `

`.substring(0, i);
    return e + a + n
}

function Sn(r) {
    return r != null && (typeof r == "string" || r.nodeType && (r.nodeType === 1 || r.nodeType === 9 || r.nodeType === 11))
}

function Cn(r) {
    return new ae(r)
}
const Pe = .75,
    De = 800,
    Be = 500,
    xn = 1.2,
    Ln = .5,
    Rn = 7,
    In = .01,
    Mn = 3,
    q = {
        skip: Symbol("skip")
    },
    Pn = ["script", "style", "noscript", "iframe", "object", "embed", "link", "meta", "aside", "nav", "footer", "header"],
    Dn = /article|blog|body|content|entry|main|news|pag(?:e|ination)|post|story/i,
    Bn = /com(?:bx|ment|-)|contact|foot(?:er|note)?|media|promo|related|scroll|sidebar|sponsor|shopping|tags|tool|widget|nav(?:igation)?|menu|button|header|tab|toolbar|controls|action/i,
    Oe = /[,，][\s,，]*/g,
    et = /(?:^|\s)(hidden$|^hidden\s|display-none|invisible|visually-hidden|hide$|^hide\s|d-none|none$|^none\s)/i;

function He() {
    var r, t;
    try {
        if (!((t = (r = window.originalNodePrototypes) == null ? void 0 : r.Node) != null && t.cloneNode)) return Fe();
        const e = Node.prototype.cloneNode;
        Node.prototype.cloneNode = window.originalNodePrototypes.Node.cloneNode;
        const n = document.cloneNode(!0);
        Node.prototype.cloneNode = e, zn(document, n);
        const i = Hn(n),
            a = Un(),
            s = tt(n.body),
            o = On(i, s);
        if (o < Pe && s.length < De || s.length < Be) {
            const c = Yn(n);
            if (c.markdown.length > s.length * xn) return c;
            if (s.length < Be) return {
                title: a,
                markdown: "(No article found, please use visual navigation.)"
            }
        } else if (o >= Pe && s.length < De) return {
            title: a,
            markdown: "(No article found, please use visual navigation.)"
        };
        return {
            title: a,
            markdown: s
        }
    } catch {
        return Fe()
    }
}

function On(r, t) {
    let e = .5;
    const n = Math.min(t.length / 1e4, 1) * .2;
    e += n;
    const i = (1 - Math.min(r.linkDensity, .5) * 2) * .15;
    e += i;
    const a = Math.min(r.commas / 50, 1) * .1;
    e += a;
    const s = Math.min(Math.max(r.score, 0) / 100, 1) * .15;
    e += s;
    const o = t.split(`

`).filter(h => h.trim().length > 0),
        l = Math.min(o.length / 10, 1) * .1;
    e += l;
    const c = document.title && t.includes(document.title) ? .05 : 0;
    return e += c, e = Math.max(0, Math.min(e, 1)), Number.parseFloat(e.toFixed(2))
}

function Hn(r) {
    const t = e => {
        var n;
        if (!Xn(e)) return e.nodeType === Node.TEXT_NODE ? (((n = e.textContent) == null ? void 0 : n.trim()) || "").length === 0 ? (e[q.skip] = !0, J()) : $n(e) : (e[q.skip] = !0, J());
        const i = e,
            a = i.tagName.toLowerCase();
        if (Pn.includes(a)) return i[q.skip] = !0, J();
        const s = [];
        if (i.childNodes)
            for (let l = 0; l < i.childNodes.length; l++) {
                const c = t(i.childNodes[l]);
                s.push(c)
            }
        const o = Fn(i, s);
        return Wn(i, o) ? (i[q.skip] = !0, J()) : o
    };
    return t(r.body)
}

function Fn(r, t) {
    const e = r.tagName.toLowerCase();
    let n = 0,
        i = 0,
        a = 0;
    for (const f of t) n += f.plainLength, i += f.linkLength, a += f.commas;
    e === "a" && (i += n, n = 0);
    const s = n + i,
        o = s > 0 ? i / s : 0,
        l = Math.min(Rn, a * Ln) + Math.min(Mn, Math.floor((n + i) * In)),
        c = Gn(r),
        h = Vn(e),
        u = c + h + l;
    return {
        plainLength: n,
        linkLength: i,
        totalLength: s,
        linkDensity: o,
        commas: a,
        score: u
    }
}

function $n(r) {
    var t;
    const e = ((t = r.textContent) == null ? void 0 : t.trim()) || "";
    if (!e) return J();
    const i = new TextEncoder().encode(e).length,
        a = e.length,
        s = i > a * 2.5 ? a * 2 : a;
    let o = 0;
    return Oe.test(e) && (o = e.split(Oe).length - 1), {
        plainLength: s,
        linkLength: 0,
        totalLength: s,
        linkDensity: 0,
        commas: o,
        score: 0
    }
}

function J() {
    return {
        plainLength: 0,
        linkLength: 0,
        totalLength: 0,
        linkDensity: 0,
        commas: 0,
        score: 0
    }
}

function Wn(r, t) {
    const e = r.tagName.toLowerCase();
    if (Kn(r)) return !0;
    if (e === "img") {
        const i = Number.parseInt(r.getAttribute("width") || "0", 10),
            a = Number.parseInt(r.getAttribute("height") || "0", 10);
        if (i > 0 && i <= 32 || a > 0 && a <= 32) return !0
    }
    return !!(t.score < -35 || t.totalLength === 0 || ["div", "p", "section", "article"].includes(e) && t.linkDensity > .8)
}

function Gn(r) {
    var t, e;
    let n = 0;
    const i = ((t = r.getAttribute("id")) == null ? void 0 : t.toLowerCase()) || "",
        a = ((e = r.getAttribute("class")) == null ? void 0 : e.toLowerCase()) || "",
        s = `${i} ${a}`.trim();
    return s && (Dn.test(s) && (n += 35), Bn.test(s) && (n -= 35), et.test(s) && (n -= 40)), n
}

function Vn(r) {
    let t = 0;
    switch (r) {
        case "article":
            t += 35;
            break;
        case "section":
            t += 20;
            break;
        case "main":
            t += 25;
            break;
        case "div":
            t += 5;
            break;
        case "p":
            t += 15;
            break;
        case "blockquote":
        case "pre":
        case "td":
        case "code":
            t += 10;
            break;
        case "address":
        case "form":
        case "dd":
        case "dl":
        case "dt":
        case "li":
        case "ol":
        case "ul":
            t -= 5;
            break;
        case "body":
        case "th":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6":
            t -= 5;
            break;
        case "table":
            t -= 10;
            break
    }
    return t
}

function Un() {
    var r, t;
    const e = document.title.trim();
    if (e) {
        const i = document.querySelectorAll("h1, h2, h3");
        for (const a of i) {
            const s = ((r = a.textContent) == null ? void 0 : r.trim()) || "";
            if (s && e.indexOf(s) >= 0 && new TextEncoder().encode(s).length >= 14) return s
        }
        return e
    }
    const n = document.querySelectorAll("h1");
    for (const i of n) {
        const a = ((t = i.textContent) == null ? void 0 : t.trim()) || "";
        if (a && new TextEncoder().encode(a).length >= 14) return a
    }
    return ""
}

function tt(r) {
    const t = Cn({
        headingStyle: "atx"
    });
    return t.use(_t), t.addRule("filterInvalidTag", {
        filter: e => !!e[q.skip],
        replacement: () => ""
    }), t.addRule("keepOldLogic", {
        filter: ["img", "a"],
        replacement: (e, n) => n.nodeName === "A" && e ? `[${e}]()` : ""
    }), t.addRule("tables", {
        filter: "table",
        replacement: (e, n) => n.querySelector("a") ? `

${e.trim()}

` : e
    }), t.addRule("lineBreak", {
        filter: "br",
        replacement: (e, n, i) => n.closest("td, th") ? " " : `  
`
    }), t.turndown(r)
}

function Xn(r) {
    return r.nodeType === Node.ELEMENT_NODE
}

function zn(r, t) {
    const e = r.querySelectorAll("*"),
        n = t.querySelectorAll("*");
    for (let i = 0; i < Math.min(e.length, n.length); i++) {
        const a = e[i],
            s = n[i];
        a && s && (s.originalOffsetWidth = a.offsetWidth, s.originalOffsetHeight = a.offsetHeight, s.originalBoundingRect = a.getBoundingClientRect())
    }
}

function Kn(r) {
    var t, e;
    if (r instanceof HTMLElement) {
        const o = r.originalOffsetWidth,
            l = r.originalOffsetHeight;
        if (o !== void 0 && l !== void 0) {
            if (o <= 1 && l <= 1) return !0
        } else {
            const c = r.offsetWidth,
                h = r.offsetHeight,
                u = r.getBoundingClientRect();
            if (c <= 1 && h <= 1 && u.width <= 1 && u.height <= 1) return !0
        }
    }
    const n = ((t = r.getAttribute("id")) == null ? void 0 : t.toLowerCase()) || "",
        i = ((e = r.getAttribute("class")) == null ? void 0 : e.toLowerCase()) || "",
        a = `${n} ${i}`.trim();
    if (a && et.test(a)) return !0;
    const s = r.getAttribute("style");
    if (s) {
        const o = s.toLowerCase();
        if (o.includes("display: none") || o.includes("visibility: hidden") || o.includes("opacity: 0") || o.includes("width: 0") || o.includes("height: 0") || o.includes("position: absolute") && (o.includes("left: -") || o.includes("top: -"))) return !0
    }
    return !!(r.getAttribute("aria-hidden") === "true" || r.hasAttribute("hidden"))
}

function Fe() {
    return {
        title: document.title.trim() || "",
        markdown: document.body.innerText || ""
    }
}

function Yn(r) {
    const t = new dt.Readability(r).parse();
    if (t) {
        const {
            title: e,
            content: n
        } = t, i = tt(n);
        return {
            title: e,
            markdown: i
        }
    }
    return {
        title: document.title.trim() || "",
        markdown: ""
    }
}
const jn = 10;
class qn {
    async prepareArtifacts(t) {
        try {
            await this.waitForDOMStable(5e3) || C.warn("DOM did not stabilize within timeout, proceeding with artifact extraction anyway");
            const {
                markdown: n,
                title: i
            } = await this.extractContent(), {
                highlightCount: a,
                elements: s,
                elementRects: o
            } = await this.collectElementRects();
            return {
                ok: !0,
                markdownContent: `# ${i}

${n}`,
                highlightCount: a,
                elements: s,
                elementRects: o
            }
        } catch (e) {
            const n = e instanceof Error ? e.message : String(e);
            return C.error("Failed to prepare artifacts", {
                reason: n
            }), {
                ok: !1,
                error: n,
                elements: []
            }
        }
    }
    async waitForDOMStable(t = 5e3) {
        return await Lt(2e3) ? (setTimeout(() => {}, t), !0) : (C.error("document.body not ready within timeout"), !1)
    }
    async extractContent(t = 1) {
        let e = He();
        for (let n = 1; n <= t && e.markdown.length < jn; n++) {
            C.warn(`Screen visible content too short. (${e.markdown.length}), retrying (${n}/${t})`), await this.delay(500);
            const i = He();
            i.markdown.length > e.markdown.length && (e = i)
        }
        return e
    }
    async collectElementRects() {
        const t = await V.getVisibleClickableRects({
                useCdpMarkers: !0
            }),
            e = V.clickableElements,
            n = t.elements.length,
            i = t.elements.map(s => {
                var o;
                return {
                    index: s.index,
                    description: ((o = e[s.index]) == null ? void 0 : o.description) ?? `<${s.tagName}>`
                }
            }),
            a = t.elements.map(s => ({
                index: s.index,
                tagName: s.tagName,
                inputType: s.inputType,
                x: s.bounds[0],
                y: s.bounds[1],
                width: s.bounds[2],
                height: s.bounds[3]
            }));
        return {
            highlightCount: n,
            elements: i,
            elementRects: a,
            visiblePayload: t
        }
    }
    delay(t) {
        return new Promise(e => setTimeout(e, t))
    }
}
const $e = 1e4;

function Jn(r) {
    if (!r || typeof r != "object") return !0;
    const t = r;
    if (!t.messageTimestamp || typeof t.messageTimestamp != "number") return !0;
    const e = Date.now(),
        n = e - t.messageTimestamp;
    return n > $e ? (C.warn("Message expired", {
        messageType: t.type,
        age: n,
        threshold: $e,
        sentAt: new Date(t.messageTimestamp).toISOString(),
        receivedAt: new Date(e).toISOString()
    }), !1) : !0
}

function Zn(r) {
    chrome.runtime.onMessage.addListener(Qn(r))
}

function Qn(r) {
    return (t, e, n) => {
        if (!Jn(t) || !rt(t)) return !1;
        const i = t;
        return C.info("content background message received", {
            messageType: i.type,
            message: i
        }), r(i).then(a => {
            C.info("handleBackgroundRequest response", {
                message: i,
                response: a
            }), n(a)
        }).catch(a => {
            const s = a instanceof Error ? a.message : String(a);
            C.error("Content script handler error", {
                reason: s,
                type: i.type
            }), n({
                ok: !1,
                error: s
            })
        }), !0
    }
}
class ei {
    constructor() {
        this.intervalId = null, this.portIntervalId = null, this.port = null, this.HEARTBEAT_INTERVAL = 5e3, this.PORT_HEARTBEAT_INTERVAL = 2e4
    }
    start() {
        this.intervalId === null && (this.intervalId = window.setInterval(() => {
            chrome.runtime.sendMessage({
                source: "content",
                type: "content/heartbeat"
            })
        }, this.HEARTBEAT_INTERVAL), this.startPortKeepAlive())
    }
    startPortKeepAlive() {
        try {
            this.port = chrome.runtime.connect({
                name: "keep-alive"
            }), this.port.onDisconnect.addListener(() => {
                C.warn("Keep-alive port disconnected, reconnecting..."), this.port = null, this.portIntervalId !== null && (clearInterval(this.portIntervalId), this.portIntervalId = null), setTimeout(() => {
                    this.intervalId !== null && this.startPortKeepAlive()
                }, 1e3)
            }), this.portIntervalId = window.setInterval(() => {
                this.port && this.port.postMessage({
                    status: "ping"
                })
            }, this.PORT_HEARTBEAT_INTERVAL)
        } catch (t) {
            C.warn("Failed to start port heartbeat", {
                error: t
            })
        }
    }
    stop() {
        this.intervalId !== null && (clearInterval(this.intervalId), this.intervalId = null), this.portIntervalId !== null && (clearInterval(this.portIntervalId), this.portIntervalId = null), this.port && (this.port.disconnect(), this.port = null), C.debug("KeepAliveManager stopped and cleaned up")
    }
}
const ti = 1e3;
class ni {
    constructor() {
        this.interactiveSince = null, this.loadEventTimestamp = null, this.pageReady = !1, this.lastReadyState = null, this.pageActionExecutor = new tn, this.artifactsHandler = new qn, this.keepAliveManager = new ei, this.actionMask = new lt({
            onStop: () => {
                this.actionMask.changeActionMaskState("idle"), this.emitBackgroundMessage({
                    source: "content",
                    type: "extension/unauthorize-task"
                })
            },
            onTakeover: () => {
                this.emitBackgroundMessage({
                    source: "content",
                    type: "extension/stop-task"
                })
            },
            onResume: t => {
                this.actionMask.changeActionMaskState("ongoing"), this.emitBackgroundMessage({
                    source: "content",
                    type: "extension/resume-task",
                    summary: t
                })
            }
        }), this.initializeReadinessTracking(), Zn(t => this.handleBackgroundRequest(t)), this.restoreSessionState()
    }
    restoreSessionState() {
        chrome.runtime.sendMessage({
            source: "content",
            type: "content/get-session-state"
        }).then(t => {
            t != null && t.ok && t.state && (C.info("Restoring session state on page load", {
                state: t.state
            }), this.actionMask.changeActionMaskState(t.state))
        }).catch(t => {
            C.debug("Failed to restore session state", {
                error: t
            })
        })
    }
    emitBackgroundMessage(t) {
        it(t)
    }
    initializeReadinessTracking() {
        const t = performance.now();
        document.readyState !== "loading" && (this.interactiveSince = t), document.readyState === "complete" && (this.loadEventTimestamp = t, this.pageReady = !0, this.lastReadyState = "complete"), document.addEventListener("readystatechange", () => {
            document.readyState !== "loading" && this.interactiveSince === null && (this.interactiveSince = performance.now()), document.readyState === "complete" && (this.loadEventTimestamp = performance.now(), this.pageReady = !0, this.lastReadyState = "complete")
        }), window.addEventListener("DOMContentLoaded", () => {
            this.interactiveSince === null && (this.interactiveSince = performance.now()), this.lastReadyState = document.readyState
        }), window.addEventListener("load", () => {
            this.loadEventTimestamp = performance.now(), this.pageReady = !0, this.lastReadyState = "complete"
        })
    }
    destroy() {
        C.info("ContentApp destroyed")
    }
    getReadinessDetails() {
        const t = performance.now(),
            e = document.readyState;
        e !== "loading" && this.interactiveSince === null && (this.interactiveSince = t), e === "complete" && this.loadEventTimestamp === null && (this.loadEventTimestamp = t);
        const n = this.interactiveSince !== null ? t - this.interactiveSince : void 0,
            i = this.loadEventTimestamp !== null ? t - this.loadEventTimestamp : void 0,
            a = e === "complete" || e === "interactive" && typeof n == "number" && n >= ti;
        return a && !this.pageReady && (this.pageReady = !0), this.lastReadyState !== e && (this.lastReadyState = e), {
            ready: a,
            readyState: e,
            sinceInteractiveMs: n,
            sinceLoadMs: i
        }
    }
    handleCheckReady() {
        const t = this.getReadinessDetails();
        return t.ready ? {
            ok: !0,
            ready: !0,
            readyState: t.readyState,
            sinceInteractiveMs: t.sinceInteractiveMs,
            sinceLoadMs: t.sinceLoadMs
        } : {
            ok: !0,
            ready: !1,
            readyState: t.readyState,
            sinceInteractiveMs: t.sinceInteractiveMs,
            sinceLoadMs: t.sinceLoadMs
        }
    }
    async handleBackgroundRequest(t) {
        switch (t.type) {
            case "page/execute-action":
                return await this.executePageAction(t.action);
            case "page/prepare-artifacts":
                return this.prepareArtifacts(t.maxTimeout);
            case "page/check-ready":
                return this.handleCheckReady();
            case "page/toggle-page-effect":
                return this.handleTogglePageEffect(t.state);
            case "page/event-unblock":
                return this.actionMask.allowCDP(t.hideActionBar), {
                    ok: !0
                };
            case "page/event-block":
                return this.actionMask.disableCDP(t.restoreActionBar), {
                    ok: !0
                };
            default: {
                const e = t;
                return C.warn("Unhandled message type", e), {
                    ok: !1,
                    error: "Unsupported message type"
                }
            }
        }
    }
    async executePageAction(t) {
        if (this.keepAliveManager.start(), !this.pageReady) {
            const e = this.getReadinessDetails();
            e.ready ? this.pageReady = !0 : C.warn("Received automation action before page reported as ready", {
                action: t.type,
                readyState: e.readyState,
                sinceInteractiveMs: e.sinceInteractiveMs,
                sinceLoadMs: e.sinceLoadMs
            })
        }
        try {
            const e = new Promise((i, a) => setTimeout(() => {
                    a(new Error("timeout"))
                }, 15e3)),
                n = await Promise.race([this.pageActionExecutor.execute(t), e]).finally();
            return {
                ok: n.success,
                message: n.message,
                data: n.data,
                error: n.error
            }
        } catch (e) {
            if (e instanceof Error && e.message === "timeout") return {
                ok: !1,
                message: "Action execution timeout (15s)",
                error: "Action execution timeout (15s)",
                data: null
            };
            throw e
        }
    }
    async prepareArtifacts(t) {
        return await this.artifactsHandler.prepareArtifacts(t)
    }
    async handleTogglePageEffect(t) {
        C.info("handleTogglePageEffect", {
            state: t
        });
        try {
            return this.actionMask.changeActionMaskState(t), {
                ok: !0,
                state: t
            }
        } catch (e) {
            const n = e instanceof Error ? e.message : String(e);
            return C.error("Failed to toggle page effect", {
                reason: n,
                state: t
            }), {
                ok: !1,
                error: n
            }
        }
    }
}
new ni;