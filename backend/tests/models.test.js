// tests/models.test.js
const mongoose = require('mongoose');
const Message = require('../models/Message');

describe('Database Models', () => {
  test('Message must have valid roomId and user reference', async () => {
    const validMessage = new Message({
      room: new mongoose.Types.ObjectId(),
      message: 'Hello world!',
      user: 'testUser'
    });
    const error = validMessage.validateSync();
    expect(error).toBeUndefined();
  });
});

