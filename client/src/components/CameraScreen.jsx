import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { BsX, BsArrowRepeat, BsCheckLg, BsCamera } from 'react-icons/bs'

const CameraScreen = ({ open, onClose, onSend }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [view, setView] = useState('camera');
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [error, setError] = useState(null);
  const [staticError] = useState(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return 'Camera is not supported in this browser.';
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return 'Camera requires a secure connection (HTTPS or localhost).';
    }
    return null;
  });

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    if (!open || staticError) return;

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        if (cancelled) return;
        if (err?.name === 'NotAllowedError') {
          setError('Camera permission denied. Allow camera access in your browser settings, then try again.');
        } else if (err?.name === 'NotFoundError') {
          setError('No camera was found on this device.');
        } else if (err?.name === 'NotReadableError') {
          setError('The camera is being used by another application. Close it and try again.');
        } else {
          setError('Could not start the camera. Please try again.');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, staticError]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error('The camera is still starting. Try again in a moment.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Could not capture the photo. Please try again.');
        return;
      }
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      const url = URL.createObjectURL(blob);
      setCapturedFile(new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' }));
      setCapturedUrl(url);
      setView('captured');
    }, 'image/jpeg', 0.92);
  };

  const handleRetake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedFile(null);
    setView('camera');
    const video = videoRef.current;
    if (video && streamRef.current && !video.srcObject) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }
  };

  const handleSend = () => {
    if (!capturedFile) return;
    onSend(capturedFile);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-black animate-fade-in">
      <div className="flex items-center justify-between px-3 pt-3 safe-top-mobile">
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <BsCamera className="w-4 h-4 text-primary" />
          Camera
        </span>
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
          aria-label="Close camera"
        >
          <BsX className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative min-h-0 mx-3 my-2 rounded-2xl overflow-hidden bg-black">
        {view === 'camera' && !error && !staticError && (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
        {view === 'captured' && capturedUrl && (
          <img src={capturedUrl} alt="Captured photo" className="w-full h-full object-contain" />
        )}
        {(error || staticError) && (
          <div className="w-full h-full flex flex-col items-center justify-center px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <BsCamera className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{error || staticError}</p>
            <p className="text-xs text-gray-600 mt-2">You can close the camera and choose from the gallery instead.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-8 px-4 pb-6 safe-bottom-mobile">
        {view === 'camera' && !error && !staticError && (
          <button
            onClick={handleCapture}
            className="flex flex-col items-center gap-1.5"
            aria-label="Capture photo"
          >
            <span className="w-16 h-16 flex items-center justify-center rounded-full border-4 border-white bg-white/10 shadow-lg active:scale-95 transition-all">
              <span className="w-12 h-12 rounded-full bg-white" />
            </span>
            <span className="text-xs text-gray-400">Capture</span>
          </button>
        )}
        {view === 'captured' && (
          <>
            <button
              onClick={handleRetake}
              className="flex flex-col items-center gap-1.5"
              aria-label="Retake photo"
            >
              <span className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 text-white shadow-lg active:scale-95 transition-all">
                <BsArrowRepeat className="w-6 h-6" />
              </span>
              <span className="text-xs text-gray-400">Retake</span>
            </button>
            <button
              onClick={handleSend}
              className="flex flex-col items-center gap-1.5"
              aria-label="Send photo"
            >
              <span className="w-14 h-14 flex items-center justify-center rounded-full gradient-primary text-white shadow-lg shadow-primary/30 active:scale-95 transition-all">
                <BsCheckLg className="w-6 h-6" />
              </span>
              <span className="text-xs text-gray-400">Send</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CameraScreen;