import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProfilePage.css';

const ProfilePage = () => {
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        email: ''
    });
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        axios.get('http://localhost:5000/profile', {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then((res) => setProfile(res.data))
        .catch((err) => console.error('Error fetching profile:', err));
    }, [token]);

    const handleUpdate = (e) => {
        e.preventDefault();
        axios.put('http://localhost:5000/profile',
            {
                firstName: profile.firstName,
                lastName: profile.lastName,
                currentPassword,
                newPassword
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        )
        .then((res) => setMessage(res.data.message))
        .catch((err) => setMessage(err.response?.data?.message || 'Update failed'));
    };

    return (
        <div className="profile-container">
            <h2>Profile</h2>
            <form onSubmit={handleUpdate}>
                <div className="form-group">
                    <label>First Name</label>
                    <input
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Last Name</label>
                    <input
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={profile.email} disabled />
                </div>

                <h3>Change Password</h3>
                <div className="form-group">
                    <label>Current Password</label>
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>New Password</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                </div>

                <button type="submit">Update Profile</button>
            </form>

            {message && <p className="update-message">{message}</p>}
        </div>
    );
};

export default ProfilePage;

