function DateSeparator({ date }) {
  const formatDateLabel = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (msgDate.getTime() === today.getTime()) return "Today";
    if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="flex items-center justify-center my-3.5">
      <div className="flex items-center gap-2 w-full max-w-[280px]">
        <div className="flex-1 h-px bg-[var(--divider-color)]" />
        <span className="px-2.5 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] font-medium tracking-wider uppercase shadow-xs">
          {formatDateLabel(date)}
        </span>
        <div className="flex-1 h-px bg-[var(--divider-color)]" />
      </div>
    </div>
  );
}

export default DateSeparator;
