import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { MessageCircle, X, Send, User, ChevronLeft, Image as ImageIcon, Users, Check, CheckCheck, Trash2, ExternalLink, Ban, Loader2, Reply, Smile, Pin, Flag, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const socket = io((import.meta as any).env.VITE_API_URL || "https://football-backend-m2a4.onrender.com");

interface Message {
  _id: string; 
  room: string;
  author: string;
  authorRole?: string; 
  message: string;
  imageUrl?: string;
  time: string;
  isDeleted?: boolean;
  replyTo?: { id: string, author: string, text: string }; 
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
}

const AVAILABLE_EMOJIS = ['⚽', '❤️', '😂', '😮', '😢', '🔥'];

const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) return "ZI DE MECI (AZI)";
    if (date.toDateString() === yesterday.toDateString()) return "ANTRENAMENT (IERI)";
    return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
};

export const ChatWidget = ({ user, roomID: initialRoomID, onClose }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [activeRoom, setActiveRoom] = useState(initialRoomID || "general_chat");
  const [activeTitle, setActiveTitle] = useState("Tribuna Oficială");
  
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
  
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showReactionPickerId, setShowReactionPickerId] = useState<string | null>(null);

  const API_BASE = (import.meta as any).env.VITE_API_URL || 'https://football-backend-m2a4.onrender.com';

  const isAdmin = user?.role === 'admin' || user?.email === 'admin.nou@scout.ro';

  const renderTextWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            const displayText = part.length > 30 ? part.substring(0, 27) + "..." : part;
            return (
                <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline text-emerald-300 hover:text-emerald-100 font-black inline-flex items-center gap-1 mx-1 break-all tracking-wider" title={part}>
                    {displayText} <ExternalLink className="w-3 h-3"/>
                </a>
            );
        } else {
            const words = part.split(' ');
            return (
                <span key={index}>
                    {words.map((word, wIdx) => {
                        if (word.length > 30) return <span key={wIdx} title={word} className="break-all cursor-help">{word.substring(0, 27)}...{' '}</span>;
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
        setActiveTitle("Negocieri Transfer"); 
        setView('chat');
        setIsOpen(true);
    }
  }, [initialRoomID]);

  useEffect(() => { if (isOpen) fetchConversations(); }, [isOpen]);

  const fetchConversations = async () => {
      try {
          const res = await fetch(`${API_BASE}/api/messages/conversations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, name: user.name })
          });
          if (res.ok) {
              const data = await res.json();
              setConversations(data);
              if (activeRoom.startsWith('listing_')) {
                  const currentConv = data.find((c: any) => c.roomId === activeRoom);
                  if (currentConv) setActiveTitle(currentConv.title);
              }
          }
      } catch (e) { console.error("Err loading chats", e); }
  };

  useEffect(() => {
    if (isOpen && view === 'chat' && activeRoom) {
      socket.emit("join_room", activeRoom);
      setMessageList([]); 
      setIsPartnerTyping(false);
      setReplyingTo(null);
    }
  }, [isOpen, view, activeRoom]);

  useEffect(() => {
    socket.on("receive_message", (data: Message) => {
      if (data.room === activeRoom) {
          setMessageList((list) => [...list, data]);
          setIsPartnerTyping(false);
          scrollToBottom();
      }
    });
    
    socket.on("load_history", (history: any) => {
        setMessageList(history);
        setTimeout(scrollToBottom, 100);
    });

    socket.on("message_updated", (updatedMsg: Message) => {
        setMessageList((currentList) => currentList.map(m => m._id === updatedMsg._id ? updatedMsg : m));
    });

    socket.on("message_hard_deleted", (data: { id: string, author: string }) => {
        setMessageList((currentList) => currentList.filter(m => m._id !== data.id));
    });

    socket.on("display_typing", (data: { isTyping: boolean }) => {
        setIsPartnerTyping(data.isTyping);
        scrollToBottom();
    });

    return () => { 
        socket.off("receive_message"); 
        socket.off("load_history"); 
        socket.off("message_updated"); 
        socket.off("message_hard_deleted");
        socket.off("display_typing");
    }
  }, [activeRoom]);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  
  const scrollToMessage = (msgId: string) => {
      const element = messageContainerRefs.current[msgId];
      if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("bg-emerald-500/20", "transition-colors", "duration-1000", "rounded-2xl");
          setTimeout(() => element.classList.remove("bg-emerald-500/20", "rounded-2xl"), 2000);
      }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 5 * 1024 * 1024) return toast.error("Fotografia e prea grea (Max 5MB)");
          const reader = new FileReader();
          reader.onloadend = () => { setSelectedImage(reader.result as string); };
          reader.readAsDataURL(file);
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
      const timeStr = new Date().getHours() + ":" + (new Date().getMinutes() < 10 ? '0' : '') + new Date().getMinutes();
      
      const payload: any = {
          room: activeRoom, 
          author: user.name, 
          authorRole: isAdmin ? 'admin' : 'user',
          message: currentMessage, 
          imageBase64: selectedImage || "", 
          time: timeStr
      };

      if (replyingTo) {
          payload.replyTo = { id: replyingTo._id, author: replyingTo.author, text: replyingTo.message || "Fotografie" };
      }
      
      try {
          const res = await fetch(`${API_BASE}/api/messages/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (res.ok) {
              setCurrentMessage("");
              setSelectedImage(null);
              setReplyingTo(null);
              socket.emit("stop_typing", activeRoom);
          } else { toast.error("Eroare pe traseu."); }
      } catch (e) { toast.error("Eroare de conexiune la stadion."); } finally { setIsSending(false); }
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
      if (!window.confirm("Anulezi mesajul definitiv?")) return;
      try {
          await fetch(`${API_BASE}/api/messages/${msgId}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user: user.name, userRole: user?.role, email: user?.email }) 
          });
      } catch (err) {}
  };

  const handleReact = async (msgId: string, emoji: string) => {
      setShowReactionPickerId(null);
      try {
          const res = await fetch(`${API_BASE}/api/messages/${msgId}/react`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ emoji, user: user.name }) 
          });
          
          if (!res.ok) {
              toast.error("Tabela se actualizează. Mai așteaptă!");
          }
      } catch (err) { 
          toast.error("Fără conexiune la rețea."); 
      }
  };

  const handlePin = async (msgId: string) => {
      try {
          await fetch(`${API_BASE}/api/messages/${msgId}/pin`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
          });
      } catch (err) { toast.error("Eroare la prinderea mesajului."); }
  };

  const handleReportMessage = async (msgId: string) => {
      if (!window.confirm("Chemi VAR-ul pentru acest mesaj neadecvat?")) return;
      try {
          const res = await fetch(`${API_BASE}/api/messages/${msgId}/report`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user: user.name })
          });
          if(res.ok) {
              toast.success("Incidentul a fost trimis Comisiei Centrale.");
          }
      } catch(err) {
          toast.error("Eroare la arbitraj.");
      }
  };

  const enterChat = (roomId: string, title: string) => {
      setActiveRoom(roomId);
      setActiveTitle(title);
      setView('chat');
  };

  const goBack = () => {
      setView('list');
      fetchConversations(); 
  };

  const groupedMessages: { [key: string]: Message[] } = {};
  messageList.forEach(msg => {
      const dateKey = new Date(msg.timestamp).toDateString();
      if (!groupedMessages[dateKey]) groupedMessages[dateKey] = [];
      groupedMessages[dateKey].push(msg);
  });

  const activeConversationInfo = conversations.find(c => c.roomId === activeRoom);
  const pinnedMessages = messageList.filter(m => m.isPinned && !m.isDeleted);

  return (
    <>
        {/* Lightbox Imagini (VAR Review Style) */}
        {lightboxImage && (
            <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setLightboxImage(null)}>
                <button className="absolute top-6 right-6 text-white bg-slate-900 border-2 border-slate-700 hover:bg-rose-600 hover:border-rose-500 rounded-xl p-3 transition-all">
                    <X className="w-6 h-6 font-bold"/>
                </button>
                <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                    <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] font-black px-3 py-1 uppercase tracking-widest z-10 border-b-2 border-l-2 border-slate-900 rounded-bl-lg">Analiză Foto</div>
                    <img src={lightboxImage} alt="Fullscreen" className="max-w-full max-h-[85vh] object-contain" onClick={(e) => e.stopPropagation()} />
                </div>
            </div>
        )}

        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] flex flex-col items-end font-sans">
          {/* BUTON DESCHIDERE (Stil Minge / Radar) */}
          {!isOpen && (
              <button onClick={() => setIsOpen(true)} className="group bg-slate-900 border-4 border-emerald-500 hover:bg-slate-800 text-emerald-400 p-4 rounded-full shadow-[0_10px_25px_rgba(16,185,129,0.3)] hover:shadow-[0_10px_25px_rgba(16,185,129,0.5)] transition-all hover:scale-110 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                  <div className="absolute inset-0 rounded-full border border-emerald-400 opacity-0 group-hover:opacity-100 group-hover:animate-ping"></div>
                  <MessageCircle className="w-8 h-8" />
                  <span className="absolute top-[-4px] right-[-4px] w-4 h-4 bg-rose-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
              </button>
          )}

          {isOpen && (
              <div className="bg-white dark:bg-slate-900 w-[350px] md:w-[420px] h-[65vh] min-h-[500px] max-h-[750px] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-emerald-600/30 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
                  
                  {/* HEADER WIDGET (Scor / Status) */}
                  <div className="bg-slate-950 p-4 border-b-4 border-emerald-600 flex justify-between items-center z-20 shrink-0 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#fff_10px,#fff_12px)] pointer-events-none"></div>
                      
                      {view === 'chat' && activeRoom.startsWith('listing_') && activeConversationInfo ? (
                          <div className="flex items-center gap-3 w-full min-w-0 pr-2 relative z-10">
                              <button onClick={goBack} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl border border-slate-700 transition-colors shrink-0"><ChevronLeft className="w-5 h-5 text-emerald-400"/></button>
                              <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden shrink-0 border-2 border-emerald-500/50">
                                  {activeConversationInfo.image ? <img src={activeConversationInfo.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-500 m-2"/>}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <h2 className="font-black text-white uppercase tracking-tight truncate text-sm">{activeTitle}</h2>
                                  <span className="text-[9px] text-blue-400 font-black bg-blue-900/30 border border-blue-800 px-2 py-0.5 rounded uppercase tracking-widest mt-0.5 inline-block">Negocieri Transfer</span>
                              </div>
                          </div>
                      ) : (
                          <div className="flex items-center gap-3 relative z-10">
                              {view === 'chat' && <button onClick={goBack} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl border border-slate-700 transition-colors"><ChevronLeft className="w-5 h-5 text-emerald-400"/></button>}
                              <div className="flex flex-col">
                                  <span className="font-black text-white uppercase tracking-widest text-sm truncate max-w-[180px]">{view === 'list' ? 'Canale de Discuție' : activeTitle}</span>
                                  {view === 'chat' && isPartnerTyping && <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest animate-pulse mt-0.5">Se antrenează (Scrie)...</span>}
                              </div>
                          </div>
                      )}
                      <button onClick={() => setIsOpen(false)} className="relative z-10 bg-slate-800 hover:bg-rose-600 p-2 rounded-xl border border-slate-700 transition-colors shrink-0"><X className="w-5 h-5 text-white"/></button>
                  </div>

                  {/* ZONA CENTRALĂ (Teren) */}
                  <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 relative scrollbar-thin scrollbar-thumb-emerald-500/30" onClick={() => setShowReactionPickerId(null)}>
                      
                      {/* Fundal Teren subtil */}
                      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_40px,#000_40px,#000_42px),repeating-linear-gradient(90deg,transparent,transparent_40px,#000_40px,#000_42px)]"></div>

                      {/* MESAJ FIXAT (Tabelă) */}
                      {view === 'chat' && pinnedMessages.length > 0 && (
                          <div onClick={() => scrollToMessage(pinnedMessages[0]._id)} className="bg-slate-900 border-b-2 border-amber-500 p-3 flex items-center gap-3 sticky top-0 z-20 cursor-pointer hover:bg-slate-800 transition-colors shadow-md">
                              <div className="bg-amber-500/20 p-1.5 rounded-lg border border-amber-500/50">
                                  <Pin className="w-4 h-4 text-amber-400 shrink-0" />
                              </div>
                              <div className="flex-1 truncate">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 block mb-0.5">Anunț Oficial (Fixat)</span>
                                  <span className="text-xs font-bold text-white truncate block">{pinnedMessages[0].message || 'Fotografie/Document'}</span>
                              </div>
                          </div>
                      )}

                      {/* VEDERE LISTĂ (Camere) */}
                      {view === 'list' && (
                          <div className="p-3 sm:p-4 space-y-4 relative z-10">
                              
                              <div onClick={() => enterChat("general_chat", "Tribuna Oficială")} className="bg-white dark:bg-slate-900 p-4 rounded-2xl cursor-pointer hover:border-emerald-500 transition-all flex items-center gap-4 border-2 border-slate-200 dark:border-slate-800 shadow-sm group">
                                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shadow-inner"><Users className="w-7 h-7"/></div>
                                  <div>
                                      <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">Tribuna Oficială</h4>
                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Discuții Libere Comunitate</p>
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-3 px-2">
                                  <div className="h-0.5 flex-1 bg-slate-200 dark:bg-slate-800"></div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Negocieri Private</span>
                                  <div className="h-0.5 flex-1 bg-slate-200 dark:bg-slate-800"></div>
                              </div>
                              
                              {conversations.length === 0 ? (
                                  <div className="text-center py-10 opacity-70 flex flex-col items-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                                      <MessageCircle className="w-10 h-10 mb-3 text-slate-400"/>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nicio discuție activă.</p>
                                  </div>
                              ) : (
                                  <div className="space-y-2">
                                  {conversations.map((conv) => (
                                      <div key={conv.roomId} onClick={() => enterChat(conv.roomId, conv.title)} className="bg-white dark:bg-slate-900 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition-all flex items-center gap-3 border-2 border-slate-200 dark:border-slate-800 group shadow-sm">
                                          {conv.image ? (
                                              <img src={conv.image} className="w-12 h-12 rounded-xl object-cover bg-slate-100 border-2 border-slate-200 dark:border-slate-700 group-hover:border-blue-500 transition-colors shrink-0"/>
                                          ) : (
                                              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-slate-200 dark:border-slate-700 shrink-0"><ImageIcon className="w-5 h-5 text-slate-400"/></div>
                                          )}
                                          <div className="overflow-hidden flex-1">
                                              <div className="flex justify-between items-start mb-1">
                                                  <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[130px]" title={conv.title}>{conv.title}</h4>
                                                  <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">{new Date(conv.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                                              </div>
                                              <p className={`text-[11px] font-bold truncate w-full ${conv.lastMessage === "" ? "italic text-rose-500" : "text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400"}`}>
                                                  {conv.lastMessage === "" ? "Semnal Pierdut (Șters)" : conv.lastMessage}
                                              </p>
                                          </div>
                                      </div>
                                  ))}
                                  </div>
                              )}
                          </div>
                      )}

                      {/* VEDERE CHAT */}
                      {view === 'chat' && (
                          <div className="flex flex-col h-full relative z-10">
                              <div className="flex-1 p-3 sm:p-4 space-y-6 overflow-y-auto">
                                  {Object.keys(groupedMessages).length === 0 && (
                                      <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-70">
                                          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-emerald-500 border-2 border-emerald-500/30">
                                              <MessageCircle className="w-8 h-8"/>
                                          </div>
                                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Terenul e pregătit. Dă pasa!</p>
                                      </div>
                                  )}

                                  {Object.keys(groupedMessages).map((dateKey) => (
                                      <div key={dateKey}>
                                          <div className="flex justify-center mb-5 mt-2">
                                              <span className="bg-slate-900 border-2 border-slate-800 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg shadow-sm">
                                                  {formatDateSeparator(dateKey)}
                                              </span>
                                          </div>
                                          <div className="space-y-1">
                                              {groupedMessages[dateKey].map((msg, idx, arr) => {
                                                  const isMe = msg.author === user?.name;
                                                  const isFirstInGroup = idx === 0 || arr[idx - 1].author !== msg.author;
                                                  
                                                  return (
                                                    <div key={idx} ref={(el) => { messageContainerRefs.current[msg._id] = el; }} className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isFirstInGroup ? "mt-4" : "mt-1"}`}>
                                                          {/* NUME AUTOR (Pentru alții) */}
                                                          {!isMe && isFirstInGroup && (
                                                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2 mb-1 flex items-center gap-1">
                                                                  {msg.authorRole === 'admin' && <ShieldCheck className="w-3 h-3 text-rose-500"/>}
                                                                  {msg.author}
                                                              </span>
                                                          )}

                                                          <div className={`group relative flex items-center gap-2 max-w-[92%] ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                                                              
                                                              {/* TOOLBAR ACȚIUNI MESAJ */}
                                                              {!msg.isDeleted && (
                                                                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900 border border-slate-700 shadow-lg p-1.5 rounded-xl absolute -top-12 z-[30] ${isMe ? 'right-0' : 'left-0'}`}>
                                                                      <button onClick={(e) => { e.stopPropagation(); setShowReactionPickerId(msg._id); }} className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-slate-800 rounded-lg transition-colors" title="Reacționează"><Smile className="w-4 h-4"/></button>
                                                                      <button onClick={() => setReplyingTo(msg)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors" title="Dă Replica"><Reply className="w-4 h-4"/></button>
                                                                      <button onClick={() => handlePin(msg._id)} className={`p-1.5 hover:bg-slate-800 rounded-lg transition-colors ${msg.isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-amber-400'}`} title={msg.isPinned ? "Scoate de la Fixate" : "Fixează Mesajul pe Tabelă"}><Pin className="w-4 h-4"/></button>
                                                                      
                                                                      {(isMe || isAdmin) && <button onClick={() => handleDeleteMessage(msg._id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-lg transition-colors" title="Anulează Pasa (Șterge)"><Trash2 className="w-4 h-4"/></button>}
                                                                      
                                                                      {!isMe && !isAdmin && msg.authorRole !== 'admin' && (
                                                                          <button onClick={() => handleReportMessage(msg._id)} className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-slate-800 rounded-lg transition-colors" title="Cheamă VAR-ul (Raportează)">
                                                                              <Flag className="w-4 h-4"/>
                                                                          </button>
                                                                      )}
                                                                  </div>
                                                              )}

                                                              {/* PICKER REACȚII */}
                                                              {showReactionPickerId === msg._id && (
                                                                  <div className={`absolute -top-14 z-[40] bg-slate-900 border-2 border-slate-700 shadow-xl rounded-2xl px-2 py-1.5 flex gap-2 animate-in zoom-in ${isMe ? 'right-0' : 'left-0'}`}>
                                                                      {AVAILABLE_EMOJIS.map(emoji => (
                                                                          <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReact(msg._id, emoji); }} className="hover:scale-125 hover:-translate-y-1 transition-all text-xl px-1">{emoji}</button>
                                                                      ))}
                                                                  </div>
                                                              )}

                                                              {/* CONȚINUT MESAJ */}
                                                              {msg.isDeleted ? (
                                                                  <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex items-center gap-2">
                                                                      <Ban className="w-3.5 h-3.5 text-slate-400" />
                                                                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Joc Oprit (Șters)</span>
                                                                  </div>
                                                              ) : (
                                                                  <div className={`relative shadow-md flex flex-col border-2 ${isMe ? "bg-emerald-600 border-emerald-500 text-white rounded-2xl rounded-tr-sm" : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm"}`}>
                                                                      
                                                                      {/* REPLY BOX */}
                                                                      {msg.replyTo && (
                                                                          <div onClick={() => scrollToMessage(msg.replyTo!.id)} className={`mx-2 mt-2 p-2.5 rounded-xl text-xs cursor-pointer border-l-4 ${isMe ? 'bg-emerald-800/40 border-emerald-300 text-emerald-100' : 'bg-slate-100 dark:bg-slate-800 border-blue-500 text-slate-600 dark:text-slate-300'}`}>
                                                                              <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isMe ? 'text-emerald-300' : 'text-blue-500'}`}>{msg.replyTo.author}</div>
                                                                              <div className="truncate max-w-[200px] font-bold">{msg.replyTo.text}</div>
                                                                          </div>
                                                                      )}

                                                                      {/* IMAGINE */}
                                                                      {msg.imageUrl && (
                                                                          <div className="relative overflow-hidden rounded-xl cursor-pointer m-1" onClick={() => setLightboxImage(msg.imageUrl!)}>
                                                                              <img src={msg.imageUrl} className={`max-w-[260px] sm:max-w-[280px] w-full max-h-64 object-cover border-2 border-transparent hover:border-white/50 transition-colors rounded-lg ${msg.replyTo ? 'mt-1' : ''}`} />
                                                                              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900/90 to-transparent pointer-events-none rounded-b-lg"></div>
                                                                              <div className="absolute bottom-2 right-2 text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-1 drop-shadow-md">
                                                                                  {msg.time} {isMe && <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />}
                                                                              </div>
                                                                          </div>
                                                                      )}

                                                                      {/* TEXT */}
                                                                      {msg.message && (
                                                                          <div className="px-4 py-3 text-sm font-medium leading-snug">
                                                                              {renderTextWithLinks(msg.message)}
                                                                              {!msg.imageUrl && (
                                                                                  <div className={`text-[9px] font-black uppercase tracking-widest flex justify-end items-center gap-1 mt-1.5 ${isMe ? "text-emerald-200" : "text-slate-400"}`}>
                                                                                      {msg.time} {isMe && <CheckCheck className="w-3.5 h-3.5" />}
                                                                                  </div>
                                                                              )}
                                                                          </div>
                                                                      )}

                                                                      {/* REACȚII AFIȘATE JOS */}
                                                                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                                          <div className={`absolute -bottom-3.5 flex gap-1 bg-slate-900 border-2 border-slate-700 shadow-md rounded-lg px-2 py-0.5 z-10 ${isMe ? 'right-4' : 'left-4'}`}>
                                                                              {Object.entries(msg.reactions).map(([emoji, usersArr]) => (
                                                                                  <button key={emoji} onClick={() => handleReact(msg._id, emoji)} className={`text-[10px] font-black flex items-center gap-1.5 px-1.5 py-0.5 rounded-md transition-colors ${usersArr.includes(user.name) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-transparent text-slate-300 hover:bg-slate-800'}`}>
                                                                                      <span className="text-sm">{emoji}</span><span>{usersArr.length}</span>
                                                                                  </button>
                                                                              ))}
                                                                          </div>
                                                                      )}
                                                                  </div>
                                                              )}
                                                          </div>
                                                          {/* Spațiu extra dacă există reacții ca să nu se suprapună */}
                                                          {msg.reactions && Object.keys(msg.reactions).length > 0 && !msg.isDeleted && <div className="h-4"></div>}
                                                      </div>
                                                  );
                                              })}
                                          </div>
                                      </div>
                                  ))}
                                  
                                  {isPartnerTyping && (
                                      <div className="flex items-center gap-2 mt-3 ml-3 animate-in fade-in slide-in-from-bottom-2">
                                          <div className="bg-slate-900 border-2 border-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 shadow-sm">
                                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                                          </div>
                                      </div>
                                  )}
                                  <div ref={messagesEndRef} className="h-2" />
                              </div>

                              {/* ZONA DE INPUT (Control Panel) */}
                              <div className="bg-white dark:bg-slate-900 border-t-4 border-slate-200 dark:border-slate-800 flex flex-col z-20">
                                  
                                  {replyingTo && (
                                      <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border-b-2 border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                          <div className="flex flex-col min-w-0 flex-1 border-l-4 border-blue-500 pl-3">
                                              <span className="text-[9px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest">Replică pentru {replyingTo.author}</span>
                                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">{replyingTo.message || "Imagine (Analiză VAR)"}</span>
                                          </div>
                                          <button onClick={() => setReplyingTo(null)} className="p-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-rose-500 hover:text-white rounded-lg transition-colors ml-2"><X className="w-4 h-4 font-bold"/></button>
                                      </div>
                                  )}

                                  {selectedImage && (
                                      <div className="px-4 pt-3 pb-1 flex items-center gap-3 bg-slate-50 dark:bg-slate-900">
                                          <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md">
                                              <img src={selectedImage} className="w-full h-full object-cover" />
                                              <button onClick={() => setSelectedImage(null)} className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-lg hover:bg-rose-500"><X className="w-3 h-3 font-bold"/></button>
                                          </div>
                                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Fișier Încărcat</span>
                                      </div>
                                  )}

                                  <div className="p-3 sm:p-4 flex gap-2 items-end bg-white dark:bg-slate-900">
                                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                                      <button onClick={() => fileInputRef.current?.click()} className="text-slate-500 hover:text-emerald-600 p-3 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800/50">
                                          <ImageIcon className="w-5 h-5"/>
                                      </button>

                                      <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center px-4 py-1.5 border-2 border-slate-200 dark:border-slate-800 focus-within:border-emerald-500 dark:focus-within:border-emerald-600 transition-all">
                                          <input 
                                              type="text" 
                                              value={currentMessage} 
                                              onChange={handleInputChange}
                                              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                              placeholder="SCRIE AICI..." 
                                              className="w-full bg-transparent border-none outline-none text-sm font-bold placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:uppercase py-2.5 text-slate-900 dark:text-white"
                                          />
                                      </div>
                                      <button 
                                          onClick={sendMessage} 
                                          disabled={isSending || (!currentMessage.trim() && !selectedImage)} 
                                          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:border-slate-400 dark:disabled:border-slate-700 text-white p-3.5 rounded-xl transition-all active:scale-95 flex-shrink-0 border-b-4 border-emerald-800 hover:border-b-2 hover:translate-y-[2px] disabled:translate-y-0 disabled:border-b-4 disabled:text-slate-500"
                                      >
                                          {isSending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
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