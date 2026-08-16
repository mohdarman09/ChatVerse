import React, { useState, useRef, useEffect, useCallback } from 'react'
import { IoIosSend } from "react-icons/io";
import { BsReply, BsPencil, BsX, BsPaperclip } from "react-icons/bs";
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { sendMessageThunk } from '../../store/slice/message/message.thunk';
import AttachmentSheet from '../../components/AttachmentSheet';
import CameraScreen from '../../components/CameraScreen';

const SendMessage = ({ replyTo, onCancelReply, editingMessage, onCancelEdit, isMobile }) => {

    const dispatch = useDispatch();
    const { selectedUser, userProfile } = useSelector(state => state.userReducer);
    const { buttonLoading } = useSelector(state => state.messageReducer);
    const { socket } = useSelector(state => state.socketReducer);
    const [message, setMessage] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
    const [cameraOpen, setCameraOpen] = useState(false);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);

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

    const handleGalleryClick = () => {
        fileInputRef.current?.click();
    };

    const handleCameraSend = (file) => {
        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
        setCameraOpen(false);
    };

    const handleAttachmentClick = () => {
        if (editingMessage) return;
        setShowAttachmentSheet(true);
    };

    const handleSheetCamera = () => {
        setShowAttachmentSheet(false);
        setCameraOpen(true);
    };

    const handleSheetGallery = () => {
        setShowAttachmentSheet(false);
        handleGalleryClick();
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
            if (inputRef.current) inputRef.current.style.height = 'auto';
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
        if (inputRef.current) inputRef.current.style.height = 'auto';

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
        const el = e.target;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
        setMessage(e.target.value);
        if (!editingMessage) {
            emitTyping();
        }
    }

    const canSend = (message.trim() || selectedImage) && !buttonLoading && !imageUploading;

    // Mobile layout
    if (isMobile) {
        return (
            <>
            <div>
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
                <div className="px-1.5 pt-1 pb-1.5">
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={handleAttachmentClick}
                            className="w-11 h-11 flex items-center justify-center rounded-2xl text-gray-400 hover:text-primary hover:bg-white/5 transition-all flex-shrink-0"
                            aria-label="Attach photo"
                            disabled={!!editingMessage}
                        >
                            <BsPaperclip className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0 flex items-center rounded-2xl bg-white/[0.05] border border-white/[0.08] px-2 py-1">
                            <textarea
                                ref={inputRef}
                                rows={1}
                                placeholder={editingMessage ? "Edit message..." : "Message"}
                                className="flex-1 min-w-0 w-full bg-transparent px-1 py-2 text-[16px] text-white placeholder-gray-500 focus:outline-none resize-none overflow-y-auto max-h-28 leading-snug"
                                onChange={handleInputChange}
                                value={message}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <button
                            className={`w-11 h-11 flex items-center justify-center rounded-2xl text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex-shrink-0
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
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
            <AttachmentSheet
                open={showAttachmentSheet}
                onClose={() => setShowAttachmentSheet(false)}
                onCamera={handleSheetCamera}
                onGallery={handleSheetGallery}
            />
            <CameraScreen
                key={cameraOpen ? 'camera-open' : 'camera-closed'}
                open={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onSend={handleCameraSend}
            />
            </>
        );
    }

    // Desktop layout
    return (
        <>
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
                        onClick={handleAttachmentClick}
                        className="p-2 rounded-xl text-gray-500 hover:text-primary hover:bg-primary/10 transition-all duration-300 flex-shrink-0"
                        aria-label="Attach photo"
                        disabled={!!editingMessage}
                    >
                        <BsPaperclip className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            rows={1}
                            placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-300 resize-none overflow-y-auto max-h-32 leading-snug"
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
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
        <AttachmentSheet
            open={showAttachmentSheet}
            onClose={() => setShowAttachmentSheet(false)}
            onCamera={handleSheetCamera}
            onGallery={handleSheetGallery}
        />
        <CameraScreen
            key={cameraOpen ? 'camera-open' : 'camera-closed'}
            open={cameraOpen}
            onClose={() => setCameraOpen(false)}
            onSend={handleCameraSend}
        />
        </>
    )
}

export default SendMessage