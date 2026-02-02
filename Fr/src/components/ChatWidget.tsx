import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { MessageCircle, X, Send, User, ChevronLeft, Image as ImageIcon, Users } from 'lucide-react';

const socket = io("https://football-backend-m2a4.onrender.com");

interface Message {
  room: string;
  author: string;
  message: string;
  time: string;
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
  roomID?: string; // Facem roomID opțional
  chatPartner?: any; // Păstrăm compatibilitatea
  onClose?: () => void;
}

export const ChatWidget = ({ user, roomID: initialRoomID, onClose }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // VIEW: 'list' = lista de chat-uri, 'chat' = conversația deschisă
  const [view, setView] = useState<'list' | 'chat'>('list');
  
  // Date despre conversația curentă
  const [activeRoom, setActiveRoom] = useState(initialRoomID || "general_chat");
  const [activeTitle, setActiveTitle] = useState("Chat General");
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageList, setMessageList] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // 1. Daca primim un roomID din exterior (din CollectorsHub), deschidem direct chat-ul
  useEffect(() => {
    if (initialRoomID && initialRoomID !== "general_chat") {
        setActiveRoom(initialRoomID);
        setActiveTitle("Produs Selectat"); // Titlu temporar
        setView('chat');
        setIsOpen(true);
    }
  }, [initialRoomID]);

  // 2. Încarcă Lista de Conversații când deschizi widget-ul
  useEffect(() => {
      if (isOpen) {
          fetchConversations();
      }
  }, [isOpen]);

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
              
              // Actualizăm titlul dacă suntem într-o cameră specifică
              if (activeRoom.startsWith('listing_')) {
                  const currentConv = data.find((c: any) => c.roomId === activeRoom);
                  if (currentConv) setActiveTitle(currentConv.title);
              }
          }
      } catch (e) { console.error("Err loading chats", e); }
  };

  // 3. Conectare la Socket (doar când ești în view 'chat')
  useEffect(() => {
    if (isOpen && view === 'chat' && activeRoom) {
      socket.emit("join_room", activeRoom);
      setMessageList([]); // Curățăm lista vizuală înainte de a încărca istoricul
    }
  }, [isOpen, view, activeRoom]);

  // 4. Ascultă mesajele
  useEffect(() => {
    socket.on("receive_message", (data: Message) => {
      if (data.room === activeRoom) {
          setMessageList((list) => [...list, data]);
          scrollToBottom();
      }
    });
    
    socket.on("load_history", (history: any) => {
        setMessageList(history);
        setTimeout(scrollToBottom, 100);
    });

    return () => { socket.off("receive_message"); socket.off("load_history"); }
  }, [activeRoom]);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  const sendMessage = async () => {
    if (currentMessage !== "") {
      const messageData = {
        room: activeRoom,
        author: user.name,
        message: currentMessage,
        time: new Date().getHours() + ":" + (new Date().getMinutes() < 10 ? '0' : '') + new Date().getMinutes(),
      };
      await socket.emit("send_message", messageData);
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage("");
    }
  };

  // Navigare: Intră în chat
  const enterChat = (roomId: string, title: string) => {
      setActiveRoom(roomId);
      setActiveTitle(title);
      setView('chat');
  };

  // Navigare: Înapoi la listă
  const goBack = () => {
      setView('list');
      fetchConversations(); // Reîmprospătăm lista pentru a vedea mesajele noi
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end font-sans">
        {/* BUTON FLOTANT */}
        {!isOpen && (
            <button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl transition-transform hover:scale-110 flex items-center gap-2">
                <MessageCircle className="w-6 h-6" />
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
        )}

        {/* FEREASTRA PRINCIPALĂ */}
        {isOpen && (
            <div className="bg-white dark:bg-slate-900 w-80 md:w-96 h-[500px] rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
                
                {/* HEADER ALBASTRU */}
                <div className="bg-blue-600 p-4 flex justify-between items-center text-white shadow-md shrink-0">
                    <div className="flex items-center gap-2">
                        {view === 'chat' && (
                            <button onClick={goBack} className="mr-1 hover:bg-white/20 p-1 rounded-full transition-colors" title="Înapoi la listă">
                                <ChevronLeft className="w-6 h-6"/>
                            </button>
                        )}
                        <span className="font-bold text-sm truncate max-w-[200px]">
                            {view === 'list' ? 'Conversațiile Tale' : activeTitle}
                        </span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-blue-500 p-1 rounded-full"><X className="w-5 h-5"/></button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950/50 relative">
                    
                    {/* --- VIEW 1: LISTA DE CHATURI --- */}
                    {view === 'list' && (
                        <div className="p-2 space-y-2">
                            {/* Chat General Fix */}
                            <div onClick={() => enterChat("general_chat", "Chat General")} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Users className="w-5 h-5"/></div>
                                <div>
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">Chat General</h4>
                                    <p className="text-xs text-gray-500">Comunitatea Scouting</p>
                                </div>
                            </div>

                            <div className="text-xs font-bold text-gray-400 px-2 mt-4 uppercase">Privat</div>
                            
                            {conversations.length === 0 ? (
                                <p className="text-center text-gray-400 text-xs py-4">Nu ai nicio conversație privată încă.</p>
                            ) : (
                                conversations.map((conv) => (
                                    <div key={conv.roomId} onClick={() => enterChat(conv.roomId, conv.title)} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3">
                                        {conv.image ? (
                                            <img src={conv.image} className="w-10 h-10 rounded-lg object-cover bg-gray-200 shadow-sm"/>
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-gray-400"/></div>
                                        )}
                                        <div className="overflow-hidden flex-1">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[150px]">{conv.title}</h4>
                                                {conv.isMyListing && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">VÂND</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate w-full mt-0.5">{conv.lastMessage}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* --- VIEW 2: CONVERSAȚIA ACTIVĂ --- */}
                    {view === 'chat' && (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                                {messageList.length === 0 && (
                                    <div className="text-center text-gray-400 text-xs mt-10">Începe conversația...</div>
                                )}
                                {messageList.map((msg, idx) => {
                                    const isMe = msg.author === user.name;
                                    return (
                                        <div key={idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                            <div className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] break-words shadow-sm ${
                                                isMe 
                                                ? "bg-blue-600 text-white rounded-br-none" 
                                                : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 rounded-bl-none"
                                            }`}>
                                                {msg.message}
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-1 ml-1 mr-1">{msg.time} • {msg.author.split(' ')[0]}</span>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                            
                            {/* ZONA DE INPUT */}
                            <div className="p-3 border-t dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 items-center shrink-0">
                                <input 
                                    type="text" 
                                    value={currentMessage} 
                                    onChange={(e) => setCurrentMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Scrie un mesaj..." 
                                    className="flex-1 text-sm p-3 bg-gray-100 dark:bg-slate-800 rounded-full outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                                <button onClick={sendMessage} className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 shadow-md transition-transform hover:scale-105 active:scale-95">
                                    <Send className="w-5 h-5"/>
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