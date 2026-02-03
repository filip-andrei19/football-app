import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { MessageCircle, X, Send, User, ChevronLeft, Image as ImageIcon, Users, Check, CheckCheck, Trash2, ExternalLink, Ban, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

const socket = io("https://football-backend-m2a4.onrender.com");

interface Message {
  _id: string; 
  room: string;
  author: string;
  message: string;
  time: string;
  isDeleted?: boolean;
  timestamp: string; // Asigură-te că backend-ul trimite asta (modelul are 'timestamp')
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

// Helper pentru formatarea datei (Stil WhatsApp: "Azi", "Ieri", "DD/MM/YYYY")
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
  
  // [NOU] State pentru Typing
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // --- LOGICĂ TEXT & LINKURI ---
  const renderMessageContent = (msg: Message) => {
    if (msg.isDeleted) {
        return (
            <span className="italic flex items-center gap-1.5 opacity-60 text-[13px] text-gray-500">
                <Ban className="w-3 h-3" /> Mesaj șters
            </span>
        );
    }

    const text = msg.message;
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
    }
  }, [isOpen, view, activeRoom]);

  useEffect(() => {
    socket.on("receive_message", (data: Message) => {
      if (data.room === activeRoom) {
          setMessageList((list) => [...list, data]);
          setIsPartnerTyping(false); // Oprește typing când primim mesaj
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

    // [NOU] Listeners pentru Typing
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

  // --- LOGICĂ INPUT & TYPING ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentMessage(e.target.value);

      // Emit Typing Event
      socket.emit("typing", activeRoom);

      // Debounce Stop Typing (dacă nu mai scrie 2 secunde)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
          socket.emit("stop_typing", activeRoom);
      }, 2000);
  };

  const sendMessage = async () => {
    if (currentMessage.trim() !== "") {
      const messageData = {
        room: activeRoom,
        author: user.name,
        message: currentMessage,
        time: new Date().getHours() + ":" + (new Date().getMinutes() < 10 ? '0' : '') + new Date().getMinutes(),
      };
      await socket.emit("send_message", messageData);
      socket.emit("stop_typing", activeRoom); // Oprim typing imediat ce trimitem
      setCurrentMessage("");
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
      } catch (err) { console.error(err); }
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

  // Grupăm mesajele pe zile pentru afișare
  const groupedMessages: { [key: string]: Message[] } = {};
  messageList.forEach(msg => {
      const dateKey = new Date(msg.timestamp).toDateString();
      if (!groupedMessages[dateKey]) groupedMessages[dateKey] = [];
      groupedMessages[dateKey].push(msg);
  });

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end font-sans">
        {!isOpen && (
            <button onClick={() => setIsOpen(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                <MessageCircle className="w-7 h-7" />
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            </button>
        )}

        {isOpen && (
            <div className="bg-white dark:bg-slate-900 w-80 md:w-96 h-[550px] rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 ring-1 ring-black/5">
                
                {/* HEADER - Stil Instagram */}
                <div className="bg-white dark:bg-slate-900 p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center z-10 sticky top-0 backdrop-blur-sm bg-opacity-90">
                    <div className="flex items-center gap-3">
                        {view === 'chat' && (
                            <button onClick={goBack} className="hover:bg-gray-100 dark:hover:bg-slate-800 p-1.5 rounded-full transition-colors">
                                <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300"/>
                            </button>
                        )}
                        <div className="flex flex-col">
                            <span className="font-bold text-base text-gray-900 dark:text-white truncate max-w-[180px]">
                                {view === 'list' ? 'Mesaje' : activeTitle}
                            </span>
                            {view === 'chat' && isPartnerTyping && (
                                <span className="text-[10px] text-blue-500 font-medium animate-pulse">Scrie...</span>
                            )}
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-gray-100 dark:hover:bg-slate-800 p-1.5 rounded-full transition-colors"><X className="w-6 h-6 text-gray-500"/></button>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-black/20 relative scrollbar-thin scrollbar-thumb-gray-200">
                    
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

                            <div className="text-xs font-bold text-gray-400 px-4 py-2 uppercase tracking-wider">Mesaje Private</div>
                            
                            {conversations.length === 0 ? (
                                <div className="text-center py-10 opacity-50 flex flex-col items-center">
                                    <MessageCircle className="w-10 h-10 mb-2 text-gray-300"/>
                                    <p className="text-xs">Nu ai conversații încă.</p>
                                </div>
                            ) : (
                                conversations.map((conv) => (
                                    <div key={conv.roomId} onClick={() => enterChat(conv.roomId, conv.title)} className="bg-white dark:bg-slate-800 p-3 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-all flex items-center gap-3 group">
                                        {conv.image ? (
                                            <img src={conv.image} className="w-12 h-12 rounded-full object-cover bg-gray-200 shadow-sm border-2 border-white dark:border-slate-700"/>
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><ImageIcon className="w-5 h-5"/></div>
                                        )}
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
                                        <p className="text-xs text-gray-500">Scrie un mesaj prietenos.</p>
                                    </div>
                                )}

                                {/* Randare Grupata pe Zile */}
                                {Object.keys(groupedMessages).map((dateKey) => (
                                    <div key={dateKey}>
                                        {/* SEPARATOR DATĂ */}
                                        <div className="flex justify-center mb-4">
                                            <span className="bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                                                {formatDateSeparator(dateKey)}
                                            </span>
                                        </div>

                                        {/* MESAJELE DIN ZIUA RESPECTIVĂ */}
                                        <div className="space-y-1">
                                            {groupedMessages[dateKey].map((msg, idx, arr) => {
                                                const isMe = msg.author === user.name;
                                                // Verificăm dacă mesajul anterior e de la același autor (pentru grupare vizuală)
                                                const isFirstInGroup = idx === 0 || arr[idx - 1].author !== msg.author;
                                                
                                                return (
                                                    <div key={idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"} group ${isFirstInGroup ? "mt-3" : "mt-0.5"}`}>
                                                        
                                                        {/* Numele apare doar la primul mesaj din grup și doar pt partener */}
                                                        {!isMe && isFirstInGroup && !msg.isDeleted && (
                                                            <span className="text-[10px] text-gray-500 ml-3 mb-0.5 font-medium">{msg.author}</span>
                                                        )}

                                                        <div className={`relative px-4 py-2 text-[14px] max-w-[85%] break-words shadow-sm ${
                                                            isMe 
                                                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-tr-md" // Stil Instagram Me
                                                            : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 rounded-2xl rounded-tl-md" // Stil Instagram Partner
                                                        } ${msg.isDeleted ? "bg-none bg-gray-100 border-dashed border-gray-300 text-gray-400 shadow-none" : ""}`}>
                                                            
                                                            <div>{renderMessageContent(msg)}</div>

                                                            <div className={`text-[9px] flex justify-end items-center gap-1 mt-1 ${isMe ? "text-blue-100" : "text-gray-400 opacity-70"}`}>
                                                                {msg.time}
                                                                {isMe && !msg.isDeleted && <CheckCheck className="w-3.5 h-3.5 text-white/90" />} {/* Bife "Read" */}
                                                            </div>

                                                            {/* Buton Ștergere (Hover) */}
                                                            {isMe && !msg.isDeleted && (
                                                                <button 
                                                                    onClick={() => handleDeleteMessage(msg._id)}
                                                                    className="absolute -left-7 top-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Șterge"
                                                                >
                                                                    <Trash2 className="w-4 h-4"/>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Animație Typing */}
                                {isPartnerTyping && (
                                    <div className="flex items-center gap-2 mt-2 ml-2 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="bg-gray-200 dark:bg-slate-700 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            
                            {/* INPUT AREA MODERN */}
                            <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex gap-2 items-end">
                                <div className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center px-4 py-1 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all border border-transparent focus-within:border-blue-500/50">
                                    <input 
                                        type="text" 
                                        value={currentMessage} 
                                        onChange={handleInputChange}
                                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                        placeholder="Scrie un mesaj..." 
                                        className="w-full bg-transparent border-none outline-none text-sm py-2.5 max-h-24"
                                    />
                                </div>
                                <button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 flex-shrink-0">
                                    <Send className="w-5 h-5 ml-0.5"/>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};