const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Room = require('./models/Room');
const authenticateToken = require('./middleware/auth');
require('dotenv').config();


const Message = require('./models/Message');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});
const PORT = process.env.PORT || 5000;

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

// Middleware to authenticate socket connection
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token?.split(' ')[1];  // Extract the token

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return next(new Error('Authentication error: Invalid user'));
        }

        socket.user = user;  // ✅ Attach user info to socket
        next();
    } catch (err) {
        console.error('Socket authentication failed:', err.message);
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {
    console.log(`🔗 New connection: ${socket.id}`);

    socket.on('joinRoom', async (roomId) => {
        try {
            const room = await Room.findById(roomId);

            if (!room || !room.users.some(userId => userId.equals(socket.user._id))) {
                return socket.emit('errorMessage', 'Access denied to this room.');
            }

            socket.join(roomId);
            console.log(`🔒 ${socket.user.email} joined room: ${roomId}`);
        } catch (error) {
            console.error('Error joining room:', error);
        }
    });

    socket.on('leaveRoom', () => {
        console.log(`🚪 Socket ${socket.id} leaving all rooms`);
        const rooms = Array.from(socket.rooms);
        rooms.forEach((room) => {
            if (room !== socket.id) {  // Avoid leaving the default room
                socket.leave(room);
                console.log(`🚪 Left room: ${room}`);
            }
        });
    });

    socket.on('chatMessage', async ({ roomId, message }) => {
        try {
            const newMessage = await Message.create({
                room: roomId,  // ✅ Use room ID
                message,
                user: socket.user.email.split('@')[0],
                timestamp: new Date()
            });

            // ✅ Emit the message to the correct room using roomId
            io.to(roomId).emit('chatMessage', {
                _id: newMessage._id,
                user: newMessage.user,
                message: newMessage.message,
                timestamp: newMessage.timestamp
            });

        } catch (error) {
            console.error('Error saving message:', error);
        }
    });


    socket.on('disconnect', () => {
        console.log(`❌ Socket ${socket.id} disconnected`);
    });
});


// User Registration
app.post('/register', async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ firstName, lastName, email, password: hashedPassword });
        await newUser.save();

        // Add user to global room
        let globalRoom = await Room.findOne({ name: 'global' });
        if (!globalRoom) {
            globalRoom = await Room.create({ name: 'global' });
        }
        globalRoom.users.push(newUser._id);
        await globalRoom.save();

        // Create DM rooms with all existing users
        const allUsers = await User.find({ _id: { $ne: newUser._id } });

        for (const user of allUsers) {
            const dmRoomName = [newUser._id, user._id].sort().join('-');

            const existingDM = await Room.findOne({ name: dmRoomName });
            if (!existingDM) {
                await Room.create({
                    name: dmRoomName,
                    users: [newUser._id, user._id],
                    isDM: true
                });
            }
        }

        res.status(201).json({ message: 'User registered and DMs created successfully' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;  // ✅ Changed from username to email

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ email });  // ✅ Find user by email

        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, fullName: `${user.firstName} ${user.lastName}` },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: 'Login successful', token });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Fetch rooms the user belongs to
app.get('/rooms', authenticateToken, async (req, res) => {
    try {
        const rooms = await Room.find({ users: req.user.id })
            .populate('users', 'firstName')
            .populate('owner', '_id');

        const formattedRooms = rooms.map(room => {
            const isOwner = room.owner && room.owner._id.toString() === req.user.id;
            if (room.isDM) {
                const otherUser = room.users.find(u => u._id.toString() !== req.user.id);
                return {
                    _id: room._id,
                    name: room.name,
                    isDM: true,
                    otherUserFirstName: otherUser.firstName,
                    isOwner
                };
            }
            return { _id: room._id, name: room.name, isDM: false, isOwner };
        });

        res.json(formattedRooms);
    } catch (error) {
        res.status(500).json({ message: 'Failed to load rooms' });
    }
});

