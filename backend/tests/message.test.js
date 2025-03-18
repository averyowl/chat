// tests/message.test.js
const http = require('http');
const jwt = require('jsonwebtoken');
const ioClient = require('socket.io-client');
const app = require('../server');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

describe('Messages & Chat Handler', () => {
  let server, testUser, token, testRoom;
  let clientSocket;
  let io;

  beforeAll(async () => {
    // Create a test user
    testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'hashedpassword'
    });
    await testUser.save();

    token = jwt.sign({ id: testUser._id, email: testUser.email }, JWT_SECRET, { expiresIn: '1h' });

    // Create a test room and add testUser to it
    testRoom = new Room({
      name: 'Test Room',
      users: [testUser._id],
      owner: testUser._id,
      isDM: false,
    });
    await testRoom.save();

    // Start a new HTTP server using your Express app
    server = http.createServer(app);

    io = require('socket.io')(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Socket middleware for token authentication.
    io.use((socket, next) => {
      try {
        const authToken = socket.handshake.auth.token;
        if (!authToken) {
          return next(new Error('Authentication error: No token provided'));
        }
        const tokenPart = authToken.split(' ')[1];
        const decoded = jwt.verify(tokenPart, JWT_SECRET);
        socket.user = { _id: decoded.id, email: decoded.email };
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    // Socket event handlers.
    io.on('connection', (socket) => {
      socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
      });

      socket.on('chatMessage', async ({ roomId, message }) => {
        const newMessage = await Message.create({
          room: roomId,
          message,
          user: socket.user.email.split('@')[0],
          timestamp: new Date()
        });
        io.to(roomId).emit('chatMessage', {
          _id: newMessage._id,
          user: newMessage.user,
          message: newMessage.message,
          timestamp: newMessage.timestamp
        });
      });
    });

    await new Promise(resolve => server.listen(5001, resolve));
  });

  afterAll(async () => {
    if (clientSocket) clientSocket.disconnect();
    await new Promise(resolve => server.close(resolve));
    // Global teardown handles DB disconnection.
  });

  test('Authorized user sends message to a room', (done) => {
    clientSocket = ioClient('http://localhost:5001', {
      auth: { token: `Bearer ${token}` }
    });
    clientSocket.on('connect', () => {
      clientSocket.emit('joinRoom', testRoom._id.toString());
      clientSocket.on('chatMessage', (data) => {
        try {
          expect(data.message).toBe('Hello from test');
          expect(data.user).toBe(testUser.email.split('@')[0]);
          done();
        } catch (err) {
          done(err);
        }
      });
      clientSocket.emit('chatMessage', { roomId: testRoom._id.toString(), message: 'Hello from test' });
    });
  });

  test('Unauthorized user attempt', (done) => {
    const unauthorizedSocket = ioClient('http://localhost:5001', {
      auth: { token: '' },
      reconnection: false
    });
    unauthorizedSocket.on('connect_error', (err) => {
      try {
        expect(err.message).toMatch(/Authentication error/);
        unauthorizedSocket.close();
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});

