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

    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
        <span className="text-[11px] text-gray-400 font-medium">{formatDateLabel(date)}</span>
      </div>
    </div>
  );
}

export default DateSeparator;