// Leave Room with Proper User Removal and Owner Reassignment
app.post('/rooms/:id/leave', authenticateToken, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id).populate('users', 'firstName lastName');

        if (!room) return res.status(404).json({ message: 'Room not found' });
        if (room.isDM) return res.status(400).json({ message: 'Cannot leave a direct message room.' });

        const userIdStr = req.user.id.toString();

        // ✅ Properly remove the user using equals()
        const originalUserCount = room.users.length;
        room.users = room.users.filter(userId => !userId.equals(req.user.id));

        if (room.users.length === originalUserCount) {
            return res.status(400).json({ message: 'User not part of this room.' });
        }

        // ✅ Mark 'users' as modified to ensure Mongoose detects the change
        room.markModified('users');

        // ✅ If no users left, delete the room
        if (room.users.length === 0) {
            await room.deleteOne();
            return res.status(200).json({ message: 'Room deleted because it was empty.' });
        }

        // ✅ Reassign ownership if the leaving user was the owner
        if (room.owner.equals(req.user.id)) {
            const newOwner = room.users[Math.floor(Math.random() * room.users.length)];
            room.owner = newOwner;

            // ✅ Send system message about the new owner
            const systemMessage = new Message({
                room: room._id,
                message: `📢 ${req.user.firstName} ${req.user.lastName} left the room. ${newOwner.firstName} ${newOwner.lastName} is now the owner.`,
                user: 'System',
                timestamp: new Date()
            });

            await systemMessage.save();

            // ✅ Notify all users in the room
            io.to(room._id.toString()).emit('chatMessage', {
                _id: systemMessage._id,
                user: 'System',
                message: systemMessage.message,
                timestamp: systemMessage.timestamp
            });
        }

        // ✅ Save the updated room
        await room.save();

        res.status(200).json({ message: 'Left the room successfully.' });

    } catch (error) {
        console.error('Error leaving room:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Delete Room
app.delete('/rooms/:id', authenticateToken, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Room not found' });

        if (room.isDM) {
            return res.status(400).json({ message: 'Cannot delete a direct message room.' });
        }

        if (room.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the room owner can delete this room.' });
        }

        await room.deleteOne();
        res.status(200).json({ message: 'Room deleted successfully.' });

    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/messages/:id', authenticateToken, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.user.toString() !== req.user.email.split('@')[0]) {
            return res.status(403).json({ message: 'Unauthorized to delete this message' });
        }

        await message.deleteOne();
        res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



// Create a new room
app.post('/create-room', authenticateToken, async (req, res) => {
    const { name, userIds } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Room name is required.' });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: 'At least one user is required.' });
    }

    try {
        // Include the creator in the room
        if (!userIds.includes(req.user.id)) {
            userIds.push(req.user.id);
        }

        const newRoom = new Room({
            name,
            users: [...new Set(userIds)],
            owner: req.user.id,
            isDM: false,
        });

        await newRoom.save();

        res.status(201).json({ message: 'Room created successfully', room: newRoom });

    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



app.get('/verify-token', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        res.json({ message: 'Token is valid', user: { id: user._id, email: user.email } });
    } catch (error) {
        res.status(403).json({ message: 'Invalid or expired token' });
    }
});

// Fetch user profile
app.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');  // Exclude password
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user profile
app.put('/profile', authenticateToken, async (req, res) => {
    const { firstName, lastName, currentPassword, newPassword } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Update name
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;

        // Change password if current password is correct
        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

            user.password = await bcrypt.hash(newPassword, 10);
        }

        await user.save();
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/users', authenticateToken, async (req, res) => {
    try {
        const users = await User.find().select('firstName lastName email');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to load users' });
    }
});

app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Endpoint to fetch paginated messages
app.get('/messages', authenticateToken, async (req, res) => {
    const { room = 'global' } = req.query;  // ✅ Use the requested room

    try {
        const messages = await Message.find({ room })  // ✅ Filter by room
            .sort({ timestamp: 1 });  // Oldest to newest

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Failed to load messages' });
    }
});




// Start Server
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

