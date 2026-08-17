import { useSelector } from "react-redux";

function TypingIndicator({ userId }) {
  const typingUsers = useSelector(state => state.messageReducer.typingUsers);
  const typingInfo = typingUsers[userId];

  if (!typingInfo) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 animate-fade-in">
      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xs">
        <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        <span className="text-[10px] text-[var(--text-muted)] font-normal ml-1">
          {typingInfo.name} is typing...
        </span>
      </div>
    </div>
  );
}

export default TypingIndicator;
