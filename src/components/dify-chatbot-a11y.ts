export type DifyLoadState = 'idle' | 'loaded' | 'error';

export function getDifyContainerAriaHidden(loadState: DifyLoadState) {
  return loadState === 'idle' ? 'true' : null;
}
