import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'

const CallContext = createContext(null);

const STUN_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const NO_ANSWER_TIMEOUT = 30000;

export const CallProvider = ({ children }) => {
  const { socket } = useSelector(state => state.socketReducer);
  const { userProfile } = useSelector(state => state.userReducer);

  const myId = userProfile?.profile?._id;
  const myName = userProfile?.profile?.fullName;
  const myAvatar = userProfile?.profile?.avatar;

  const [call, setCall] = useState({ status: 'idle', peer: null });
  const [muted, setMuted] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerIdRef = useRef(null);
  const pendingIceRef = useRef([]);
  const offerRef = useRef(null);
  const timeoutRef = useRef(null);
  const disconnectGraceRef = useRef(null);
  const busyRef = useRef(false);
  const mutedRef = useRef(false);
  const endedTimerRef = useRef(null);
  const statusRef = useRef('idle');

  useEffect(() => {
    statusRef.current = call.status;
  }, [call.status]);

  const resetSession = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearTimeout(disconnectGraceRef.current);
    if (endedTimerRef.current) {
      clearTimeout(endedTimerRef.current);
      endedTimerRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      try { pcRef.current.close(); } catch (e) {}
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    setRemoteStream(null);
    setMuted(false);
    mutedRef.current = false;
    pendingIceRef.current = [];
    offerRef.current = null;
    peerIdRef.current = null;
  }, []);

  const endCallInternal = useCallback((opts = {}) => {
    const { silent, showEnded } = opts;
    busyRef.current = false;
    resetSession();
    if (silent) {
      setCall({ status: 'idle', peer: null });
      return;
    }
    if (showEnded) {
      setCall((c) => ({ ...c, status: 'ended' }));
      endedTimerRef.current = setTimeout(() => {
        setCall({ status: 'idle', peer: null });
      }, 1500);
    } else {
      setCall({ status: 'idle', peer: null });
    }
  }, [resetSession]);

  const attachPeerConnectionHandlers = useCallback((pc) => {
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('call:ice', { to: peerIdRef.current, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      if (e.streams?.[0]) {
        remoteStreamRef.current = e.streams[0];
        setRemoteStream(e.streams[0]);
      }
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        clearTimeout(timeoutRef.current);
        clearTimeout(disconnectGraceRef.current);
        setCall((c) => ({ ...c, status: 'connected' }));
      } else if (st === 'disconnected' && busyRef.current) {
        clearTimeout(disconnectGraceRef.current);
        disconnectGraceRef.current = setTimeout(() => {
          if (busyRef.current) {
            toast.error('Call connection lost.');
            endCallInternal({ showEnded: true });
          }
        }, 5000);
      } else if (st === 'failed' && busyRef.current) {
        toast.error('Call connection failed.');
        endCallInternal({ showEnded: true });
      }
    };
  }, [socket, endCallInternal]);

  useEffect(() => {
    if (!socket) return;

    const onIncoming = ({ from, fromName, fromAvatar, offer }) => {
      if (!from || !offer) return;
      if (busyRef.current) {
        socket.emit('call:reject', { to: from, reason: 'busy' });
        return;
      }
      busyRef.current = true;
      peerIdRef.current = String(from);
      offerRef.current = offer;
      setCall({ status: 'incoming', peer: { id: from, name: fromName, avatar: fromAvatar } });
      timeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'incoming') {
          socket.emit('call:reject', { to: from, reason: 'timeout' });
          endCallInternal({ silent: true });
          toast.error('Call not answered.');
        }
      }, NO_ANSWER_TIMEOUT);
    };

    const onAnswer = async ({ from, answer }) => {
      if (!pcRef.current || String(from) !== String(peerIdRef.current) || !answer) return;
      clearTimeout(timeoutRef.current);
      setCall((c) => ({ ...c, status: 'connecting' }));
      try {
        await pcRef.current.setRemoteDescription(answer);
        const pending = pendingIceRef.current;
        pendingIceRef.current = [];
        for (const candidate of pending) {
          pcRef.current.addIceCandidate(candidate).catch(() => {});
        }
      } catch (err) {
        toast.error('Call connection failed.');
        endCallInternal({});
      }
    };

    const onIce = ({ from, candidate }) => {
      if (String(from) !== String(peerIdRef.current) || !pcRef.current || !candidate) return;
      if (pcRef.current.remoteDescription) {
        pcRef.current.addIceCandidate(candidate).catch(() => {});
      } else {
        pendingIceRef.current.push(candidate);
      }
    };

    const onRejected = ({ from, reason }) => {
      if (String(from) !== String(peerIdRef.current)) return;
      clearTimeout(timeoutRef.current);
      const msg =
        reason === 'busy' ? 'User is busy in another call.'
        : reason === 'timeout' ? 'No answer. Call ended.'
        : 'Call rejected.';
      toast.error(msg);
      endCallInternal({});
    };

    const onCancelled = ({ from }) => {
      if (String(from) !== String(peerIdRef.current)) return;
      clearTimeout(timeoutRef.current);
      endCallInternal({ silent: true });
    };

    const onEnded = ({ from }) => {
      if (String(from) !== String(peerIdRef.current)) return;
      clearTimeout(timeoutRef.current);
      endCallInternal({ showEnded: true });
    };

    const onFailed = ({ reason }) => {
      clearTimeout(timeoutRef.current);
      if (reason === 'offline') toast.error('User is offline. Call not started.');
      else if (reason === 'busy') toast.error('User is busy in another call.');
      else toast.error('Call failed.');
      endCallInternal({});
    };

    const onDisconnect = () => {
      if (busyRef.current) endCallInternal({ silent: true });
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:answer', onAnswer);
    socket.on('call:ice', onIce);
    socket.on('call:rejected', onRejected);
    socket.on('call:cancelled', onCancelled);
    socket.on('call:ended', onEnded);
    socket.on('call:failed', onFailed);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:answer', onAnswer);
      socket.off('call:ice', onIce);
      socket.off('call:rejected', onRejected);
      socket.off('call:cancelled', onCancelled);
      socket.off('call:ended', onEnded);
      socket.off('call:failed', onFailed);
      socket.off('disconnect', onDisconnect);
      endCallInternal({ silent: true });
    };
  }, [socket, endCallInternal]);

  const getMicrophone = async () => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      if (err?.name === 'NotAllowedError') toast.error('Microphone permission denied. Allow microphone access to make calls.');
      else if (err?.name === 'NotFoundError') toast.error('No microphone found on this device.');
      else toast.error('Could not access the microphone.');
      return null;
    }
  };

  const startCall = useCallback(async (user) => {
    if (busyRef.current) {
      toast.error('You are already in a call.');
      return;
    }
    if (!socket || !user?._id || !myId) return;
    if (String(user._id) === String(myId)) return;

    const stream = await getMicrophone();
    if (!stream) return;

    busyRef.current = true;
    peerIdRef.current = String(user._id);
    setMuted(false);
    mutedRef.current = false;
    setCall({ status: 'calling', peer: { id: user._id, name: user.fullName, avatar: user.avatar } });

    localStreamRef.current = stream;
    const pc = new RTCPeerConnection(STUN_CONFIG);
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    attachPeerConnectionHandlers(pc);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call:start', {
        to: String(user._id),
        offer,
        fromName: myName,
        fromAvatar: myAvatar,
      });
      timeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'calling') {
          socket.emit('call:cancel', { to: peerIdRef.current });
          endCallInternal({ silent: true });
          toast.error('No answer. Call ended.');
        }
      }, NO_ANSWER_TIMEOUT);
    } catch (err) {
      toast.error('Could not start the call.');
      endCallInternal({});
    }
  }, [socket, myId, myName, myAvatar, attachPeerConnectionHandlers]);

  const acceptCall = useCallback(async () => {
    const peerId = peerIdRef.current;
    if (!socket || !peerId) return;
    const stream = await getMicrophone();
    if (!stream) {
      socket.emit('call:reject', { to: peerId, reason: 'mic' });
      endCallInternal({ silent: true });
      return;
    }
    clearTimeout(timeoutRef.current);
    localStreamRef.current = stream;
    setMuted(false);
    mutedRef.current = false;
    setCall((c) => ({ ...c, status: 'connecting' }));

    const pc = new RTCPeerConnection(STUN_CONFIG);
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    attachPeerConnectionHandlers(pc);

    try {
      await pc.setRemoteDescription(offerRef.current);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call:accept', { to: peerId, answer });
    } catch (err) {
      toast.error('Could not answer the call.');
      socket.emit('call:reject', { to: peerId });
      endCallInternal({});
    }
  }, [socket, attachPeerConnectionHandlers]);

  const rejectCall = useCallback(() => {
    if (!socket || !peerIdRef.current) return;
    socket.emit('call:reject', { to: peerIdRef.current });
    endCallInternal({ silent: true });
  }, [socket]);

  const cancelCall = useCallback(() => {
    if (!socket || !peerIdRef.current) return;
    socket.emit('call:cancel', { to: peerIdRef.current });
    endCallInternal({ silent: true });
  }, [socket]);

  const endCall = useCallback(() => {
    if (!socket || !peerIdRef.current) return;
    socket.emit('call:end', { to: peerIdRef.current });
    endCallInternal({ showEnded: true });
  }, [socket]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !mutedRef.current;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    mutedRef.current = next;
    setMuted(next);
  }, []);

  return (
    <CallContext.Provider
      value={{ call, muted, remoteStream, startCall, acceptCall, rejectCall, cancelCall, endCall, toggleMute }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
};

export default CallProvider;