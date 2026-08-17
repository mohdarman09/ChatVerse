import React from 'react'
import { BsCamera, BsImage } from 'react-icons/bs'

const AttachmentSheet = ({ open, onClose, onCamera, onGallery }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--bg-secondary)] rounded-t-2xl border-t border-[var(--border-color)] px-4 pt-3 pb-4 safe-bottom-mobile animate-slide-up shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-8 h-1 rounded-full bg-[var(--divider-color)] mx-auto mb-3" />
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider px-1 mb-2">Share Content</p>
        <div className="space-y-1">
          <button
            onClick={onCamera}
            className="flex items-center gap-3 w-full h-11 rounded-xl px-3 text-[var(--text-primary)] hover:bg-[var(--user-hover-bg)] transition-colors"
            aria-label="Open camera"
          >
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <BsCamera className="w-4 h-4" />
            </span>
            <span className="text-xs font-medium">Open Camera</span>
          </button>
          <button
            onClick={onGallery}
            className="flex items-center gap-3 w-full h-11 rounded-xl px-3 text-[var(--text-primary)] hover:bg-[var(--user-hover-bg)] transition-colors"
            aria-label="Choose from gallery"
          >
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <BsImage className="w-4 h-4" />
            </span>
            <span className="text-xs font-medium">Choose from Gallery</span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full h-9 rounded-xl mt-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--user-hover-bg)] transition-colors text-xs font-medium"
          aria-label="Close attachment menu"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AttachmentSheet;