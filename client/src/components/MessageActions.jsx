import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { BsThreeDotsVertical, BsReply, BsCopy, BsPencil, BsTrash, BsEmojiSmile } from "react-icons/bs";
import toast from "react-hot-toast";
import { editMessageThunk, deleteMessageThunk } from "../store/slice/message/message.thunk";
import ReactionPicker from "./ReactionPicker";

function MessageActions({ message, isSender, onReply, onStartEdit, isMobile }) {
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
        className={`p-1 rounded-lg hover:bg-[var(--user-hover-bg)] transition-colors duration-150 text-[var(--text-muted)] hover:text-[var(--text-primary)] ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        aria-label="Message options"
      >
        <BsThreeDotsVertical className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`
            absolute z-50 min-w-[190px] p-1.5 rounded-xl shadow-2xl animate-scale-in
            ${menuAbove ? 'bottom-full mb-1.5' : 'top-0 mt-1.5'}
            ${isSender ? 'right-0' : 'left-0'}
          `}
          style={{
            backgroundColor: "var(--popup-bg)",
            border: "1px solid var(--popup-border)",
            boxShadow: "var(--popup-shadow)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            transformOrigin: isSender
              ? (menuAbove ? 'bottom right' : 'top right')
              : (menuAbove ? 'bottom left' : 'top left')
          }}
        >
          <div className="relative pb-1 mb-1 border-b border-[var(--border-subtle)]">
            <button
              onClick={(e) => { e.stopPropagation(); setShowReactions(!showReactions); }}
              className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] rounded-lg hover:bg-[var(--popup-hover)] transition-colors whitespace-nowrap"
            >
              <BsEmojiSmile className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
              React
            </button>
            {showReactions && (
              <div className="absolute left-0 mt-1 z-50">
                <ReactionPicker messageId={message._id} recieverId={message.recieverId} onClose={() => setShowReactions(false)} />
              </div>
            )}
          </div>

          <button
            onClick={handleReply}
            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] rounded-lg hover:bg-[var(--popup-hover)] transition-colors whitespace-nowrap"
          >
            <BsReply className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-secondary)]" />
            Reply
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] rounded-lg hover:bg-[var(--popup-hover)] transition-colors whitespace-nowrap"
          >
            <BsCopy className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-secondary)]" />
            Copy
          </button>
          {canEdit && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] rounded-lg hover:bg-[var(--popup-hover)] transition-colors whitespace-nowrap"
            >
              <BsPencil className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-secondary)]" />
              Edit
            </button>
          )}

          {isSender && (
            <div className="pt-1 mt-1 border-t border-[var(--border-subtle)]">
              <button
                onClick={handleDeleteForMe}
                className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium text-[var(--danger-text)] rounded-lg hover:bg-[var(--danger-bg)] transition-colors whitespace-nowrap"
              >
                <BsTrash className="w-3.5 h-3.5 flex-shrink-0" />
                Delete for me
              </button>
              <button
                onClick={handleDeleteForEveryone}
                className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium text-[var(--danger-text)] rounded-lg hover:bg-[var(--danger-bg)] transition-colors whitespace-nowrap"
              >
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
