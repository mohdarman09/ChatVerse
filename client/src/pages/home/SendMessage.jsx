import React, { useState, useRef, useEffect, useCallback } from 'react'
import { IoSend } from "react-icons/io5";
import { BsPaperclip, BsPencil, BsReply, BsX } from "react-icons/bs";
import { useDispatch, useSelector } from 'react-redux';
import { sendMessageThunk, editMessageThunk } from '../../store/slice/message/message.thunk';
import toast from 'react-hot-toast';
import AttachmentSheet from '../../components/AttachmentSheet';
import CameraScreen from '../../components/CameraScreen';

function SendMessage({ isMobile, replyTo, onCancelReply, editingMessage, onCancelEdit }) {
    const [message, setMessage] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
    const [cameraOpen, setCameraOpen] = useState(false);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const dispatch = useDispatch();
    const { selectedUser, userProfile } = useSelector(state => state.userReducer);
    const { buttonLoading } = useSelector(state => state.messageReducer);
    const { socket } = useSelector(state => state.socketReducer);

    const currentPeerIdRef = useRef(selectedUser?._id);

    // Auto-focus and prefill input when editing
    useEffect(() => {
        if (editingMessage) {
            setMessage(editingMessage.message || "");
            inputRef.current?.focus();
        }
    }, [editingMessage]);

    // Auto-focus when replying
    useEffect(() => {
        if (replyTo) {
            inputRef.current?.focus();
        }
    }, [replyTo]);

    // Immediate stop typing function
    const stopTypingImmediate = useCallback(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        const peerId = currentPeerIdRef.current;
        if (isTypingRef.current && socket && peerId) {
            isTypingRef.current = false;
            socket.emit("stopTyping", { recieverId: peerId });
        }
    }, [socket]);

    // Stop typing for previous user when switching chat conversation
    useEffect(() => {
        if (currentPeerIdRef.current && currentPeerIdRef.current !== selectedUser?._id) {
            stopTypingImmediate();
        }
        currentPeerIdRef.current = selectedUser?._id;
    }, [selectedUser?._id, stopTypingImmediate]);

    // Clean up typing and timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
            const peerId = currentPeerIdRef.current;
            if (isTypingRef.current && socket && peerId) {
                isTypingRef.current = false;
                socket.emit("stopTyping", { recieverId: peerId });
            }
        };
    }, [socket]);

    // Clean up object URLs
    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size must be less than 10MB');
            return;
        }

        if (imagePreview) URL.revokeObjectURL(imagePreview);

        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeSelectedImage = () => {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSendMessage = async () => {
        const trimmed = message.trim();
        if (!trimmed && !selectedImage) return;
        if (buttonLoading || imageUploading) return;

        stopTypingImmediate();

        // Handle edit mode
        if (editingMessage) {
            if (!trimmed) {
                toast.error("Message cannot be empty");
                return;
            }
            const res = await dispatch(editMessageThunk({
                messageId: editingMessage._id,
                message: trimmed
            }));
            if (editMessageThunk.fulfilled.match(res)) {
                setMessage("");
                if (onCancelEdit) onCancelEdit();
            }
            return;
        }

        // Handle image upload + message send
        if (selectedImage) {
            setImageUploading(true);
            try {
                const res = await dispatch(sendMessageThunk({
                    recieverId: selectedUser?._id,
                    message: trimmed || undefined,
                    image: selectedImage,
                    replyTo: replyTo || undefined
                }));

                if (sendMessageThunk.fulfilled.match(res)) {
                    setMessage("");
                    removeSelectedImage();
                    if (onCancelReply) onCancelReply();
                }
            } catch {
                // error handled in thunk
            } finally {
                setImageUploading(false);
            }
            return;
        }

        // Handle text-only message send
        const res = await dispatch(sendMessageThunk({
            recieverId: selectedUser?._id,
            message: trimmed,
            replyTo: replyTo || undefined
        }));

        if (sendMessageThunk.fulfilled.match(res)) {
            setMessage("");
            if (onCancelReply) onCancelReply();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setMessage(val);

        if (!socket || !selectedUser?._id) return;

        if (!val.trim()) {
            stopTypingImmediate();
            return;
        }

        if (!isTypingRef.current) {
            isTypingRef.current = true;
            const senderName = userProfile?.profile?.fullName || userProfile?.profile?.username || "Someone";
            socket.emit("typing", { recieverId: selectedUser._id, senderName });
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            const peerId = currentPeerIdRef.current;
            if (isTypingRef.current && socket && peerId) {
                isTypingRef.current = false;
                socket.emit("stopTyping", { recieverId: peerId });
            }
            typingTimeoutRef.current = null;
        }, 2000);
    };

    const handleInputBlur = () => {
        stopTypingImmediate();
    };

    const handleAttachmentClick = () => {
        if (isMobile) {
            setShowAttachmentSheet(true);
        } else {
            fileInputRef.current?.click();
        }
    };

    const handleSheetCamera = () => {
        setShowAttachmentSheet(false);
        setCameraOpen(true);
    };

    const handleSheetGallery = () => {
        setShowAttachmentSheet(false);
        fileInputRef.current?.click();
    };

    const handleCameraSend = (file) => {
        setCameraOpen(false);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleCancelReply = () => {
        if (onCancelReply) onCancelReply();
    };

    const handleCancelEdit = () => {
        if (onCancelEdit) onCancelEdit();
        setMessage("");
    };

    const canSend = (message.trim() || selectedImage) && !buttonLoading && !imageUploading;

    // Mobile layout
    if (isMobile) {
        return (
            <>
            <div className="sticky bottom-0 z-20 glass border-t border-[var(--border-color)] safe-bottom-composer">
                {(replyTo || editingMessage) && (
                    <div className="px-2 pt-2">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                            <div className={`p-1 rounded flex-shrink-0 ${editingMessage ? 'bg-yellow-500/20 text-yellow-500' : 'bg-primary/20 text-primary'}`}>
                                {editingMessage ? <BsPencil className="w-3 h-3" /> : <BsReply className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-primary truncate">
                                    {editingMessage ? 'Editing message' : `Reply to ${replyTo?.senderName}`}
                                </p>
                                <p className="text-[10px] font-normal text-[var(--text-muted)] truncate">
                                    {editingMessage ? editingMessage.message : replyTo?.message}
                                </p>
                            </div>
                            <button
                                onClick={editingMessage ? handleCancelEdit : handleCancelReply}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--user-hover-bg)] transition-colors flex-shrink-0"
                            >
                                <BsX className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
                {imagePreview && (
                    <div className="px-2 pt-2">
                        <div className="relative inline-block max-w-full rounded-xl overflow-hidden border border-[var(--border-color)] bg-black/40 shadow-sm">
                            <img src={imagePreview} alt="Preview" className="max-h-28 w-auto object-contain" />
                            <button
                                onClick={removeSelectedImage}
                                className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black/90 transition-all"
                                aria-label="Remove image"
                            >
                                <BsX className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
                <div className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={handleAttachmentClick}
                            className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-primary hover:bg-[var(--user-hover-bg)] transition-colors flex-shrink-0"
                            aria-label="Attach photo"
                            disabled={!!editingMessage}
                        >
                            <BsPaperclip className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0 flex items-center rounded-xl bg-[var(--bg-input)] border border-[var(--border-input)] px-2 py-0.5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                            <textarea
                                ref={inputRef}
                                rows={1}
                                placeholder={editingMessage ? "Edit message..." : "Message"}
                                className="flex-1 min-w-0 w-full bg-transparent px-1 py-1.5 text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none overflow-y-auto max-h-24 leading-snug"
                                onChange={handleInputChange}
                                onBlur={handleInputBlur}
                                value={message}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <button
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex-shrink-0
                                ${editingMessage
                                    ? 'bg-yellow-500 text-white shadow-sm shadow-yellow-500/25'
                                    : 'glossy-icon-btn'
                                }`}
                            onClick={handleSendMessage}
                            disabled={!canSend}
                            aria-label={editingMessage ? "Save edit" : "Send message"}
                        >
                            {imageUploading || buttonLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : editingMessage ? (
                                <BsPencil className="w-4 h-4 text-white" />
                            ) : (
                                <IoSend className="w-4 h-4 text-white fill-white translate-x-0.5" />
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
        <div className="sticky bottom-0 glass border-t border-[var(--border-color)]">
            {(replyTo || editingMessage) && (
                <div className="px-3 pt-2">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] max-w-4xl mx-auto">
                        <div className={`p-1 rounded flex-shrink-0 ${editingMessage ? 'bg-yellow-500/20 text-yellow-500' : 'bg-primary/20 text-primary'}`}>
                            {editingMessage ? <BsPencil className="w-3 h-3" /> : <BsReply className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-primary truncate">
                                {editingMessage ? 'Editing message' : `Reply to ${replyTo?.senderName}`}
                            </p>
                            <p className="text-[10px] font-normal text-[var(--text-muted)] truncate">
                                {editingMessage ? editingMessage.message : replyTo?.message}
                            </p>
                        </div>
                        <button
                            onClick={editingMessage ? handleCancelEdit : handleCancelReply}
                            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--user-hover-bg)] transition-colors flex-shrink-0"
                        >
                            <BsX className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
            {imagePreview && (
                <div className="px-3 pt-2">
                    <div className="relative inline-block rounded-xl overflow-hidden border border-[var(--border-color)] bg-black/40 shadow-sm max-w-4xl mx-auto">
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-h-28 w-auto object-contain"
                        />
                        <button
                            onClick={removeSelectedImage}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black/90 transition-all"
                            aria-label="Remove image"
                        >
                            <BsX className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
            <div className="p-2.5">
                <div className="flex items-center gap-2 max-w-4xl mx-auto">
                    <button
                        onClick={handleAttachmentClick}
                        className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-primary hover:bg-[var(--user-hover-bg)] transition-colors flex-shrink-0"
                        aria-label="Attach photo"
                        disabled={!!editingMessage}
                    >
                        <BsPaperclip className="w-4 h-4" />
                    </button>
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            rows={1}
                            placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl pl-3.5 pr-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none overflow-y-auto max-h-28 leading-snug"
                            onChange={handleInputChange}
                            onBlur={handleInputBlur}
                            value={message}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <button
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex-shrink-0
                            ${editingMessage
                                ? 'bg-yellow-500 text-white shadow-sm shadow-yellow-500/25'
                                : 'glossy-icon-btn'
                            }`}
                        onClick={handleSendMessage}
                        disabled={!canSend}
                        aria-label={editingMessage ? "Save edit" : "Send message"}
                    >
                        {imageUploading || buttonLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : editingMessage ? (
                            <BsPencil className="w-4 h-4 text-white" />
                        ) : (
                            <IoSend className="w-4 h-4 text-white fill-white translate-x-0.5" />
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