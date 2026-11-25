import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import {
  MessageCircle, X, Send, ChevronLeft, Image as ImageIcon, Users,
  CheckCheck, Trash2, ExternalLink, Ban, Loader2, Reply, Smile,
  Pin, Flag, ShieldCheck, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND_BASE = (import.meta as any).env?.VITE_API_URL || "https://football-backend-m2a4.onrender.com";

const socket = io(BACKEND_BASE, {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

async function compressChatImage(file: File, maxWidth = 1024, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas indisponibil'));

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

interface Message {
  _id: string;
  room: string;
  author: string;
  authorRole?: string;
  message: string;
  imageUrl?: string;
  time: string;
  isDeleted?: boolean;
  replyTo?: { id: string; author: string; text: string };
  reactions?: { [emoji: string]: string[] };
  isPinned?: boolean;
  timestamp: string;
}

interface Conversation {
  roomId: string;
  title: string;
  image: string;
  lastMessage: string;
  timestamp: string;
  isMyListing: boolean;
}

interface ChatWidgetProps {
  user: any;
  roomID?: string;
  chatPartner?: any;
  onClose?: () => void;
  unreadCount?: number;
  onClearUnread?: () => void;
}

const AVAILABLE_EMOJIS = ['⚽', '❤️', '😂', '😮', '😢', '🔥'];

const formatDateSeparator = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Astăzi";
  if (date.toDateString() === yesterday.toDateString()) return "Ieri";
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const ChatWidget = ({
  user,
  roomID: initialRoomID,
  onClose,
  unreadCount = 0,
  onClearUnread,
}: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [activeRoom, setActiveRoom] = useState(initialRoomID || "general_chat");
  const [activeTitle, setActiveTitle] = useState("Chat General");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageList, setMessageList] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const messageContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showReactionPickerId, setShowReactionPickerId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.email === 'admin.nou@scout.ro';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('footballAppToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    setZoomScale(1);
    setZoomPos({ x: 0, y: 0 });
    isDraggingRef.current = false;
  }, [lightboxImage]);

  const renderTextWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const displayText = part.length > 30 ? part.substring(0, 27) + "..." : part;
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-emerald-300 hover:text-emerald-100 font-medium inline-flex items-center gap-1 mx-0.5 break-all"
            title={part}
          >
            {displayText} <ExternalLink className="w-3 h-3" />
          </a>
        );
      } else {
        const words = part.split(' ');
        return (
          <span key={index}>
            {words.map((word, wIdx) => {
              if (word.length > 30) {
                return (
                  <span key={wIdx} title={word} className="break-all cursor-help">
                    {word.substring(0, 27)}...{' '}
                  </span>
                );
              }
              return <span key={wIdx}>{word} </span>;
            })}
          </span>
        );
      }
    });
  };

  useEffect(() => {
    if (initialRoomID && initialRoomID !== "general_chat") {
      setActiveRoom(initialRoomID);
      setActiveTitle("Discuție anunț");
      setView('chat');
      setIsOpen(true);
      onClearUnread?.();
    }
  }, [initialRoomID, onClearUnread]);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      onClearUnread?.();
    }
  }, [isOpen, onClearUnread]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/messages/conversations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: user.email, name: user.name }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (activeRoom.startsWith('listing_')) {
          const currentConv = data.find((c: any) => c.roomId === activeRoom);
          if (currentConv) setActiveTitle(currentConv.title);
        }
      }
    } catch (e) {
      console.error("Err loading chats", e);
    }
  };

  useEffect(() => {
    if (isOpen && view === 'chat' && activeRoom) {
      socket.emit("join_room", activeRoom);
      setMessageList([]);
      setIsPartnerTyping(false);
      setReplyingTo(null);

      const handleReconnect = () => {
        socket.emit("join_room", activeRoom);
      };
      socket.on("connect", handleReconnect);
      return () => {
        socket.off("connect", handleReconnect);
      };
    }
  }, [isOpen, view, activeRoom]);

  useEffect(() => {
    const handleReceiveMessage = (data: Message) => {
      if (data.room === activeRoom) {
        setMessageList((list) => [...list, data]);
        setIsPartnerTyping(false);
        scrollToBottom();
      }
    };

    const handleLoadHistory = (history: any) => {
      setMessageList(history);
      setTimeout(scrollToBottom, 100);
    };

    const handleMessageUpdated = (updatedMsg: Message) => {
      setMessageList((currentList) => currentList.map((m) => (m._id === updatedMsg._id ? updatedMsg : m)));
    };

    const handleMessageHardDeleted = (data: { id: string; author: string }) => {
      setMessageList((currentList) => currentList.filter((m) => m._id !== data.id));
    };

    const handleDisplayTyping = (data: { isTyping: boolean }) => {
      setIsPartnerTyping(data.isTyping);
      scrollToBottom();
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("load_history", handleLoadHistory);
    socket.on("message_updated", handleMessageUpdated);
    socket.on("message_hard_deleted", handleMessageHardDeleted);
    socket.on("display_typing", handleDisplayTyping);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("load_history", handleLoadHistory);
      socket.off("message_updated", handleMessageUpdated);
      socket.off("message_hard_deleted", handleMessageHardDeleted);
      socket.off("display_typing", handleDisplayTyping);
    };
  }, [activeRoom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToMessage = (msgId: string) => {
    const element = messageContainerRefs.current[msgId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-emerald-500/15", "transition-colors", "duration-700", "rounded-xl");
      setTimeout(() => element.classList.remove("bg-emerald-500/15", "rounded-xl"), 1800);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressChatImage(file, 1024, 0.78);
        setSelectedImage(compressed);
      } catch {
        toast.error("Nu s-a putut procesa imaginea.");
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentMessage(e.target.value);
    socket.emit("typing", activeRoom);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket.emit("stop_typing", activeRoom), 2000);
  };

  const sendMessage = async () => {
    if (currentMessage.trim() !== "" || selectedImage) {
      setIsSending(true);
      const now = new Date();
      const timeStr = `${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}`;

      const payload: any = {
        room: activeRoom,
        author: user.name,
        authorRole: isAdmin ? 'admin' : 'user',
        message: currentMessage,
        imageBase64: selectedImage || "",
        time: timeStr,
      };

      if (replyingTo) {
        payload.replyTo = { id: replyingTo._id, author: replyingTo.author, text: replyingTo.message || "Imagine" };
      }

      try {
        const res = await fetch(`${BACKEND_BASE}/api/messages/send`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setCurrentMessage("");
          setSelectedImage(null);
          setReplyingTo(null);
          socket.emit("stop_typing", activeRoom);
        } else {
          toast.error("Eroare la trimiterea mesajului.");
        }
      } catch {
        toast.error("Eroare de conexiune.");
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm("Ștergi definitiv acest mesaj?")) return;
    try {
      await fetch(`${BACKEND_BASE}/api/messages/${msgId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user: user.name, userRole: user?.role, email: user?.email }),
      });
    } catch {}
  };

  const handleReact = async (msgId: string, emoji: string) => {
    setShowReactionPickerId(null);
    try {
      const res = await fetch(`${BACKEND_BASE}/api/messages/${msgId}/react`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ emoji, user: user.name }),
      });

      if (!res.ok) {
        toast.error("Nu am putut salva reacția.");
      }
    } catch {
      toast.error("Eroare de conexiune.");
    }
  };

  const handlePin = async (msgId: string) => {
    try {
      await fetch(`${BACKEND_BASE}/api/messages/${msgId}/pin`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      toast.error("Eroare la fixarea mesajului.");
    }
  };

  const handleReportMessage = async (msgId: string) => {
    if (!window.confirm("Raportezi acest mesaj către administratori?")) return;
    try {
      const res = await fetch(`${BACKEND_BASE}/api/messages/${msgId}/report`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user: user.name }),
      });
      if (res.ok) {
        toast.success("Mesajul a fost raportat.");
      }
    } catch {
      toast.error("Eroare la raportare.");
    }
  };

  const enterChat = (roomId: string, title: string) => {
    setActiveRoom(roomId);
    setActiveTitle(title);
    setView('chat');
    onClearUnread?.();
  };

  const goBack = () => {
    setView('list');
    fetchConversations();
  };

  const clampZoom = (val: number) => Math.min(4, Math.max(1, Number(val.toFixed(2))));

  const handleLightboxTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = zoomScale;
    } else if (e.touches.length === 1 && zoomScale > 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - zoomPos.x,
        y: e.touches[0].clientY - zoomPos.y,
      };
    }
  };

  const handleLightboxTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const next = clampZoom(pinchStartScaleRef.current * (dist / pinchStartDistRef.current));
      setZoomScale(next);
      if (next === 1) setZoomPos({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDraggingRef.current && zoomScale > 1) {
      e.preventDefault();
      setZoomPos({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    }
  };

  const handleLightboxTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchStartDistRef.current = null;
    if (e.touches.length === 0) isDraggingRef.current = false;
  };

  const groupedMessages: { [key: string]: Message[] } = {};
  messageList.forEach((msg) => {
    const dateKey = new Date(msg.timestamp).toDateString();
    if (!groupedMessages[dateKey]) groupedMessages[dateKey] = [];
    groupedMessages[dateKey].push(msg);
  });

  const activeConversationInfo = conversations.find((c) => c.roomId === activeRoom);
  const pinnedMessages = messageList.filter((m) => m.isPinned && !m.isDeleted);

  return (
    <>
      {/* Lightbox Imagini */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-sm flex flex-col justify-between p-3 sm:p-5 select-none"
          onMouseMove={(e) => {
            if (!isDraggingRef.current || zoomScale <= 1) return;
            setZoomPos({
              x: e.clientX - dragStartRef.current.x,
              y: e.clientY - dragStartRef.current.y,
            });
          }}
          onMouseUp={() => { isDraggingRef.current = false; }}
          onMouseLeave={() => { isDraggingRef.current = false; }}
        >
          <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-2 z-20">
            <div className="bg-[#11161D] text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg border border-white/[0.08] tabular-nums">
              Previzualizare • {Math.round(zoomScale * 100)}%
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const next = clampZoom(zoomScale - 0.5);
                  setZoomScale(next);
                  if (next === 1) setZoomPos({ x: 0, y: 0 });
                }}
                disabled={zoomScale <= 1}
                className="p-2 rounded-lg bg-[#11161D] hover:bg-white/[0.08] disabled:opacity-40 text-slate-200 border border-white/[0.08] transition-colors cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale((prev) => clampZoom(prev + 0.5))}
                disabled={zoomScale >= 4}
                className="p-2 rounded-lg bg-[#11161D] hover:bg-white/[0.08] disabled:opacity-40 text-slate-200 border border-white/[0.08] transition-colors cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { setZoomScale(1); setZoomPos({ x: 0, y: 0 }); }}
                className="p-2 rounded-lg bg-[#11161D] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 transition-colors ml-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            onWheel={(e) => {
              e.preventDefault();
              const next = clampZoom(zoomScale + (e.deltaY < 0 ? 0.25 : -0.25));
              setZoomScale(next);
              if (next === 1) setZoomPos({ x: 0, y: 0 });
            }}
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={handleLightboxTouchEnd}
            onClick={() => setLightboxImage(null)}
            style={{ touchAction: 'none' }}
            className="flex-1 w-full max-w-4xl mx-auto my-3 flex items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-black/40 relative"
          >
            <img
              src={lightboxImage}
              alt="Fullscreen"
              draggable={false}
              onMouseDown={(e) => {
                if (zoomScale <= 1) return;
                e.preventDefault();
                e.stopPropagation();
                isDraggingRef.current = true;
                dragStartRef.current = { x: e.clientX - zoomPos.x, y: e.clientY - zoomPos.y };
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (zoomScale === 1) setZoomScale(2);
              }}
              style={{
                transform: `translate3d(${zoomPos.x}px, ${zoomPos.y}px, 0) scale(${zoomScale})`,
                cursor: zoomScale > 1 ? 'grab' : 'zoom-in',
              }}
              className="max-w-full max-h-[75dvh] object-contain transition-transform duration-150 ease-out"
            />
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Desktop: folosește + / - sau rotița • Mobil: pinch sau glisează
          </p>
        </div>
      )}

      {/* CONTAINER WIDGET */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-[100000] flex flex-col items-end">
        {!isOpen && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              onClearUnread?.();
            }}
            aria-label="Deschide mesaje"
            className="relative bg-slate-900 dark:bg-[#11161D] border border-slate-700 dark:border-white/[0.12] hover:border-emerald-500/60 text-white p-3.5 rounded-full shadow-lg transition-colors flex items-center justify-center cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 bg-rose-500 text-white text-[10px] font-semibold rounded-full border-2 border-white dark:border-[#0B0F14] flex items-center justify-center tabular-nums">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}

        {isOpen && (
          <div className="bg-white dark:bg-[#0B0F14] w-full sm:w-[360px] md:w-[400px] fixed inset-0 sm:static sm:inset-auto h-[100dvh] sm:h-[62vh] sm:min-h-[480px] sm:max-h-[680px] sm:rounded-xl shadow-2xl sm:border border-slate-200 dark:border-white/[0.08] flex flex-col overflow-hidden z-[100001]">
            {/* HEADER */}
            <div className="bg-slate-50 dark:bg-[#11161D] px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.07] flex justify-between items-center z-20 shrink-0">
              {view === 'chat' && activeRoom.startsWith('listing_') && activeConversationInfo ? (
                <div className="flex items-center gap-2.5 w-full min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors shrink-0 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/[0.05] overflow-hidden shrink-0 border border-slate-200 dark:border-white/[0.08] flex items-center justify-center">
                    {activeConversationInfo.image ? (
                      <img src={activeConversationInfo.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-slate-900 dark:text-white truncate text-xs sm:text-sm leading-tight">
                      {activeTitle}
                    </h2>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Discuție privată
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {view === 'chat' && (
                    <button
                      type="button"
                      onClick={goBack}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-[200px]">
                      {view === 'list' ? 'Mesaje' : activeTitle}
                    </span>
                    {view === 'chat' && isPartnerTyping && (
                      <span className="text-[11px] text-emerald-500 font-medium">
                        Scrie...
                      </span>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onClose?.();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ZONA CENTRALĂ */}
            <div
              className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-[#0B0F14] relative"
              onClick={() => setShowReactionPickerId(null)}
            >
              {/* Mesaj fixat */}
              {view === 'chat' && pinnedMessages.length > 0 && (
                <div
                  onClick={() => scrollToMessage(pinnedMessages[0]._id)}
                  className="bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-2 flex items-center gap-2.5 sticky top-0 z-20 cursor-pointer hover:bg-amber-500/15 transition-colors backdrop-blur-sm"
                >
                  <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <div className="flex-1 truncate">
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block">
                      Mesaj fixat
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-200 truncate block">
                      {pinnedMessages[0].message || 'Imagine'}
                    </span>
                  </div>
                </div>
              )}

              {/* LISTĂ CONVERSAȚII */}
              {view === 'list' && (
                <div className="p-3 space-y-3 pb-24 sm:pb-4">
                  <div
                    onClick={() => enterChat("general_chat", "Chat General")}
                    className="bg-white dark:bg-[#11161D] p-3 rounded-xl cursor-pointer hover:border-emerald-500/40 transition-colors flex items-center gap-3 border border-slate-200 dark:border-white/[0.07]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                        Chat General
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        Discuții libere cu comunitatea
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 px-1 pt-1">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.07]" />
                    <span className="text-[11px] font-medium text-slate-400">Discuții private</span>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.07]" />
                  </div>

                  {conversations.length === 0 ? (
                    <div className="text-center py-10 flex flex-col items-center border border-slate-200 dark:border-white/[0.07] rounded-xl bg-white dark:bg-[#11161D]">
                      <MessageCircle className="w-7 h-7 mb-2 text-slate-400 opacity-60" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">Nicio conversație activă.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {conversations.map((conv) => (
                        <div
                          key={conv.roomId}
                          onClick={() => enterChat(conv.roomId, conv.title)}
                          className="bg-white dark:bg-[#11161D] p-2.5 rounded-xl cursor-pointer hover:border-emerald-500/40 transition-colors flex items-center gap-3 border border-slate-200 dark:border-white/[0.07]"
                        >
                          {conv.image ? (
                            <img
                              src={conv.image}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 dark:border-white/[0.08] shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center border border-slate-200 dark:border-white/[0.08] shrink-0">
                              <ImageIcon className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <div className="overflow-hidden flex-1">
                            <div className="flex justify-between items-center gap-2 mb-0.5">
                              <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate" title={conv.title}>
                                {conv.title}
                              </h4>
                              <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                                {new Date(conv.timestamp).toLocaleDateString('ro-RO', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <p className={`text-xs truncate w-full ${conv.lastMessage === "" ? "italic text-slate-400" : "text-slate-500 dark:text-slate-400"}`}>
                              {conv.lastMessage === "" ? "Mesaj șters" : conv.lastMessage}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ZONĂ MESAJE */}
              {view === 'chat' && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 p-3 space-y-4 overflow-y-auto pb-4">
                    {Object.keys(groupedMessages).length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <MessageCircle className="w-8 h-8 text-slate-400 opacity-50 mb-2" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Nu există mesaje încă. Începe conversația.</p>
                      </div>
                    )}

                    {Object.keys(groupedMessages).map((dateKey) => (
                      <div key={dateKey}>
                        <div className="flex justify-center mb-3 mt-1">
                          <span className="bg-slate-200/80 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 text-[10px] font-medium px-2.5 py-0.5 rounded-full">
                            {formatDateSeparator(dateKey)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {groupedMessages[dateKey].map((msg, idx, arr) => {
                            const isMe = msg.author === user?.name;
                            const isFirstInGroup = idx === 0 || arr[idx - 1].author !== msg.author;

                            return (
                              <div
                                key={idx}
                                ref={(el) => { messageContainerRefs.current[msg._id] = el; }}
                                className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isFirstInGroup ? "mt-3" : "mt-0.5"}`}
                              >
                                {!isMe && isFirstInGroup && (
                                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 ml-1 mb-1 flex items-center gap-1">
                                    {msg.authorRole === 'admin' && <ShieldCheck className="w-3 h-3 text-rose-500" />}
                                    {msg.author}
                                  </span>
                                )}

                                <div className={`group relative flex items-center gap-1.5 max-w-[90%] ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                                  {/* Bară acțiuni hover */}
                                  {!msg.isDeleted && (
                                    <div
                                      className={`opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.1] shadow-lg p-1 rounded-lg absolute -top-9 z-[30] ${isMe ? 'right-0' : 'left-0'} ${
                                        showReactionPickerId === msg._id ? 'opacity-100' : ''
                                      } max-md:active:opacity-100 max-md:focus:opacity-100`}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setShowReactionPickerId(msg._id); }}
                                        className="p-1 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded transition-colors cursor-pointer"
                                      >
                                        <Smile className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setReplyingTo(msg)}
                                        className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded transition-colors cursor-pointer"
                                      >
                                        <Reply className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handlePin(msg._id)}
                                        className={`p-1 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded transition-colors cursor-pointer ${msg.isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
                                      >
                                        <Pin className="w-3.5 h-3.5" />
                                      </button>

                                      {(isMe || isAdmin) && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteMessage(msg._id)}
                                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {!isMe && !isAdmin && msg.authorRole !== 'admin' && (
                                        <button
                                          type="button"
                                          onClick={() => handleReportMessage(msg._id)}
                                          className="p-1 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded transition-colors cursor-pointer"
                                        >
                                          <Flag className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* Picker reacții */}
                                  {showReactionPickerId === msg._id && (
                                    <div
                                      className={`absolute -top-11 z-[40] bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.1] shadow-xl rounded-xl px-1.5 py-1 flex gap-1 ${isMe ? 'right-0' : 'left-0'}`}
                                    >
                                      {AVAILABLE_EMOJIS.map((emoji) => (
                                        <button
                                          type="button"
                                          key={emoji}
                                          onClick={(e) => { e.stopPropagation(); handleReact(msg._id, emoji); }}
                                          className="hover:scale-125 transition-transform text-base px-1 cursor-pointer"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {msg.isDeleted ? (
                                    <div className="px-3 py-1.5 bg-slate-100 dark:bg-white/[0.03] border border-dashed border-slate-300 dark:border-white/[0.1] rounded-xl flex items-center gap-1.5">
                                      <Ban className="w-3 h-3 text-slate-400" />
                                      <span className="text-xs italic text-slate-400">Mesaj șters</span>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={() => {
                                        if (window.innerWidth < 768 && !msg.isDeleted) {
                                          setShowReactionPickerId(showReactionPickerId === msg._id ? null : msg._id);
                                        }
                                      }}
                                      className={`relative flex flex-col border ${
                                        isMe
                                          ? "bg-emerald-600 border-emerald-600 text-white rounded-xl rounded-tr-sm"
                                          : "bg-white dark:bg-[#11161D] text-slate-900 dark:text-slate-100 border-slate-200 dark:border-white/[0.07] rounded-xl rounded-tl-sm"
                                      }`}
                                    >
                                      {msg.replyTo && (
                                        <div
                                          onClick={(e) => { e.stopPropagation(); scrollToMessage(msg.replyTo!.id); }}
                                          className={`mx-2 mt-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer border-l-2 ${
                                            isMe
                                              ? 'bg-black/15 border-emerald-200 text-emerald-50'
                                              : 'bg-slate-100 dark:bg-white/[0.04] border-emerald-500 text-slate-600 dark:text-slate-300'
                                          }`}
                                        >
                                          <div className={`text-[10px] font-semibold mb-0.5 ${isMe ? 'text-emerald-200' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {msg.replyTo.author}
                                          </div>
                                          <div className="truncate max-w-[180px] opacity-90">{msg.replyTo.text}</div>
                                        </div>
                                      )}

                                      {msg.imageUrl && (
                                        <div
                                          className="relative overflow-hidden rounded-lg cursor-pointer m-1"
                                          onClick={(e) => { e.stopPropagation(); setLightboxImage(msg.imageUrl!); }}
                                        >
                                          <img
                                            src={msg.imageUrl}
                                            alt=""
                                            className={`max-w-[220px] sm:max-w-[260px] w-full max-h-56 object-cover rounded-lg ${msg.replyTo ? 'mt-1' : ''}`}
                                          />
                                          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent pointer-events-none rounded-b-lg" />
                                          <div className="absolute bottom-1.5 right-2 text-white text-[10px] font-medium flex items-center gap-1 tabular-nums">
                                            {msg.time} {isMe && <CheckCheck className="w-3 h-3 text-emerald-300" />}
                                          </div>
                                        </div>
                                      )}

                                      {msg.message && (
                                        <div className="px-3 py-2 text-xs sm:text-[13px] leading-relaxed break-words max-w-[250px] sm:max-w-[300px]">
                                          {renderTextWithLinks(msg.message)}
                                          {!msg.imageUrl && (
                                            <div className={`text-[10px] flex justify-end items-center gap-1 mt-1 tabular-nums ${isMe ? "text-emerald-100/80" : "text-slate-400"}`}>
                                              {msg.time} {isMe && <CheckCheck className="w-3 h-3" />}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                        <div
                                          className={`absolute -bottom-3 flex gap-1 bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.1] shadow-sm rounded-full px-1.5 py-0.5 z-10 ${isMe ? 'right-2' : 'left-2'}`}
                                        >
                                          {Object.entries(msg.reactions).map(([emoji, usersArr]) => (
                                            <button
                                              type="button"
                                              key={emoji}
                                              onClick={(e) => { e.stopPropagation(); handleReact(msg._id, emoji); }}
                                              className={`text-[10px] font-medium flex items-center gap-1 px-1 rounded-full transition-colors cursor-pointer ${
                                                usersArr.includes(user.name)
                                                  ? 'text-emerald-600 dark:text-emerald-400'
                                                  : 'text-slate-500 dark:text-slate-300'
                                              }`}
                                            >
                                              <span className="text-xs">{emoji}</span>
                                              <span className="tabular-nums">{usersArr.length}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {msg.reactions && Object.keys(msg.reactions).length > 0 && !msg.isDeleted && <div className="h-3" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {isPartnerTyping && (
                      <div className="flex items-center gap-1.5 mt-2 ml-1">
                        <div className="bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.07] px-3 py-2 rounded-xl rounded-tl-sm flex gap-1">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} className="h-2" />
                  </div>

                  {/* ZONA DE INPUT */}
                  <div className="bg-white dark:bg-[#11161D] border-t border-slate-200 dark:border-white/[0.07] flex flex-col z-20 pb-safe">
                    {replyingTo && (
                      <div className="px-3 py-2 bg-slate-50 dark:bg-[#0B0F14] border-b border-slate-200 dark:border-white/[0.07] flex justify-between items-center">
                        <div className="flex flex-col min-w-0 flex-1 border-l-2 border-emerald-500 pl-2.5">
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            Răspuns pentru {replyingTo.author}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {replyingTo.message || "Imagine"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyingTo(null)}
                          className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors ml-2 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {selectedImage && (
                      <div className="px-3 pt-2.5 pb-1 flex items-center gap-2.5">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-emerald-500/50">
                          <img src={selectedImage} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-0.5 right-0.5 bg-black/70 text-white p-0.5 rounded hover:bg-rose-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Imagine atașată
                        </span>
                      </div>
                    )}

                    <div className="p-2.5 flex gap-2 items-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageSelect}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-slate-500 hover:text-emerald-500 p-2 transition-colors bg-slate-100 dark:bg-white/[0.04] rounded-lg border border-slate-200 dark:border-white/[0.07] cursor-pointer"
                        title="Atașează imagine"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>

                      <div className="flex-1 bg-slate-50 dark:bg-[#0B0F14] rounded-lg flex items-center px-3 border border-slate-200 dark:border-white/[0.08] focus-within:border-emerald-500/60 transition-colors">
                        <input
                          type="text"
                          value={currentMessage}
                          onChange={handleInputChange}
                          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="Scrie un mesaj..."
                          className="w-full bg-transparent border-none outline-none text-xs sm:text-sm py-2 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={sendMessage}
                        disabled={isSending || (!currentMessage.trim() && !selectedImage)}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white p-2 rounded-lg transition-colors shrink-0 cursor-pointer"
                      >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};