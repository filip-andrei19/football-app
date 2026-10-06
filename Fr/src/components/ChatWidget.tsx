import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { MessageCircle, X, Send, User, ChevronLeft, Image as ImageIcon, Users, Check, CheckCheck, Trash2, ExternalLink, Ban, Loader2, Reply, Smile, Pin, MoreHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

const socket = io("https://football-backend-m2a4.onrender.com");

interface Message {
  _id: string; 
  room: string;
  author: string;
  message: string;
  imageUrl?: string;
  time: string;
  isDeleted?: boolean;
  replyTo?: { id: string, author: string, text: string }; // PENTRU REPLY
  reactions?: { [emoji: string]: string[] }; // PENTRU EMOJI
  isPinned?: boolean; // PENTRU PINNED
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

const AVAILABLE_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) return "Astăzi";
    if (date.toDateString() === yesterday.toDateString()) return "Ieri";
    return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const ChatWidget = ({ user, roomID: initialRoomID, onClose }: ChatWidgetProps) => {
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
  
  // STATE-URI NOI (Reply, Emoji Picker)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showReactionPickerId, setShowReactionPickerId] = useState<string | null>(null);

  const renderTextWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            const displayText = part.length > 30 ? part.substring(0, 27) + "..." : part;
            return (
                <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline text-blue-200 hover:text-white font-bold inline-flex items-center gap-1 mx-1 break-all" title={part}>
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
        setActiveTitle("Produs Selectat"); 
        setView('chat');
        setIsOpen(true);
    }
  }, [initialRoomID]);

  useEffect(() => { if (isOpen) fetchConversations(); }, [isOpen]);

  const fetchConversations = async () => {
      try {
          const res = await fetch('https://football-backend-m2a4.onrender.com/api/messages/conversations', {
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

    // Preluam automat cand cineva reactioneaza, da pin sau sterge
    socket.on("message_updated", (updatedMsg: Message) => {
        setMessageList((currentList) => currentList.map(m => m._id === updatedMsg._id ? updatedMsg : m));
    });

    socket.on("display_typing", (data: { isTyping: boolean }) => {
        setIsPartnerTyping(data.isTyping);
        scrollToBottom();
    });

    return () => { 
        socket.off("receive_message"); 
        socket.off("load_history"); 
        socket.off("message_updated"); 
        socket.off("display_typing");
    }
  }, [activeRoom]);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  
  const scrollToMessage = (msgId: string) => {
      const element = messageContainerRefs.current[msgId];
      if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("bg-yellow-100", "dark:bg-slate-700", "transition-colors", "duration-1000");
          setTimeout(() => element.classList.remove("bg-yellow-100", "dark:bg-slate-700"), 2000);
      }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 5 * 1024 * 1024) return toast.error("Imaginea este prea mare! (Max 5MB)");
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
          room: activeRoom, author: user.name, message: currentMessage, imageBase64: selectedImage || "", time: timeStr
      };

      if (replyingTo) {
          payload.replyTo = { id: replyingTo._id, author: replyingTo.author, text: replyingTo.message || "Imagine" };
      }
      
      try {
          const res = await fetch('https://football-backend-m2a4.onrender.com/api/messages/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (res.ok) {
              setCurrentMessage("");
              setSelectedImage(null);
              setReplyingTo(null);
              socket.emit("stop_typing", activeRoom);
          } else { toast.error("Eroare la trimiterea mesajului."); }
      } catch (e) { toast.error("Eroare de conexiune."); } finally { setIsSending(false); }
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
      if (!window.confirm("Ștergi acest mesaj pentru toată lumea?")) return;
      try {
          await fetch(`https://football-backend-m2a4.onrender.com/api/messages/${msgId}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user: user.name }) 
          });
      } catch (err) {}
  };

  const handleReact = async (msgId: string, emoji: string) => {
      setShowReactionPickerId(null);
      try {
          await fetch(`https://football-backend-m2a4.onrender.com/api/messages/${msgId}/react`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ emoji, user: user.name }) 
          });
      } catch (err) { toast.error("Nu s-a putut adăuga reacția."); }
  };

  const handlePin = async (msgId: string) => {
      try {
          await fetch(`https://football-backend-m2a4.onrender.com/api/messages/${msgId}/pin`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
          });
      } catch (err) { toast.error("Nu s-a putut fixa mesajul."); }
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
        {lightboxImage && (
            <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setLightboxImage(null)}>
                <button className="absolute top-6 right-6 text-white/50 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all"><X className="w-8 h-8"/></button>
                <img src={lightboxImage} alt="Fullscreen" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
            </div>
        )}

        <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end font-sans">
          {!isOpen && (
              <button onClick={() => setIsOpen(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                  <MessageCircle className="w-7 h-7" />
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              </button>
          )}

          {isOpen && (
              <div className="bg-white dark:bg-slate-900 w-[350px] md:w-[400px] h-[650px] rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 ring-1 ring-black/5">
                  
                  {/* --- HEADER --- */}
                  <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center z-20 sticky top-0 backdrop-blur-sm bg-opacity-90 shadow-sm shrink-0">
                      {view === 'chat' && activeRoom.startsWith('listing_') && activeConversationInfo ? (
                          <div className="flex items-center gap-3 w-full min-w-0 pr-2">
                              <button onClick={goBack} className="hover:bg-gray-100 dark:hover:bg-slate-800 p-1.5 rounded-full transition-colors shrink-0"><ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300"/></button>
                              <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                  {activeConversationInfo.image ? <img src={activeConversationInfo.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-gray-400 m-2.5"/>}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <h2 className="font-bold text-gray-900 dark:text-white truncate text-sm">{activeTitle}</h2>
                                  <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">Anunț Market</span>
                              </div>
                          </div>
                      ) : (
                          <div className="flex items-center gap-3">
                              {view === 'chat' && <button onClick={goBack} className="hover:bg-gray-100 dark:hover:bg-slate-800 p-1.5 rounded-full transition-colors"><ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300"/></button>}
                              <div className="flex flex-col">
                                  <span className="font-bold text-base text-gray-900 dark:text-white truncate max-w-[180px]">{view === 'list' ? 'Mesaje' : activeTitle}</span>
                                  {view === 'chat' && isPartnerTyping && <span className="text-[10px] text-blue-500 font-medium animate-pulse">Scrie...</span>}
                              </div>
                          </div>
                      )}
                      <button onClick={() => setIsOpen(false)} className="hover:bg-gray-100 dark:hover:bg-slate-800 p-1.5 rounded-full transition-colors shrink-0"><X className="w-6 h-6 text-gray-500"/></button>
                  </div>

                  {/* CONTENT AREA */}
                  <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-black/20 relative scrollbar-thin scrollbar-thumb-gray-200" onClick={() => setShowReactionPickerId(null)}>
                      
                      {/* BANNER MESAJE FIXATE */}
                      {view === 'chat' && pinnedMessages.length > 0 && (
                          <div onClick={() => scrollToMessage(pinnedMessages[0]._id)} className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800/50 p-2.5 flex items-center gap-3 sticky top-0 z-10 cursor-pointer hover:bg-yellow-100 transition-colors">
                              <Pin className="w-4 h-4 text-amber-600 shrink-0" />
                              <div className="flex-1 truncate">
                                  <span className="text-[10px] font-black uppercase text-amber-700 block">Mesaj Fixat</span>
                                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate block">{pinnedMessages[0].message || 'Imagine...'}</span>
                              </div>
                          </div>
                      )}

                      {/* --- LISTA CONVERSAȚII --- */}
                      {view === 'list' && (
                          <div className="p-2 space-y-1">
                              <div onClick={() => enterChat("general_chat", "Chat General")} className="bg-white dark:bg-slate-800 p-4 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all flex items-center gap-4 border border-transparent hover:border-gray-100 mb-4 shadow-sm">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md"><Users className="w-6 h-6"/></div>
                                  <div>
                                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">Chat General</h4>
                                      <p className="text-xs text-gray-500 font-medium">Comunitatea Scouting</p>
                                  </div>
                              </div>
                              <div className="text-xs font-bold text-gray-400 px-4 py-2 uppercase tracking-wider">Anunțuri Private</div>
                              {conversations.length === 0 ? (
                                  <div className="text-center py-10 opacity-50 flex flex-col items-center"><MessageCircle className="w-10 h-10 mb-2 text-gray-300"/><p className="text-xs">Nu ai conversații încă.</p></div>
                              ) : (
                                  conversations.map((conv) => (
                                      <div key={conv.roomId} onClick={() => enterChat(conv.roomId, conv.title)} className="bg-white dark:bg-slate-800 p-3 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-all flex items-center gap-3 group">
                                          {conv.image ? <img src={conv.image} className="w-12 h-12 rounded-full object-cover bg-gray-200 shadow-sm border-2 border-white dark:border-slate-700"/> : <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><ImageIcon className="w-5 h-5"/></div>}
                                          <div className="overflow-hidden flex-1">
                                              <div className="flex justify-between items-center">
                                                  <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[140px]">{conv.title}</h4>
                                                  <span className="text-[10px] text-gray-400">{new Date(conv.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                                              </div>
                                              <p className={`text-xs truncate w-full mt-0.5 ${conv.lastMessage === "" ? "italic text-gray-400" : "text-gray-500 group-hover:text-gray-700"}`}>
                                                  {conv.lastMessage === "" ? "Mesaj șters" : conv.lastMessage}
                                              </p>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      )}

                      {/* --- CHAT ROOM --- */}
                      {view === 'chat' && (
                          <div className="flex flex-col h-full">
                              <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                                  {Object.keys(groupedMessages).length === 0 && (
                                      <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60">
                                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 text-blue-500"><MessageCircle className="w-8 h-8"/></div>
                                          <p className="text-sm font-bold">Începe conversația!</p>
                                      </div>
                                  )}

                                  {Object.keys(groupedMessages).map((dateKey) => (
                                      <div key={dateKey}>
                                          <div className="flex justify-center mb-4"><span className="bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">{formatDateSeparator(dateKey)}</span></div>
                                          <div className="space-y-1">
                                              {groupedMessages[dateKey].map((msg, idx, arr) => {
                                                  const isMe = msg.author === user.name;
                                                  const isFirstInGroup = idx === 0 || arr[idx - 1].author !== msg.author;
                                                  
                                                  return (
                                                      <div key={idx} ref={(el) => (messageContainerRefs.current[msg._id] = el)} className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isFirstInGroup ? "mt-3" : "mt-0.5"}`}>
                                                          {!isMe && isFirstInGroup && !msg.isDeleted && <span className="text-[10px] text-gray-500 ml-3 mb-0.5 font-medium">{msg.author}</span>}

                                                          <div className={`group relative flex items-center gap-2 max-w-[90%] ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                                                              
                                                              {/* TOOLBAR MESAJ (Apare la Hover) */}
                                                              {!msg.isDeleted && (
                                                                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm p-1 rounded-full absolute top-0 z-10 ${isMe ? '-left-24' : '-right-24'}`}>
                                                                      <button onClick={() => setShowReactionPickerId(msg._id)} className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-gray-50 rounded-full" title="Reacționează"><Smile className="w-3.5 h-3.5"/></button>
                                                                      <button onClick={() => setReplyingTo(msg)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-50 rounded-full" title="Răspunde"><Reply className="w-3.5 h-3.5"/></button>
                                                                      <button onClick={() => handlePin(msg._id)} className={`p-1.5 hover:bg-gray-50 rounded-full ${msg.isPinned ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`} title={msg.isPinned ? "Scoate de la Fixate" : "Fixează Mesajul"}><Pin className="w-3.5 h-3.5"/></button>
                                                                      {isMe && <button onClick={() => handleDeleteMessage(msg._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-full" title="Șterge"><Trash2 className="w-3.5 h-3.5"/></button>}
                                                                  </div>
                                                              )}

                                                              {/* PICKER EMOJI FLOTANT */}
                                                              {showReactionPickerId === msg._id && (
                                                                  <div className={`absolute -top-10 z-20 bg-white border border-gray-100 shadow-xl rounded-full px-2 py-1.5 flex gap-1 animate-in zoom-in ${isMe ? 'right-0' : 'left-0'}`}>
                                                                      {AVAILABLE_EMOJIS.map(emoji => (
                                                                          <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReact(msg._id, emoji); }} className="hover:scale-125 transition-transform text-lg px-1">{emoji}</button>
                                                                      ))}
                                                                  </div>
                                                              )}

                                                              {/* BULA DE MESAJ */}
                                                              {msg.isDeleted ? (
                                                                  <div className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-full flex items-center gap-2"><Ban className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs font-medium italic text-gray-400">Mesaj șters</span></div>
                                                              ) : (
                                                                  <div className={`relative shadow-sm flex flex-col ${isMe ? "bg-blue-600 text-white rounded-2xl rounded-tr-md" : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 rounded-2xl rounded-tl-md"}`}>
                                                                      
                                                                      {/* PREVIEW REPLY */}
                                                                      {msg.replyTo && (
                                                                          <div onClick={() => scrollToMessage(msg.replyTo!.id)} className={`mx-2 mt-2 p-2 rounded-xl text-xs cursor-pointer border-l-2 ${isMe ? 'bg-blue-700/50 border-white text-blue-100' : 'bg-gray-50 border-blue-500 text-gray-500'}`}>
                                                                              <div className={`font-bold mb-0.5 ${isMe ? 'text-white' : 'text-blue-600'}`}>{msg.replyTo.author}</div>
                                                                              <div className="truncate max-w-[200px]">{msg.replyTo.text}</div>
                                                                          </div>
                                                                      )}

                                                                      {msg.imageUrl && (
                                                                          <div className="relative overflow-hidden rounded-2xl cursor-pointer" onClick={() => setLightboxImage(msg.imageUrl!)}>
                                                                              <img src={msg.imageUrl} className={`max-w-[260px] w-full max-h-64 object-cover ${msg.replyTo ? 'mt-2' : ''}`} />
                                                                              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none"></div>
                                                                              <div className="absolute bottom-1.5 right-2 text-white/90 text-[10px] flex items-center gap-1 drop-shadow-md">{msg.time} {isMe && <CheckCheck className="w-3.5 h-3.5 text-white" />}</div>
                                                                          </div>
                                                                      )}

                                                                      {msg.message && (
                                                                          <div className="px-4 py-2.5 text-[14px]">
                                                                              {renderTextWithLinks(msg.message)}
                                                                              {!msg.imageUrl && (
                                                                                  <div className={`text-[10px] flex justify-end items-center gap-1 mt-1 ${isMe ? "text-blue-200" : "text-gray-400"}`}>{msg.time} {isMe && <CheckCheck className="w-3.5 h-3.5 opacity-90" />}</div>
                                                                              )}
                                                                          </div>
                                                                      )}

                                                                      {/* REACȚII LA MESAJ */}
                                                                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                                          <div className={`absolute -bottom-3 flex gap-1 bg-white border border-gray-100 shadow-sm rounded-full px-1.5 py-0.5 z-10 ${isMe ? 'right-4' : 'left-4'}`}>
                                                                              {Object.entries(msg.reactions).map(([emoji, usersArr]) => (
                                                                                  <button key={emoji} onClick={() => handleReact(msg._id, emoji)} className={`text-[10px] font-bold flex items-center gap-1 px-1 rounded-full ${usersArr.includes(user.name) ? 'bg-blue-50 text-blue-600' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}>
                                                                                      <span>{emoji}</span><span>{usersArr.length}</span>
                                                                                  </button>
                                                                              ))}
                                                                          </div>
                                                                      )}
                                                                  </div>
                                                              )}
                                                          </div>
                                                          {/* Padding jos dacă există reacții ca să nu se încalece rândurile */}
                                                          {msg.reactions && Object.keys(msg.reactions).length > 0 && !msg.isDeleted && <div className="h-3"></div>}
                                                      </div>
                                                  );
                                              })}
                                          </div>
                                      </div>
                                  ))}
                                  
                                  {isPartnerTyping && (
                                      <div className="flex items-center gap-2 mt-2 ml-2 animate-in fade-in slide-in-from-bottom-2">
                                          <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1 shadow-sm">
                                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                          </div>
                                      </div>
                                  )}
                                  <div ref={messagesEndRef} />
                              </div>

                              {/* ZONA DE INPUT (Cu Banner Reply și Preview Imagine) */}
                              <div className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex flex-col">
                                  
                                  {replyingTo && (
                                      <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
                                          <div className="flex flex-col min-w-0 flex-1 border-l-2 border-blue-500 pl-2">
                                              <span className="text-[10px] font-bold text-blue-600 uppercase">Răspunzi lui {replyingTo.author}</span>
                                              <span className="text-xs text-gray-600 truncate">{replyingTo.message || "Imagine..."}</span>
                                          </div>
                                          <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
                                      </div>
                                  )}

                                  {selectedImage && (
                                      <div className="px-3 pt-2 pb-1 flex items-center gap-2">
                                          <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-200">
                                              <img src={selectedImage} className="w-full h-full object-cover" />
                                              <button onClick={() => setSelectedImage(null)} className="absolute top-0.5 right-0.5 bg-red-500 text-white p-0.5 rounded-full"><X className="w-3 h-3"/></button>
                                          </div>
                                          <span className="text-xs text-gray-500 font-medium">Poză pregătită</span>
                                      </div>
                                  )}

                                  <div className="p-3 flex gap-2 items-end">
                                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                                      <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-blue-600 p-2.5 transition-colors bg-gray-50 hover:bg-blue-50 rounded-full"><ImageIcon className="w-5 h-5"/></button>

                                      <div className="flex-1 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center px-4 py-1 border border-gray-200 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                                          <input 
                                              type="text" 
                                              value={currentMessage} 
                                              onChange={handleInputChange}
                                              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                              placeholder="Scrie un mesaj..." 
                                              className="w-full bg-transparent border-none outline-none text-sm py-2.5"
                                          />
                                      </div>
                                      <button onClick={sendMessage} disabled={isSending || (!currentMessage.trim() && !selectedImage)} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-3 rounded-full shadow-md transition-all active:scale-95 flex-shrink-0">
                                          {isSending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5 ml-0.5"/>}
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