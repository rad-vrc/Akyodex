export function resolveFilterPanelOpenState({
  isFilterPanelOpen,
  isMobile,
}: {
  isFilterPanelOpen: boolean | null;
  isMobile: boolean | undefined;
}): boolean {
  if (isFilterPanelOpen !== null) {
    return isFilterPanelOpen;
  }

  if (isMobile === false) {
    return true;
  }

  return false;
}

export function getNextFilterPanelOpenState({
  current,
  isMobile,
}: {
  current: boolean | null;
  isMobile: boolean | undefined;
}): boolean {
  return !resolveFilterPanelOpenState({
    isFilterPanelOpen: current,
    isMobile,
  });
}
