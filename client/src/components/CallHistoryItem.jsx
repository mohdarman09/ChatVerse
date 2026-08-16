import React from 'react'
import { useSelector } from 'react-redux'
import { BsTelephone, BsTelephoneX } from 'react-icons/bs'

const CallHistoryItem = ({ details }) => {
  const { userProfile } = useSelector(state => state.userReducer);

  const viewerId = userProfile?.profile?._id;
  const isCaller = String(details?.callerId) === String(viewerId);
  const status = details?.callStatus || 'completed';
  const isMissed = status === 'missed'
    || (status === 'cancelled' && !isCaller)
    || (status === 'rejected' && isCaller);

  const title = (() => {
    if (status === 'completed') return 'Audio call';
    if (status === 'missed') return 'Missed audio call';
    if (status === 'busy') return 'Busy call';
    if (status === 'failed') return 'Failed call';
    if (status === 'rejected') return isCaller ? 'Missed audio call' : 'Rejected call';
    if (status === 'cancelled') return isCaller ? 'Cancelled call' : 'Missed audio call';
    return 'Audio call';
  })();

  const direction = (() => {
    if (isMissed) return 'Missed';
    if (isCaller) return 'Outgoing';
    return 'Incoming';
  })();

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((today - day) / 86400000);
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    if (diffDays === 0) return `Today, ${time}`;
    if (diffDays === 1) return `Yesterday, ${time}`;
    const dateStr = date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    });
    return `${dateStr}, ${time}`;
  };

  const formatDuration = (sec) => {
    const total = Number(sec) || 0;
    const min = Math.floor(total / 60);
    const s = total % 60;
    if (min === 0) return `${s} sec`;
    return `${min} min ${s} sec`;
  };

  return (
    <div className="flex justify-center mb-3">
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl glass border border-white/5 max-w-[85%]">
        <div className={`w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 ${isMissed ? 'bg-red-500/15 text-red-400' : 'bg-primary/15 text-primary'}`}>
          {isMissed ? <BsTelephoneX className="w-4 h-4" /> : <BsTelephone className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${isMissed ? 'text-red-400' : 'text-gray-200'}`}>{title}</p>
          <p className="text-[11px] text-gray-500 truncate">
            {direction} • {formatTime(details?.createdAt)}
          </p>
          {status === 'completed' && (
            <p className="text-[11px] text-gray-500 truncate">
              Duration: {formatDuration(details?.callDuration)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallHistoryItem;