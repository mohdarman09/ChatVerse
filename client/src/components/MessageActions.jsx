import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { BsThreeDotsVertical, BsReply, BsCopy, BsPencil, BsTrash, BsEmojiSmile } from "react-icons/bs";
import toast from "react-hot-toast";
import { editMessageThunk, deleteMessageThunk } from "../store/slice/message/message.thunk";
import ReactionPicker from "./ReactionPicker";

function MessageActions({ message, isSender, onReply, onStartEdit }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [menuAbove, setMenuAbove] = useState(true);
  const menuRef = useRef(null);
  const dropdownRef = useRef(null);

  const dispatch = useDispatch();

  const canEdit = isSender && message?.isEdited !== true && (() => {
    const diff = (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60);
    return diff <= 10;
  })();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.message);
      toast.success("Message copied");
    } catch {
      toast.error("Failed to copy");
    }
    setIsOpen(false);
  };

  const handleEdit = () => {
    if (onStartEdit) onStartEdit(message);
    setIsOpen(false);
  };

  const handleDeleteForMe = async () => {
    await dispatch(deleteMessageThunk({ messageId: message._id, deleteForEveryone: false }));
    setIsOpen(false);
  };

  const handleDeleteForEveryone = async () => {
    await dispatch(deleteMessageThunk({ messageId: message._id, deleteForEveryone: true }));
    setIsOpen(false);
  };

  const handleReply = () => {
    if (onReply) onReply(message);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowReactions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setMenuAbove(rect.top >= 10);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all duration-200 text-gray-500 hover:text-white"
      >
        <BsThreeDotsVertical className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`
            absolute z-50 min-w-[220px] py-1.5 rounded-xl glass shadow-xl border border-white/10
            ${menuAbove ? 'bottom-full mb-2' : 'top-0 mt-2'}
            ${isSender ? 'right-0' : 'left-0'}
            animate-scale-in
          `}
          style={{
            transformOrigin: isSender
              ? (menuAbove ? 'bottom right' : 'top right')
              : (menuAbove ? 'bottom left' : 'top left')
          }}
        >
          <div className="relative pb-1 mb-1 border-b border-white/5">
            <button
              onClick={(e) => { e.stopPropagation(); setShowReactions(!showReactions); }}
              className="flex items-center gap-3 w-full px-3 py-2 text-xs text-gray-300 rounded-lg hover:bg-white/10 transition-all whitespace-nowrap"
            >
              <BsEmojiSmile className="w-3.5 h-3.5 flex-shrink-0" />
              React
            </button>
            {showReactions && (
              <div className="absolute left-0 mt-1 z-50">
                <ReactionPicker messageId={message._id} recieverId={message.recieverId} onClose={() => setShowReactions(false)} />
              </div>
            )}
          </div>

          <button onClick={handleReply} className="flex items-center gap-3 w-full px-3 py-2 text-xs text-gray-300 rounded-lg hover:bg-white/10 transition-all whitespace-nowrap">
            <BsReply className="w-3.5 h-3.5 flex-shrink-0" />
            Reply
          </button>
          <button onClick={handleCopy} className="flex items-center gap-3 w-full px-3 py-2 text-xs text-gray-300 rounded-lg hover:bg-white/10 transition-all whitespace-nowrap">
            <BsCopy className="w-3.5 h-3.5 flex-shrink-0" />
            Copy
          </button>
          {canEdit && (
            <button onClick={handleEdit} className="flex items-center gap-3 w-full px-3 py-2 text-xs text-gray-300 rounded-lg hover:bg-white/10 transition-all whitespace-nowrap">
              <BsPencil className="w-3.5 h-3.5 flex-shrink-0" />
              Edit
            </button>
          )}

          {isSender && (
            <div className="pt-1 mt-1 border-t border-white/5">
              <button onClick={handleDeleteForMe} className="flex items-center gap-3 w-full px-3 py-2 text-xs text-red-400 rounded-lg hover:bg-red-500/10 transition-all whitespace-nowrap">
                <BsTrash className="w-3.5 h-3.5 flex-shrink-0" />
                Delete for me
              </button>
              <button onClick={handleDeleteForEveryone} className="flex items-center gap-3 w-full px-3 py-2 text-xs text-red-400 rounded-lg hover:bg-red-500/10 transition-all whitespace-nowrap">
                <BsTrash className="w-3.5 h-3.5 flex-shrink-0" />
                Delete for everyone
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MessageActions;
