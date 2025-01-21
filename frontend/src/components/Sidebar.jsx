import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Sidebar.css';

const Sidebar = ({ handleLogout, userInitial, onOpenCreateRoom }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [menuOpen, setMenuOpen] = useState(null);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const dropdownRef = useRef(null);

    const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

    const handleCreateRoomClick = () => {
        if (onOpenCreateRoom) {
            onOpenCreateRoom();
        }
    };

    const handleLogoutClick = () => {
        localStorage.removeItem('token');
        navigate('/login');
        if (handleLogout) handleLogout();
    };

    const handleMenuOpen = (roomId) => {
        setMenuOpen(menuOpen === roomId ? null : roomId);
    };

    const fetchRooms = async () => {
        try {
            const response = await axios.get('http://localhost:5000/rooms', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRooms(response.data);
        } catch (error) {
            console.error('Error fetching rooms:', error);
        }
    };

    const handleDeleteRoom = async (roomId) => {
        try {
            await axios.delete(`http://localhost:5000/rooms/${roomId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRooms();  // Refresh rooms
        } catch (error) {
            console.error('Error deleting room:', error);
        }
    };

    const handleLeaveRoom = async (roomId) => {
        try {
            await axios.post(`http://localhost:5000/rooms/${roomId}/leave`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // ✅ Refresh rooms after leaving
            fetchRooms();

            // ✅ Navigate to the global chat if the user leaves the current room
            if (window.location.pathname.includes(roomId)) {
                navigate('/chat/global');
            }

        } catch (error) {
            console.error('Error leaving room:', error);
        }
    };


    useEffect(() => {
        fetchRooms();
    }, [token]);

    return (
        <div className="sidebar">
            <div className="rooms-section">
                <h2>Rooms</h2>
                <ul>
                    {rooms.map((room) => (
                        <li key={room._id} className="room-item" onClick={() => navigate(`/chat/${room._id}`)}>
                            <span
                                className="room-name" 
                            >
                                {room.isDM ? `PM: ${room.otherUserFirstName}` : room.name}
                            </span>

                            {/* Show ellipsis only for non-DM rooms */}
                            {!room.isDM && (
                                <div className="ellipsis-container">
                                    <button
                                        className="ellipsis-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMenuOpen(room._id);
                                        }}
                                    >
                                        ⋮
                                    </button>

                                    {/* Dropdown for Leave/Delete */}
                                    {menuOpen === room._id && (
                                        <div className="room-menu">
                                            <button onClick={() => handleLeaveRoom(room._id)}>Leave</button>
                                            {room.isOwner && (
                                                <button onClick={() => handleDeleteRoom(room._id)}>Delete</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="sidebar-bottom">
                <button
                    className="create-room-btn"
                    title="Create Room"
                    onClick={handleCreateRoomClick}
                >
                    +
                </button>

                <div className="profile-dropdown">
                    <button className="profile-button" onClick={toggleDropdown}>
                        {userInitial || 'U'}
                    </button>

                    {dropdownOpen && (
                        <div className="dropdown-menu">
                            <Link to="/profile" onClick={() => setDropdownOpen(false)}>
                                Profile
                            </Link>
                            <button onClick={handleLogoutClick}>Logout</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;

