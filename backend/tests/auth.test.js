// tests/auth.test.js
const request = require('supertest');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const app = require('../server');
require('dotenv').config({ path: '.env.test' });

describe('User Registration & Authentication', () => {

  beforeEach(async () => {
    await User.deleteMany({});
  });

  // No need to close the DB connection here—global teardown handles it.

  test('Test Case 1: Successful Registration', async () => {
    const res = await request(app)
      .post('/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/User registered/);

    // Confirm user is actually in the DB
    const dbUser = await User.findOne({ email: 'testuser@example.com' });
    expect(dbUser).not.toBeNull();
    // Confirm password is hashed
    const isPasswordHashed = await bcrypt.compare('Password123!', dbUser.password);
    expect(isPasswordHashed).toBe(true);
  });

  test('Test Case 2: Duplicate Email Registration', async () => {
    // First, create a user
    await User.create({
      firstName: 'Existing',
      lastName: 'User',
      email: 'duplicate@example.com',
      password: await bcrypt.hash('SomePass123!', 10)
    });

    // Try to register another user with the same email
    const res = await request(app)
      .post('/register')
      .send({
        firstName: 'Duplicate',
        lastName: 'User2',
        email: 'duplicate@example.com',
        password: 'AnotherPassword1!',
        confirmPassword: 'AnotherPassword1!'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Email already registered/);
  });

  test('Login with valid credentials', async () => {
    const hashedPass = await bcrypt.hash('MySecr3tPassword', 10);
    await User.create({
      firstName: 'LoginTest',
      lastName: 'User',
      email: 'login@example.com',
      password: hashedPass
    });

    const res = await request(app)
      .post('/login')
      .send({
        email: 'login@example.com',
        password: 'MySecr3tPassword'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.message).toBe('Login successful');
  });

  test('Login with incorrect password', async () => {
    const hashedPass = await bcrypt.hash('RightPass', 10);
    await User.create({
      firstName: 'IncorrectPass',
      lastName: 'User',
      email: 'incorrectpass@example.com',
      password: hashedPass
    });

    const res = await request(app)
      .post('/login')
      .send({
        email: 'incorrectpass@example.com',
        password: 'WrongPass'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid email or password');
  });
});

