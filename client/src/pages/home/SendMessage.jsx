import React, { useState, useRef, useEffect, useCallback } from 'react'
import { IoIosSend } from "react-icons/io";
import { BsEmojiSmile, BsReply, BsPencil, BsX, BsImage } from "react-icons/bs";
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { sendMessageThunk } from '../../store/slice/message/message.thunk';


const SendMessage = ({ replyTo, onCancelReply, editingMessage, onCancelEdit, isMobile }) => {

    const dispatch = useDispatch();
    const { selectedUser, userProfile } = useSelector(state => state.userReducer);
    const { buttonLoading } = useSelector(state => state.messageReducer);
    const { socket } = useSelector(state => state.socketReducer);
    const [message, setMessage] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageUploading, setImageUploading] = useState(false);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (editingMessage) {
            setMessage(editingMessage.message);
        }
    }, [editingMessage]);

    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const emitTyping = useCallback(() => {
        if (!socket || !selectedUser?._id) return;
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            socket.emit("typing", {
                recieverId: selectedUser._id,
                senderName: userProfile?.profile?.fullName || "Someone"
            });
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            if (socket) {
                socket.emit("stopTyping", { recieverId: selectedUser._id });
            }
        }, 1000);
    }, [socket, selectedUser, userProfile]);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (socket && selectedUser?._id && isTypingRef.current) {
                socket.emit("stopTyping", { recieverId: selectedUser._id });
                isTypingRef.current = false;
            }
        };
    }, [socket, selectedUser]);

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only .jpg, .jpeg, .png, and .webp files are allowed');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5 MB');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeSelectedImage = () => {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setSelectedImage(null);
        setImagePreview(null);
    };

    const handleSendMessage = async () => {
        if (!message.trim() && !selectedImage) return;

        if (editingMessage) {
            if (socket) {
                socket.emit("messageEdited", {
                    messageId: editingMessage._id,
                    newMessage: message.trim(),
                    recieverId: selectedUser?._id,
                });
            }
            if (onCancelEdit) onCancelEdit();
            setMessage("");
            return;
        }

        if (selectedImage) {
            setImageUploading(true);
            await dispatch(sendMessageThunk({
                recieverId: selectedUser?._id,
                message: message.trim(),
                replyTo: replyTo ? {
                    messageId: replyTo.messageId,
                    message: replyTo.message,
                    senderId: replyTo.senderId,
                    senderName: replyTo.senderName
                } : null,
                image: selectedImage
            }))
            setImageUploading(false);
            removeSelectedImage();
        } else {
            dispatch(sendMessageThunk({
                recieverId: selectedUser?._id,
                message: message.trim(),
                replyTo: replyTo ? {
                    messageId: replyTo.messageId,
                    message: replyTo.message,
                    senderId: replyTo.senderId,
                    senderName: replyTo.senderName
                } : null
            }))
        }
        setMessage("");

        if (isTypingRef.current) {
            isTypingRef.current = false;
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (socket) {
                socket.emit("stopTyping", { recieverId: selectedUser._id });
            }
        }

        if (onCancelReply) onCancelReply();
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }

    const handleInputChange = (e) => {
        setMessage(e.target.value);
        if (!editingMessage) {
            emitTyping();
        }
    }

    const canSend = (message.trim() || selectedImage) && !buttonLoading && !imageUploading;

    // Mobile layout
    if (isMobile) {
        return (
            <div className="safe-bottom-mobile">
                {(replyTo || editingMessage) && (
                    <div className="px-2 pt-2">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                            <div className={`p-1 rounded flex-shrink-0 ${editingMessage ? 'bg-yellow-500/20 text-yellow-400' : 'bg-primary/20 text-primary'}`}>
                                {editingMessage ? <BsPencil className="w-3 h-3" /> : <BsReply className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-primary/80 truncate">
                                    {editingMessage ? 'Editing message' : `Reply to ${replyTo?.senderName}`}
                                </p>
                                <p className="text-[11px] text-gray-500 truncate">
                                    {editingMessage ? editingMessage.message : replyTo?.message}
                                </p>
                            </div>
                            <button
                                onClick={editingMessage ? onCancelEdit : onCancelReply}
                                className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                            >
                                <BsX className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
                {imagePreview && (
                    <div className="px-2 pt-2">
                        <div className="relative inline-block max-w-full rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-md">
                            <img src={imagePreview} alt="Preview" className="max-h-32 w-auto object-contain" />
                            <button
                                onClick={removeSelectedImage}
                                className="absolute top-1 right-1 p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90 transition-all"
                                aria-label="Remove image"
                            >
                                <BsX className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
                <div className="px-2 py-2">
                    <div className="flex items-center gap-2">
                        <button className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-primary hover:bg-white/5 transition-all flex-shrink-0" aria-label="Add emoji">
                            <BsEmojiSmile className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-primary hover:bg-white/5 transition-all flex-shrink-0"
                            aria-label="Send image"
                            disabled={!!editingMessage}
                        >
                            <BsImage className="w-5 h-5" />
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[16px] text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                                onChange={handleInputChange}
                                value={message}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <button
                            className={`w-11 h-11 flex items-center justify-center rounded-xl text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex-shrink-0
                                ${editingMessage
                                    ? 'bg-yellow-500 shadow-yellow-500/25'
                                    : 'gradient-primary shadow-primary/25'
                                }`}
                            onClick={handleSendMessage}
                            disabled={!canSend}
                            aria-label={editingMessage ? "Save edit" : "Send message"}
                        >
                            {imageUploading || buttonLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : editingMessage ? (
                                <BsPencil className="w-5 h-5" />
                            ) : (
                                <IoIosSend className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Desktop layout: exact original, untouched
    return (
        <div className="sticky bottom-0 glass border-t border-white/5">
            {(replyTo || editingMessage) && (
                <div className="px-3 pt-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                        <div className={`p-1 rounded ${editingMessage ? 'bg-yellow-500/20 text-yellow-400' : 'bg-primary/20 text-primary'}`}>
                            {editingMessage ? <BsPencil className="w-3 h-3" /> : <BsReply className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-primary/80">
                                {editingMessage ? 'Editing message' : `Reply to ${replyTo?.senderName}`}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                                {editingMessage ? editingMessage.message : replyTo?.message}
                            </p>
                        </div>
                        <button
                            onClick={editingMessage ? onCancelEdit : onCancelReply}
                            className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                        >
                            <BsX className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
            {imagePreview && (
                <div className="px-3 pt-2">
                    <div className="relative inline-block rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-md">
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-h-32 w-auto object-contain"
                        />
                        <button
                            onClick={removeSelectedImage}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black/90 transition-all"
                            aria-label="Remove image"
                        >
                            <BsX className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
            <div className="p-3">
                <div className="flex items-center gap-2 max-w-4xl mx-auto">
                    <button
                        className="p-2 rounded-xl text-gray-500 hover:text-primary hover:bg-primary/10 transition-all duration-300 flex-shrink-0"
                        aria-label="Add emoji"
                    >
                        <BsEmojiSmile className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-xl text-gray-500 hover:text-primary hover:bg-primary/10 transition-all duration-300 flex-shrink-0"
                        aria-label="Send image"
                        disabled={!!editingMessage}
                    >
                        <BsImage className="w-5 h-5" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageSelect}
                    />
                    <div className="flex-1 relative group">
                        <input
                            type="text"
                            placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-300"
                            onChange={handleInputChange}
                            value={message}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <button
                        className={`p-3 rounded-xl text-white shadow-lg transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex-shrink-0
                            ${editingMessage
                                ? 'bg-yellow-500 hover:shadow-yellow-500/30 shadow-yellow-500/25'
                                : 'gradient-primary shadow-primary/25 hover:shadow-xl hover:shadow-primary/30'
                            }`}
                        onClick={handleSendMessage}
                        disabled={!canSend}
                        aria-label={editingMessage ? "Save edit" : "Send message"}
                    >
                        {imageUploading || buttonLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : editingMessage ? (
                            <BsPencil className="w-5 h-5" />
                        ) : (
                            <IoIosSend className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SendMessage