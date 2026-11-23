/** True when launched from the home-screen icon (iOS + installed PWAs). */
export function isWormAppStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/**
 * iOS standalone often reports innerHeight / dvh short by the status-bar
 * inset, which leaves a letterbox under the shell. Lock to the tallest
 * reliable size (including screen height when installed).
 */
export function syncWormAppHeight(): void {
  const vv = window.visualViewport;
  const landscape = window.matchMedia("(orientation: landscape)").matches;
  const screenEdge = landscape ? window.screen.width : window.screen.height;

  const height = Math.max(
    window.innerHeight,
    document.documentElement.clientHeight,
    vv ? Math.ceil(vv.height + (vv.offsetTop || 0)) : 0,
    isWormAppStandalone() ? screenEdge : 0,
  );

  document.documentElement.style.setProperty(
    "--worm-app-height",
    `${height}px`,
  );
}
