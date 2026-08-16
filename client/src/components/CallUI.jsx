import React, { useEffect, useRef, useState } from 'react'
import { useCall } from '../context/CallContext'
import { BsTelephone, BsTelephoneX, BsMic, BsMicMute } from 'react-icons/bs'

const CallUI = () => {
  const { call, muted, remoteStream, acceptCall, rejectCall, cancelCall, endCall, toggleMute } = useCall();
  const { status, peer } = call;
  const audioRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (status !== 'connected') {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  if (status === 'idle') return null;

  const name = peer?.name || 'User';
  const statusText =
    status === 'incoming' ? 'Incoming call…'
    : status === 'calling' ? 'Ringing…'
    : status === 'connecting' ? 'Connecting…'
    : status === 'connected' ? 'Connected'
    : 'Call ended';

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <>
      <audio ref={audioRef} autoPlay playsInline />
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="relative w-full max-w-sm glass-card rounded-2xl p-6 sm:p-8 text-center animate-scale-in">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-2 ring-primary/30 mx-auto mb-4">
            <img
              src={peer?.avatar}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${name}&background=6366F1&color=fff`;
              }}
            />
          </div>
          <h3 className="text-lg font-semibold text-white truncate">{name}</h3>
          <p className="text-sm text-gray-400 mt-1">
            {status === 'connected' && elapsed > 0 ? `${statusText} · ${fmtTime(elapsed)}` : statusText}
          </p>

          <div className="flex items-center justify-center gap-4 mt-6">
            {status === 'incoming' && (
              <>
                <button
                  onClick={rejectCall}
                  className="flex flex-col items-center gap-2 group"
                  aria-label="Reject call"
                >
                  <span className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-red-500/90 text-white shadow-lg shadow-red-500/30 transition-all active:scale-95">
                    <BsTelephoneX className="w-6 h-6" />
                  </span>
                  <span className="text-xs text-gray-400">Reject</span>
                </button>
                <button
                  onClick={acceptCall}
                  className="flex flex-col items-center gap-2 group"
                  aria-label="Accept call"
                >
                  <span className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-green-500/90 text-white shadow-lg shadow-green-500/30 transition-all active:scale-95">
                    <BsTelephone className="w-6 h-6" />
                  </span>
                  <span className="text-xs text-gray-400">Accept</span>
                </button>
              </>
            )}

            {(status === 'calling' || status === 'connecting') && (
              <button
                onClick={status === 'connecting' ? endCall : cancelCall}
                className="flex flex-col items-center gap-2 group"
                aria-label={status === 'connecting' ? 'End call' : 'Cancel call'}
              >
                <span className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-red-500/90 text-white shadow-lg shadow-red-500/30 transition-all active:scale-95">
                  <BsTelephoneX className="w-6 h-6" />
                </span>
                <span className="text-xs text-gray-400">{status === 'calling' ? 'Cancel' : 'End'}</span>
              </button>
            )}

            {status === 'connected' && (
              <>
                <button
                  onClick={toggleMute}
                  className="flex flex-col items-center gap-2 group"
                  aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  <span
                    className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-95
                      ${muted ? 'bg-red-500/90 shadow-red-500/30' : 'bg-white/10 hover:bg-white/20 shadow-black/20'}`}
                  >
                    {muted ? <BsMicMute className="w-6 h-6" /> : <BsMic className="w-6 h-6" />}
                  </span>
                  <span className="text-xs text-gray-400">{muted ? 'Unmute' : 'Mute'}</span>
                </button>
                <button
                  onClick={endCall}
                  className="flex flex-col items-center gap-2 group"
                  aria-label="End call"
                >
                  <span className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-red-500/90 text-white shadow-lg shadow-red-500/30 transition-all active:scale-95">
                    <BsTelephoneX className="w-6 h-6" />
                  </span>
                  <span className="text-xs text-gray-400">End</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CallUI;