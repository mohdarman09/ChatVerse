import { IoCheckmark, IoCheckmarkDone } from "react-icons/io5";

function MessageStatus({ seenBy, currentUserId }) {
  const isSeen = seenBy?.length > 0;

  return (
    <span className="inline-flex items-center">
      {isSeen ? (
        <IoCheckmarkDone className="w-3.5 h-3.5 text-blue-400" />
      ) : (
        <IoCheckmark className="w-3.5 h-3.5 text-gray-500" />
      )}
    </span>
  );
}

export default MessageStatus;
