import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import './ChatPage.css';

let socket = null;

const ChatPage = ({ handleLogout }) => {
    const { roomId } = useParams();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [user, setUser] = useState('');
    const token = localStorage.getItem('token');

    const inputRef = useRef(null);
    const chatWindowRef = useRef(null);  // ✅ Ref for the chat window

    const [activeMenuMessageId, setActiveMenuMessageId] = useState(null);
    const [hoveredMessageId, setHoveredMessageId] = useState(null);


    // Fetch messages for the current room
    const fetchAllMessages = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/messages`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { room: roomId }
            });
            setMessages(response.data);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    // ✅ Scroll to bottom function
    const scrollToBottom = () => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        if (token && !socket) {
            socket = io('http://localhost:5000', {
                auth: { token: `Bearer ${token}` }
            });

            socket.on('connect', () => {
                console.log(`✅ Connected to room: ${roomId}`);
                socket.emit('joinRoom', roomId);
                fetchAllMessages();
            });

            socket.on('chatMessage', (data) => {
                setMessages((prevMessages) => [...prevMessages, data]);  // ✅ Add new message to state
                scrollToBottom();  // ✅ Auto-scroll to the latest message
            });

            socket.on('disconnect', () => {
                console.log('❌ Disconnected from WebSocket server');
            });
        } else if (socket) {
            socket.emit('leaveRoom');
            socket.emit('joinRoom', roomId);
            fetchAllMessages();
        }

        return () => {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        };
    }, [roomId]);

    // ✅ Scroll to the bottom whenever messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();  // ✅ Focus on input when the room changes
        }
    }, [roomId]);

    const handleDeleteMessage = async (messageId) => {
        try {
            await axios.delete(`http://localhost:5000/messages/${messageId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // ✅ Remove the deleted message from the state
            setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== messageId));
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };


    const sendMessage = () => {
        if (input.trim() && socket) {
            socket.emit('chatMessage', {
                roomId,     // ✅ Send room ID, not the name
                message: input,
                user
            });
            setInput('');
        }
    };


    return (
        <div className="container">
            <div className="chat-content">
                <div className="chat-window" ref={chatWindowRef}>
                    {messages.map((msg) => (
                        <div
                            key={msg._id}
                            className={`message-item ${msg.user === 'System' ? 'system-message' : ''}`}
                        >
                            <div className="message-content">
                                {msg.user === 'System' ? (
                                    <em>{msg.message}</em>
                                ) : (
                                    <strong>{msg.user}</strong>
                                )}
                                {msg.user !== 'System' && ` [${new Date(msg.timestamp).toLocaleTimeString()}]: ${msg.message}`}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="chat-input-container">
                    <input
                        type="text"
                        ref={inputRef}  // ✅ Attach the ref here
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <button onClick={sendMessage} className="send-button">✈️</button>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;

