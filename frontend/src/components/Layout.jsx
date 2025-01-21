import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import CreateRoomModal from './CreateRoomModal';
import axios from 'axios';
import './Layout.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Layout = ({ handleLogout }) => {
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [userInitial, setUserInitial] = useState('U');
  const token = localStorage.getItem('token');

  useEffect(() => {
    console.log('Layout mounted');  // ✅ Check if Layout is rendering

    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const firstName = response.data.firstName || 'U';
        setUserInitial(firstName.charAt(0).toUpperCase());
        console.log('Fetched user data:', response.data);  // ✅ User data fetched
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    if (token) {
      console.log('Token found:', token);  // ✅ Token exists
      fetchUserData();
    } else {
      console.warn('No token found');  // ✅ No token
    }
  }, [token]);

  console.log('Passing onOpenCreateRoom to Sidebar:', !!setCreateRoomOpen);

  return (
    <div className="app-container">
      <Sidebar
        handleLogout={handleLogout}
        userInitial={userInitial}
        onOpenCreateRoom={() => {
          console.log('onOpenCreateRoom triggered in Layout');  // ✅ Debug
          setCreateRoomOpen(true);
        }}
      />

      <div className="main-content">
        <Outlet />
      </div>

      {createRoomOpen && (
        <CreateRoomModal
          token={token}
          onClose={() => {
            console.log('Closing CreateRoomModal');  // ✅ Debug close action
            setCreateRoomOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Layout;

