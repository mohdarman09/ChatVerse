import React from 'react'
import { BsCamera, BsImage } from 'react-icons/bs'

const AttachmentSheet = ({ open, onClose, onCamera, onGallery }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--bg-secondary)] rounded-t-2xl border-t border-white/[0.08] px-4 pt-3 pb-5 safe-bottom-mobile animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-4" />
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider px-1 mb-2">Attachment</p>
        <button
          onClick={onCamera}
          className="flex items-center gap-3 w-full h-12 rounded-xl px-3 text-white hover:bg-white/5 transition-all"
          aria-label="Open camera"
        >
          <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/15 text-primary flex-shrink-0">
            <BsCamera className="w-4 h-4" />
          </span>
          <span className="text-sm">Open Camera</span>
        </button>
        <button
          onClick={onGallery}
          className="flex items-center gap-3 w-full h-12 rounded-xl px-3 text-white hover:bg-white/5 transition-all"
          aria-label="Choose from gallery"
        >
          <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/15 text-primary flex-shrink-0">
            <BsImage className="w-4 h-4" />
          </span>
          <span className="text-sm">Choose from Gallery</span>
        </button>
        <button
          onClick={onClose}
          className="w-full h-11 rounded-xl mt-2 text-gray-300 hover:text-white hover:bg-white/5 transition-all text-sm"
          aria-label="Close attachment menu"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AttachmentSheet;