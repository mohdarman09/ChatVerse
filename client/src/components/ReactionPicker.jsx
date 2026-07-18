import { useDispatch, useSelector } from "react-redux";
import { reactToMessageThunk } from "../store/slice/message/message.thunk";

const EMOJIS = ["❤️", "😂", "👍", "😍", "😮", "😢"];

function ReactionPicker({ messageId, recieverId, onClose }) {
  const dispatch = useDispatch();

  const handleReact = (emoji) => {
    dispatch(reactToMessageThunk({ messageId, emoji }));
    if (onClose) onClose();
  };

  return (
    <div className="flex items-center gap-1 p-1.5 rounded-xl glass shadow-xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-white/10 transition-all duration-200 hover:scale-125"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export default ReactionPicker;
