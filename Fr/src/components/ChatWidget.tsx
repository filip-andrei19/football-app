import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { MessageCircle, X, Send, User } from 'lucide-react';

// Ne asigurăm că folosim o singură instanță de socket
const socket = io("https://football-backend-m2a4.onrender.com");

interface Message {
  room: string;
  author: string;
  message: string;
  time: string;
}

// [NOU] Primim și 'chatPartner' (cel cu care vorbim)
interface ChatWidgetProps {
  user: any;
  roomID: string;
  chatPartner?: { name: string; avatar?: string; role?: string } | null;
  onClose?: () => void; // Opțional, dacă vrem să îl închidem din părinte
}

export const ChatWidget = ({ user, roomID, chatPartner, onClose }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState<Message[]>([]);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Auto-scroll la ultimul mesaj
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && roomID) {
      console.log(`🔌 Connecting to room: ${roomID}`);
      socket.emit("join_room", roomID);
    }
  }, [isOpen, roomID]);

  useEffect(() => {
    socket.on("receive_message", (data: Message) => {
      setMessageList((list) => [...list, data]);
      scrollToBottom();
    });
    
    socket.on("load_history", (history: any) => {
        setMessageList(history);
        setTimeout(scrollToBottom, 100);
    });

    return () => { socket.off("receive_message"); socket.off("load_history"); }
  }, []);

  useEffect(() => {
      scrollToBottom();
  }, [messageList, isOpen]);

  const sendMessage = async () => {
    if (currentMessage !== "") {
      const messageData = {
        room: roomID,
        author: user.name,
        message: currentMessage,
        time: new Date().getHours() + ":" + (new Date().getMinutes() < 10 ? '0' : '') + new Date().getMinutes(),
      };

      await socket.emit("send_message", messageData);
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage("");
    }
  };

  // Dacă utilizatorul curent este chiar vânzătorul, afișăm "Cumpărători" în header
  const isMeSeller = user.email === chatPartner?.role; // Folosim un truc: în App.tsx vom trimite email-ul ca role temporar sau logică separată
  
  // Titlul și Avatarul Header-ului
  const headerName = chatPartner ? chatPartner.name : "Chat General";
  const headerAvatar = chatPartner?.avatar;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end font-sans">
        {!isOpen && (
            <button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl transition-transform hover:scale-110 flex items-center gap-2">
                <MessageCircle className="w-6 h-6" />
                {/* [NOU] Afișăm o bulină roșie dacă e un chat nou (simulat) */}
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
        )}

        {isOpen && (
            <div className="bg-white dark:bg-slate-900 w-80 md:w-96 h-[500px] rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
                
                {/* --- [NOU] HEADER CHAT PERSONALIZAT --- */}
                <div className="bg-blue-600 p-4 flex justify-between items-center text-white shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            {headerAvatar ? (
                                <img src={headerAvatar} alt="Partner" className="w-10 h-10 rounded-full object-cover border-2 border-white/30" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                            )}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-blue-600"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm leading-tight">{headerName}</span>
                            <span className="text-[10px] text-blue-100 opacity-80">Online acum</span>
                        </div>
                    </div>
                    <button onClick={() => { setIsOpen(false); if(onClose) onClose(); }} className="hover:bg-blue-500 p-1 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                </div>
                
                {/* MESAJE */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-slate-950/50">
                    <div className="text-center text-xs text-gray-400 my-4">
                        Începutul conversației
                    </div>
                    
                    {messageList.map((msg, idx) => {
                        const isMe = msg.author === user.name;
                        return (
                            <div key={idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                <div className={`px-4 py-2 rounded-2xl text-sm max-w-[80%] break-words shadow-sm ${
                                    isMe 
                                    ? "bg-blue-600 text-white rounded-br-sm" 
                                    : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 rounded-bl-sm"
                                }`}>
                                    {msg.message}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 ml-1 mr-1">{msg.time}</span>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* INPUT */}
                <div className="p-3 border-t dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 items-center">
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
  );
};