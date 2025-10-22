export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="loading-spinner w-16 h-16"></div>
      <p className="text-lg font-bold text-[var(--text-primary)]">
        読み込み中...
      </p>
    </div>
  );
}
