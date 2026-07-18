import { useSelector } from "react-redux";

function TypingIndicator({ userId }) {
  const typingUsers = useSelector(state => state.messageReducer.typingUsers);
  const typingInfo = typingUsers[userId];

  if (!typingInfo) return null;

  return (
    <div className="flex items-center gap-2 px-1 py-1.5 animate-fade-in">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-gray-400 italic">
        {typingInfo.name} is typing...
      </span>
    </div>
  );
}

export default TypingIndicator;
