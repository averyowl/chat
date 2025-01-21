import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import './CreateRoomModal.css';

const CreateRoomModal = ({ token, onClose, onRoomCreated }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [roomName, setRoomName] = useState('');

  const [isLoading, setIsLoading] = useState(true); // ✅ Loading state

  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }

    const fetchAllUsers = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('http://localhost:5000/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAllUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllUsers();
  }, [token]);

  useEffect(() => {
    if (isLoading || !searchTerm.trim()) {
      setFilteredUsers([]); // ✅ Clear results if loading or search is empty
      return;
    }

    const lowerTerm = searchTerm.toLowerCase().trim();

    const matchingUsers = allUsers.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      return (
        !selectedUsers.some((u) => u._id === user._id) && // Exclude selected users
        (fullName.includes(lowerTerm) || email.includes(lowerTerm))
      );
    });

    setFilteredUsers(matchingUsers);
  }, [searchTerm, allUsers, selectedUsers, isLoading]);

  const handleScroll = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target;
    setShowLeftFade(scrollLeft > 5);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 5);
  };

  const handleSearchInputKeyDown = (e) => {
    if (e.key === 'Backspace' && searchTerm === '' && selectedUsers.length > 0) {
      handleRemoveUser(selectedUsers[selectedUsers.length - 1]._id);
    }

    if (e.key === 'Enter' && filteredUsers.length > 0) {
      handleSelectUser(filteredUsers[0]);
    }
  };

  const handleSelectUser = (user) => {
    if (selectedUsers.find((u) => u._id === user._id)) return;
    setSelectedUsers([...selectedUsers, user]);
    setSearchTerm('');
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter((u) => u._id !== userId));
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }
    if (selectedUsers.length === 0) {
      alert('Select at least one user');
      return;
    }

    try {
      const userIds = selectedUsers.map((u) => u._id);

      await axios.post(
        'http://localhost:5000/create-room',
        { name: roomName, userIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (typeof onRoomCreated === 'function') {
        onRoomCreated();
      }

      onClose();
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room');
    }
  };

  return (
    <div className="create-room-modal-overlay">
      <div className="create-room-modal">
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
        <h2>Create a New Room</h2>

        {/* Search Section */}
        <div className="user-search">
          <label>Search Users:</label>
          <div className="user-search-input-wrapper">
            {selectedUsers.map((user) => (
              <span key={user._id} className="selected-user-tag">
                {user.firstName} {user.lastName}
                <button onClick={() => handleRemoveUser(user._id)}>x</button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchInputKeyDown}
              placeholder="Type a name or email..."
            />
          </div>
        </div>

        {/* Search Results */}
        {searchTerm && (
          <div className="search-results-wrapper">
            <div className="search-results-container" onScroll={handleScroll}>
              {isLoading ? (
                <div className="loading-message">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="no-results-message">No matching users found</div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user._id}
                    className="search-result-item"
                    onClick={() => handleSelectUser(user)}
                  >
                    {user.firstName} {user.lastName} ({user.email})
                  </div>
                ))
              )}
            </div>

            {showLeftFade && <div className="left-fade"></div>}
            {showRightFade && <div className="right-fade"></div>}
          </div>
        )}

        {/* Room Name Section */}
        <div className="room-name-section">
          <label>Room Title:</label>
          <div className="room-name-input-wrapper">
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name..."
            />
            <button className="checkmark-button" onClick={handleCreateRoom}>
              ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRoomModal;

