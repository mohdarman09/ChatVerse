import { useSelector } from "react-redux";

function TypingIndicator({ userId }) {
  const typingUsers = useSelector(state => state.messageReducer.typingUsers);
  const typingInfo = typingUsers[userId];

  if (!typingInfo) return null;

  return (
    <div className="flex items-center gap-2 px-1 py-2 animate-fade-in">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-[11px] text-gray-400 font-light">
        {typingInfo.name} is typing...
      </span>
    </div>
  );
}

export default TypingIndicator;
