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
    <div className="flex items-center justify-center my-5">
      <div className="flex items-center gap-3 w-full max-w-[300px]">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <span className="text-[10px] text-gray-500 font-medium tracking-wider uppercase px-2">
          {formatDateLabel(date)}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>
    </div>
  );
}

export default DateSeparator;
