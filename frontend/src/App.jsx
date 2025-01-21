import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import Login from './components/Login';
import Register from './components/Register';
import ChatPage from './components/ChatPage';
import ProfilePage from './components/ProfilePage';
import Layout from './components/Layout.jsx';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
let socket = null;

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userInitial, setUserInitial] = useState('A');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.get(`${API_URL}/verify-token`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then((res) => {
                    setIsAuthenticated(true);
                    const nameOrEmail = res.data.user.firstName || res.data.user.email;
                    setUserInitial(nameOrEmail[0].toUpperCase());
                    if (!socket) {
                        socket = io(API_URL);
                    }
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    setIsAuthenticated(false);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    };

    if (loading) return <p>Loading...</p>;

    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route
                    path="/"
                    element={isAuthenticated ? <Layout handleLogout={handleLogout} userInitial={userInitial} /> : <Navigate to="/login" />}
                >
                    {/* Default Redirect to /chat/global */}
                    <Route index element={<Navigate to="/chat/global" />} />

                    {/* Chat Room */}
                    <Route path="chat/:roomId" element={<ChatPage />} />


                    {/* Profile */}
                    <Route path="profile" element={<ProfilePage />} />
                </Route>

                {/* Catch-all Redirect */}
                <Route path="*" element={<Navigate to={isAuthenticated ? "/chat/global" : "/login"} />} />
            </Routes>
        </Router>

    );
}

export default App;
