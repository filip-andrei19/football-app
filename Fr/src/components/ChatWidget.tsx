import React, { useEffect, useState } from 'react';
import {io} from 'socket.io-client';
import { MessageCircle, X, Send } from 'lucide-react';

const socket = io("https://football-backend-m2a4.onrender.com");

interface Message {
  room: string;
  author: string;
  message: string;
  time: string;
}

export const ChatWidget = ({ user, roomID }: { user: any, roomID: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState<Message[]>([]);

  useEffect(() => {
    if (isOpen && roomID) {
      socket.emit("join_room", roomID);
    }
  }, [isOpen, roomID]);

  useEffect(() => {
    socket.on("receive_message", (data: Message) => {
      setMessageList((list) => [...list, data]);
    });
    
    socket.on("load_history", (history: any) => {
        setMessageList(history);
    });

    return () => { socket.off("receive_message"); socket.off("load_history"); }
  }, []);

  const sendMessage = async () => {
    if (currentMessage !== "") {
      const messageData = {
        room: roomID,
        author: user.name,
        message: currentMessage,
        time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
      };

      await socket.emit("send_message", messageData);
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage("");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
        {!isOpen && (
            <button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110">
                <MessageCircle className="w-6 h-6" />
            </button>
        )}

        {isOpen && (
            <div className="bg-white dark:bg-slate-800 w-80 h-96 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
                <div className="bg-blue-600 p-3 flex justify-between items-center text-white">
                    <span className="font-bold text-sm">Chat Live</span>
                    <button onClick={() => setIsOpen(false)}><X className="w-4 h-4"/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-slate-900/50">
                    {messageList.map((msg, idx) => {
                        const isMe = msg.author === user.name;
                        return (
                            <div key={idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                <div className={`px-3 py-2 rounded-xl text-sm max-w-[80%] break-words ${isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-200 dark:bg-slate-700 dark:text-gray-200 rounded-bl-none"}`}>
                                    {msg.message}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1">{msg.time} • {msg.author}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="p-2 border-t dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-2">
                    <input 
                        type="text" 
                        value={currentMessage} 
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Scrie un mesaj..." 
                        className="flex-1 text-sm p-2 bg-gray-100 dark:bg-slate-900 rounded-lg outline-none"
                    />
                    <button onClick={sendMessage} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg"><Send className="w-5 h-5"/></button>
                </div>
            </div>
        )}
    </div>
  );
};