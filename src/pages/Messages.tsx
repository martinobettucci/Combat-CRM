import React, { useState, useEffect, useRef } from 'react';
import { useAuth, UserProfile } from '../AuthContext';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, orderBy, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Send, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
}

export default function Messages() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !profile) return;

    const fetchUsers = async () => {
      try {
        // If coach/admin, show athletes. If athlete, show coaches.
        const targetRole = profile.role === 'athlete' ? 'coach' : 'athlete';
        const q = query(collection(db, 'users'), where('role', '==', targetRole));
        const snapshot = await getDocs(q);
        setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    };
    fetchUsers();
  }, [user, profile]);

  useEffect(() => {
    if (!user || !selectedUserId) return;

    const q1 = query(
      collection(db, 'messages'),
      where('senderId', '==', user.uid),
      where('receiverId', '==', selectedUserId)
    );
    const q2 = query(
      collection(db, 'messages'),
      where('senderId', '==', selectedUserId),
      where('receiverId', '==', user.uid)
    );

    const unsubscribe1 = onSnapshot(q1, (snap1) => {
      const msgs1 = snap1.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      
      const unsubscribe2 = onSnapshot(q2, (snap2) => {
        const msgs2 = snap2.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        const allMsgs = [...msgs1, ...msgs2].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(allMsgs);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      return () => unsubscribe2();
    });

    return () => unsubscribe1();
  }, [user, selectedUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUserId || !newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        receiverId: selectedUserId,
        text,
        createdAt: new Date().toISOString()
      });

      // Send notification to receiver
      await addDoc(collection(db, 'notifications'), {
        userId: selectedUserId,
        title: 'New Message',
        message: `You have a new message from ${profile?.firstName} ${profile?.lastName}.`,
        type: 'message',
        read: false,
        createdAt: new Date().toISOString()
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  };

  const selectedUser = users.find(u => u.uid === selectedUserId);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {users.map(u => (
            <button
              key={u.uid}
              onClick={() => setSelectedUserId(u.uid)}
              className={clsx(
                "w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-zinc-800/50",
                selectedUserId === u.uid ? "bg-zinc-800" : ""
              )}
            >
              <div className="h-10 w-10 rounded-full bg-zinc-700 overflow-hidden shrink-0">
                {u.photoUrl ? (
                  <img src={u.photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="h-full w-full p-2 text-zinc-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-zinc-400 capitalize">{u.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/90 backdrop-blur-sm">
              <div className="h-10 w-10 rounded-full bg-zinc-700 overflow-hidden shrink-0">
                {selectedUser.photoUrl ? (
                  <img src={selectedUser.photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="h-full w-full p-2 text-zinc-400" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{selectedUser.firstName} {selectedUser.lastName}</h3>
                <p className="text-xs text-zinc-400 capitalize">{selectedUser.role}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isMine = msg.senderId === user?.uid;
                return (
                  <div key={msg.id} className={clsx("flex", isMine ? "justify-end" : "justify-start")}>
                    <div className={clsx(
                      "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                      isMine ? "bg-emerald-500 text-white rounded-tr-none" : "bg-zinc-800 text-zinc-200 rounded-tl-none"
                    )}>
                      <p>{msg.text}</p>
                      <p className={clsx("text-[10px] mt-1 text-right", isMine ? "text-emerald-200" : "text-zinc-500")}>
                        {format(new Date(msg.createdAt), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl border-0 bg-zinc-950 py-2.5 px-4 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-500 p-2.5 text-white shadow-sm hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Select a user to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
