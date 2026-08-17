import React from 'react'
import { useSelector } from 'react-redux'
import MessageStatus from '../../components/MessageStatus';
import MessageActions from '../../components/MessageActions';
import CallHistoryItem from '../../components/CallHistoryItem';

function Message({ messageDetails, onReply, onStartEdit, onScrollToMessage, searchQuery, isMobile }) {

    const { userProfile, selectedUser } = useSelector(state => state.userReducer);
    const isSender = String(userProfile?.profile?._id) === String(messageDetails?.senderId);

    const isDeletedForEveryone = messageDetails?.isDeletedForEveryone;
    const isDeletedForSender = messageDetails?.isDeletedForSender;

    if (messageDetails?.type === 'call') {
        return <CallHistoryItem details={messageDetails} />;
    }

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

    const bubbleClasses = isMobile
        ? 'px-3 py-2 text-[14px] leading-relaxed relative break-word'
        : 'px-3.5 py-2 text-xs leading-relaxed relative break-word';

    if ((isSender && isDeletedForSender) || isDeletedForEveryone) {
        return (
            <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} mb-2 gap-2 opacity-50`}>
                <div className={`max-w-[75%] ${isSender ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="px-3 py-1.5 text-xs italic text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl">
                        This message was deleted
                    </div>
                </div>
            </div>
        );
    }

    // Mobile layout
    if (isMobile) {
        return (
            <div className={`group flex ${isSender ? 'justify-end' : 'justify-start'} mb-2.5 gap-1.5 relative`}>
                {!isSender && (
                    <div className="flex-shrink-0 self-end">
                        <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-[var(--border-color)]">
                            <img src={senderAvatar} alt="" className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${senderName}&background=6366F1&color=fff`; }} />
                        </div>
                    </div>
                )}

                <div className={`max-w-[78%] ${isSender ? 'items-end' : 'items-start'} flex flex-col relative`}>
                    {messageDetails?.replyTo && (
                        <div className={`mb-1 max-w-[92%] cursor-pointer ${isSender ? 'self-end' : 'self-start'}`}
                            onClick={() => onScrollToMessage && onScrollToMessage(messageDetails.replyTo.messageId)}
                        >
                            <div className={`px-2.5 py-1 rounded-lg text-[11px] border-l-2 ${isSender ? 'border-white/50 bg-black/15 text-white/90' : 'border-primary/60 bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}>
                                <p className="font-medium truncate">{messageDetails.replyTo.senderName}</p>
                                <p className="truncate opacity-80">{messageDetails.replyTo.message}</p>
                            </div>
                        </div>
                    )}

                    <div className={`${bubbleClasses}
                        ${isSender
                            ? 'glass-bubble-sent rounded-2xl rounded-br-xs'
                            : 'glass-bubble-received rounded-2xl rounded-bl-xs'
                        }`}
                    >
                        {messageDetails?.messageType === 'image' && messageDetails?.imageUrl ? (
                            <div className="mb-1">
                                <img
                                    src={messageDetails.imageUrl}
                                    alt="Shared image"
                                    className="max-w-full rounded-lg cursor-pointer object-contain hover:opacity-95 transition-opacity w-full"
                                    style={{ maxHeight: '250px' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const event = new CustomEvent('openImagePreview', { detail: messageDetails.imageUrl });
                                        window.dispatchEvent(event);
                                    }}
                                    loading="lazy"
                                />
                            </div>
                        ) : (
                            <span className="break-word font-normal">{highlightText(messageDetails?.message, searchQuery)}</span>
                        )}
                        {messageDetails?.isEdited && messageDetails?.messageType === 'text' && (
                            <span className={`text-[10px] ml-1.5 ${isSender ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>(edited)</span>
                        )}
                    </div>

                    {/* Instagram-style standalone emoji reactions (no background box/div) */}
                    {reactionCounts.length > 0 && (
                        <div className={`flex items-center gap-1 -mt-1 select-none ${isSender ? 'self-end' : 'self-start'}`}>
                            {reactionCounts.map((r, i) => (
                                <span
                                    key={i}
                                    className="text-base leading-none inline-flex items-center gap-0.5 transition-transform hover:scale-115 cursor-default"
                                    title={r.count > 1 ? `${r.count} reactions` : undefined}
                                >
                                    {r.emoji}
                                    {r.count > 1 && (
                                        <span className="text-[10px] font-medium text-[var(--text-muted)]">
                                            {r.count}
                                        </span>
                                    )}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className={`flex items-center gap-1 mt-0.5 px-0.5 ${isSender ? 'self-end' : 'self-start'}`}>
                        <span className="text-[10px] font-normal text-[var(--text-muted)]">{formatTime(messageDetails?.createdAt)}</span>
                        {isSender && (
                            <MessageStatus seenBy={messageDetails?.seenBy} currentUserId={userProfile?.profile?._id} />
                        )}
                    </div>
                </div>

                {isSender && (
                    <div className="flex-shrink-0 self-end">
                        <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-[var(--border-color)]">
                            <img src={senderAvatar} alt="" className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${senderName}&background=6366F1&color=fff`; }} />
                        </div>
                    </div>
                )}

                <div className={`absolute ${isSender ? 'right-0' : 'left-0'} -top-2 z-20`}>
                    <MessageActions
                        message={messageDetails}
                        isSender={isSender}
                        onReply={onReply}
                        onStartEdit={onStartEdit}
                        isMobile={true}
                    />
                </div>
            </div>
        );
    }

    // Desktop layout
    return (
        <div className={`group flex ${isSender ? 'justify-end' : 'justify-start'} mb-2 gap-2 relative`}>
            {!isSender && (
                <div className="flex-shrink-0 self-end">
                    <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-[var(--border-color)]">
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
                        <div className={`px-2.5 py-1 rounded-lg text-[11px] border-l-2 ${isSender ? 'border-white/50 bg-black/15 text-white/90' : 'border-primary/60 bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}>
                            <p className="font-medium truncate">{messageDetails.replyTo.senderName}</p>
                            <p className="truncate opacity-80">{messageDetails.replyTo.message}</p>
                        </div>
                    </div>
                )}

                <div
                    className={`${bubbleClasses}
                        ${isSender
                            ? 'glass-bubble-sent rounded-2xl rounded-br-xs'
                            : 'glass-bubble-received rounded-2xl rounded-bl-xs'
                        }`}
                >
                    {messageDetails?.messageType === 'image' && messageDetails?.imageUrl ? (
                        <div className="mb-1">
                            <img
                                src={messageDetails.imageUrl}
                                alt="Shared image"
                                className="max-w-full rounded-lg cursor-pointer object-cover hover:opacity-95 transition-opacity"
                                style={{ maxHeight: '300px', width: 'auto' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const event = new CustomEvent('openImagePreview', { detail: messageDetails.imageUrl });
                                    window.dispatchEvent(event);
                                }}
                                loading="lazy"
                            />
                        </div>
                    ) : (
                        <span className="break-word font-normal">{highlightText(messageDetails?.message, searchQuery)}</span>
                    )}
                    {messageDetails?.isEdited && messageDetails?.messageType === 'text' && (
                        <span className={`text-[10px] ml-1.5 ${isSender ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>(edited)</span>
                    )}
                </div>

                {/* Instagram-style standalone emoji reactions (no background box/div) */}
                {reactionCounts.length > 0 && (
                    <div className={`flex items-center gap-1 -mt-1 select-none ${isSender ? 'self-end' : 'self-start'}`}>
                        {reactionCounts.map((r, i) => (
                            <span
                                key={i}
                                className="text-base leading-none inline-flex items-center gap-0.5 transition-transform hover:scale-115 cursor-default"
                                title={r.count > 1 ? `${r.count} reactions` : undefined}
                            >
                                {r.emoji}
                                {r.count > 1 && (
                                    <span className="text-[10px] font-medium text-[var(--text-muted)]">
                                        {r.count}
                                    </span>
                                )}
                            </span>
                        ))}
                    </div>
                )}

                <div className={`flex items-center gap-1 mt-0.5 px-0.5 ${isSender ? 'self-end' : 'self-start'}`}>
                    <span className="text-[10px] font-normal text-[var(--text-muted)]">{formatTime(messageDetails?.createdAt)}</span>
                    {isSender && (
                        <MessageStatus seenBy={messageDetails?.seenBy} currentUserId={userProfile?.profile?._id} />
                    )}
                </div>
            </div>

            {isSender && (
                <div className="flex-shrink-0 self-end">
                    <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-[var(--border-color)]">
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