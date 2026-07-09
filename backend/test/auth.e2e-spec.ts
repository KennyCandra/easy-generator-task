import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  password?: string;
}

interface AuthResponseBody {
  accessToken: string;
  user: AuthUser;
  refreshToken?: string;
}

interface MessageResponseBody {
  message: string;
}

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let httpServer: App;
  let mongoServer: MongoMemoryServer;

  const user = {
    email: 'alice@example.com',
    name: 'Alice Doe',
    password: 'SecurePass1!',
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-for-e2e-tests';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-e2e-tests';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );

    await app.init();
    httpServer = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe('POST /auth/signup', () => {
    it('creates a user, returns an access token, and sets a refresh cookie', async () => {
      const response = await request(httpServer)
        .post('/auth/signup')
        .send(user)
        .expect(201);

      const body = response.body as AuthResponseBody;

      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.refreshToken).toBeUndefined();
      expect(body.user.email).toBe(user.email);
      expect(body.user.name).toBe(user.name);
      expect(body.user.password).toBeUndefined();
      expect(getRefreshCookie(response.headers['set-cookie'])).toContain(
        'refreshToken=',
      );
    });

    it('rejects duplicate email addresses', async () => {
      await request(httpServer).post('/auth/signup').send(user).expect(409);
    });

    it.each([
      ['invalid email format', { ...user, email: 'not-an-email' }],
      [
        'name shorter than 3 characters',
        { ...user, email: 'short-name@example.com', name: 'Al' },
      ],
      [
        'password shorter than 8 characters',
        { ...user, email: 'short-password@example.com', password: 'Ab1!' },
      ],
      [
        'password without a letter',
        { ...user, email: 'no-letter@example.com', password: '12345678!' },
      ],
      [
        'password without a number',
        { ...user, email: 'no-number@example.com', password: 'Password!' },
      ],
      [
        'password without a special character',
        { ...user, email: 'no-special@example.com', password: 'Password1' },
      ],
    ])('rejects %s', async (_label, payload) => {
      await request(httpServer).post('/auth/signup').send(payload).expect(400);
    });
  });

  describe('POST /auth/signin', () => {
    it('returns an access token and sets a refresh cookie for valid credentials', async () => {
      const response = await request(httpServer)
        .post('/auth/signin')
        .send({ email: user.email, password: user.password })
        .expect(200);

      const body = response.body as AuthResponseBody;

      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.refreshToken).toBeUndefined();
      expect(body.user.email).toBe(user.email);
      expect(body.user.name).toBe(user.name);
      expect(getRefreshCookie(response.headers['set-cookie'])).toContain(
        'refreshToken=',
      );
    });

    it('rejects an unknown email', async () => {
      await request(httpServer)
        .post('/auth/signin')
        .send({ email: 'nobody@example.com', password: user.password })
        .expect(401);
    });

    it('rejects an incorrect password', async () => {
      await request(httpServer)
        .post('/auth/signin')
        .send({ email: user.email, password: 'WrongPass1!' })
        .expect(401);
    });
  });

  describe('GET /me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(httpServer)
        .post('/auth/signin')
        .send({ email: user.email, password: user.password });

      accessToken = (response.body as AuthResponseBody).accessToken;
    });

    it('returns the welcome message with a valid Bearer token', async () => {
      const response = await request(httpServer)
        .get('/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect((response.body as MessageResponseBody).message).toBe(
        'Welcome to the application.',
      );
    });

    it('rejects requests without a Bearer token', async () => {
      await request(httpServer).get('/me').expect(401);
    });

    it('rejects malformed Bearer tokens', async () => {
      await request(httpServer)
        .get('/me')
        .set('Authorization', 'Bearer invalid.token.value')
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates tokens when a valid refresh cookie is provided', async () => {
      const signinResponse = await request(httpServer)
        .post('/auth/signin')
        .send({ email: user.email, password: user.password });
      const refreshCookie = getRefreshCookie(
        signinResponse.headers['set-cookie'],
      );

      const refreshResponse = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(200);

      const body = refreshResponse.body as AuthResponseBody;

      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.user.email).toBe(user.email);
      expect(body.user.name).toBe(user.name);
      expect(getRefreshCookie(refreshResponse.headers['set-cookie'])).toContain(
        'refreshToken=',
      );
    });

    it('rejects requests without a refresh cookie', async () => {
      await request(httpServer).post('/auth/refresh').expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the stored refresh token so the old refresh cookie no longer works', async () => {
      const signinResponse = await request(httpServer)
        .post('/auth/signin')
        .send({ email: user.email, password: user.password });
      const body = signinResponse.body as AuthResponseBody;
      const refreshCookie = getRefreshCookie(
        signinResponse.headers['set-cookie'],
      );

      const logoutResponse = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);

      expect((logoutResponse.body as MessageResponseBody).message).toBe(
        'Signed out successfully',
      );

      await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(401);
    });
  });
});

function getRefreshCookie(setCookieHeader: string[] | string | undefined) {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader ?? ''];

  return cookies.find((cookie) => cookie.startsWith('refreshToken=')) ?? '';
}
