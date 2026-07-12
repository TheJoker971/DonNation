import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Associations (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let associationToken: string;
  let associationId: string;

  const associationEmail = `asso-${Date.now()}@test.com`;
  const password = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL ?? 'admin@donnation.local',
        password: process.env.ADMIN_PASSWORD ?? 'DonNationAdmin123!',
      });

    adminToken = adminLogin.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers an association in PENDING status', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register/association')
      .send({
        email: associationEmail,
        password,
        name: 'Test Association',
        description: 'Association de test',
      })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.user.role).toBe('ASSOCIATION');
    expect(response.body.association.status).toBe('PENDING');

    associationToken = response.body.accessToken as string;
    associationId = response.body.association.id as string;
  });

  it('returns association profile for owner', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/associations/me')
      .set('Authorization', `Bearer ${associationToken}`)
      .expect(200);

    expect(response.body.status).toBe('PENDING');
    expect(response.body.slug).toBeDefined();
  });

  it('lists associations for admin with optional status filter', async () => {
    const pending = await request(app.getHttpServer())
      .get('/api/v1/admin/associations?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(pending.body)).toBe(true);
    expect(pending.body.some((a: { id: string }) => a.id === associationId)).toBe(true);
    expect(pending.body.every((a: { status: string }) => a.status === 'PENDING')).toBe(true);
  });

  it('does not expose public catalog before approval', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/associations').expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((a: { id: string }) => a.id === associationId)).toBe(false);
  });

  it('approves association as admin', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/admin/associations/${associationId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.status).toBe('APPROVED');
    expect(response.body.approvedAt).toBeDefined();
  });

  it('exposes approved association in public catalog', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/associations').expect(200);

    const match = response.body.find((a: { id: string }) => a.id === associationId);
    expect(match).toBeDefined();
    expect(match.stripeOnboardingComplete).toBeDefined();
    expect(match.stats).toBeDefined();
    expect(match.stats.totalRaisedEur).toBeDefined();
    expect(match.stripeConnectAccountId).toBeUndefined();
  });

  it('exposes public profile by slug', async () => {
    const catalog = await request(app.getHttpServer()).get('/api/v1/associations').expect(200);
    const match = catalog.body.find((a: { id: string }) => a.id === associationId);
    expect(match?.slug).toBeDefined();

    const profile = await request(app.getHttpServer())
      .get(`/api/v1/associations/${match.slug}`)
      .expect(200);

    expect(profile.body.name).toBe('Test Association');
    expect(profile.body.stats).toEqual({
      totalRaisedEur: 0,
      donationCount: 0,
      donorCount: 0,
    });
    expect(profile.body.recentSupporters).toEqual([]);
  });
});
