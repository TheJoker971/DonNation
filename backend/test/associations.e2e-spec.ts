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
        slug: `test-asso-${Date.now()}`,
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

  it('approves association as admin', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/admin/associations/${associationId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.status).toBe('APPROVED');
    expect(response.body.approvedAt).toBeDefined();
  });
});
