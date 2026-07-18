import React from 'react'
import { useSelector } from 'react-redux'
import MessageStatus from '../../components/MessageStatus';
import MessageActions from '../../components/MessageActions';

function Message({ messageDetails, onReply, onStartEdit, onScrollToMessage, searchQuery }) {

    const { userProfile, selectedUser } = useSelector(state => state.userReducer);
    const isSender = String(userProfile?.profile?._id) === String(messageDetails?.senderId);

    const isDeletedForEveryone = messageDetails?.isDeletedForEveryone;
    const isDeletedForSender = messageDetails?.isDeletedForSender;

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const senderAvatar = isSender
        ? userProfile?.profile?.avatar
        : selectedUser?.avatar;

    const senderName = isSender
        ? userProfile?.profile?.fullName
        : selectedUser?.fullName;

    const highlightText = (text, query) => {
        if (!query || !text) return text;
        const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === query.toLowerCase()
                ? <mark key={i} className="bg-yellow-500/30 text-white rounded px-0.5">{part}</mark>
                : part
        );
    };

    const reactionCounts = messageDetails?.reactions?.reduce((acc, r) => {
        const existing = acc.find(a => a.emoji === r.emoji);
        if (existing) {
            existing.count++;
        } else {
            acc.push({ emoji: r.emoji, count: 1 });
        }
        return acc;
    }, []) || [];

    if ((isSender && isDeletedForSender) || isDeletedForEveryone) {
        return (
            <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} mb-2 gap-2 opacity-40`}>
                <div className={`max-w-[75%] ${isSender ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="px-4 py-2.5 text-sm italic text-gray-500 glass rounded-2xl">
                        This message was deleted
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`group flex ${isSender ? 'justify-end' : 'justify-start'} mb-2 gap-2 relative`}>
            {!isSender && (
                <div className="flex-shrink-0 self-end">
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/10">
                        <img
                            src={senderAvatar}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${senderName}&background=6366F1&color=fff`;
                            }}
                        />
                    </div>
                </div>
            )}

            <div className={`max-w-[75%] ${isSender ? 'items-end' : 'items-start'} flex flex-col relative`}>
                {messageDetails?.replyTo && (
                    <div
                        className={`mb-1 max-w-[90%] cursor-pointer ${isSender ? 'self-end' : 'self-start'}`}
                        onClick={() => onScrollToMessage && onScrollToMessage(messageDetails.replyTo.messageId)}
                    >
                        <div className={`px-3 py-1.5 rounded-lg text-[11px] border-l-2 ${isSender ? 'border-white/30 bg-white/5' : 'border-primary/30 bg-white/5'}`}>
                            <p className="font-medium text-primary/80 truncate">{messageDetails.replyTo.senderName}</p>
                            <p className="text-gray-400 truncate">{messageDetails.replyTo.message}</p>
                        </div>
                    </div>
                )}

                <div
                    className={`px-4 py-2.5 text-sm leading-relaxed shadow-lg relative
                        ${isSender
                            ? 'gradient-primary text-white rounded-2xl rounded-br-md shadow-primary/20'
                            : 'glass rounded-2xl rounded-bl-md text-gray-200'
                        }`}
                >
                    {highlightText(messageDetails?.message, searchQuery)}
                    {messageDetails?.isEdited && (
                        <span className="text-[10px] text-white/50 ml-1.5">(edited)</span>
                    )}
                </div>

                {reactionCounts.length > 0 && (
                    <div className={`flex gap-0.5 -mt-2 ${isSender ? 'self-end' : 'self-start'}`}>
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full glass border border-white/5 text-xs">
                            {reactionCounts.map((r, i) => (
                                <span key={i} className="text-sm">{r.emoji}</span>
                            ))}
                        </div>
                    </div>
                )}

                <div className={`flex items-center gap-1.5 mt-1 px-1 ${isSender ? 'self-end' : 'self-start'}`}>
                    <span className="text-[10px] text-gray-600">{formatTime(messageDetails?.createdAt)}</span>
                    {isSender && (
                        <MessageStatus seenBy={messageDetails?.seenBy} currentUserId={userProfile?.profile?._id} />
                    )}
                </div>
            </div>

            {isSender && (
                <div className="flex-shrink-0 self-end">
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/10">
                        <img
                            src={senderAvatar}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${senderName}&background=6366F1&color=fff`;
                            }}
                        />
                    </div>
                </div>
            )}

            <div className={`absolute ${isSender ? 'right-0' : 'left-0'} -top-1 z-20`}>
                <MessageActions
                    message={messageDetails}
                    isSender={isSender}
                    onReply={onReply}
                    onStartEdit={onStartEdit}
                />
            </div>
        </div>
    )
}

export default Message
