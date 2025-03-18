// tests/room.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const Room = require('../models/Room');
const User = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

describe('Rooms & Room Creation', () => {
  let token, testUser;

  beforeEach(async () => {
    // Create a new test user for each test to ensure the user exists in the DB
    testUser = new User({
      firstName: 'Room',
      lastName: 'Tester',
      email: 'roomtester@example.com',
      password: 'hashedpassword'
    });
    await testUser.save();

    token = jwt.sign(
      { id: testUser._id, email: testUser.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // Clear the collections for this test file
    await User.deleteMany({});
    await Room.deleteMany({});
  });

  test('Basic Room Creation', async () => {
    const res = await request(app)
      .post('/create-room')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Design Team Room',
        userIds: [testUser._id.toString()]
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Room created successfully');
    expect(res.body.room).toHaveProperty('_id');
    expect(res.body.room.name).toBe('Design Team Room');
  });

  test('Leaving a Room', async () => {
    // Create a room that the test user is part of.
    const createRoomRes = await request(app)
      .post('/create-room')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Temporary Room',
        userIds: [testUser._id.toString()]
      });
    expect(createRoomRes.statusCode).toBe(201);
    const roomId = createRoomRes.body.room._id;
    expect(roomId).toBeDefined();

    // Leave the room.
    const leaveRes = await request(app)
      .post(`/rooms/${roomId}/leave`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(leaveRes.statusCode).toBe(200);
    expect(['Left the room successfully.', 'Room deleted because it was empty.']).toContain(leaveRes.body.message);
  });
});

