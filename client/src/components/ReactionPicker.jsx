import { useDispatch } from "react-redux";
import { reactToMessageThunk } from "../store/slice/message/message.thunk";

const EMOJIS = ["❤️", "😂", "👍", "😍", "😮", "😢"];

function ReactionPicker({ messageId, recieverId, onClose }) {
  const dispatch = useDispatch();

  const handleReact = (emoji) => {
    dispatch(reactToMessageThunk({ messageId, emoji }));
    if (onClose) onClose();
  };

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-2xl animate-scale-in"
      style={{
        backgroundColor: "var(--popup-bg)",
        border: "1px solid var(--popup-border)",
        boxShadow: "var(--popup-shadow)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className="text-xl p-0.5 leading-none transition-transform duration-150 hover:scale-125 active:scale-95 bg-transparent border-0 outline-none select-none cursor-pointer"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export default ReactionPicker;
