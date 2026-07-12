import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Donations (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let donorToken: string;
  let associationId: string;
  let donationId: string;

  const donorEmail = `donor-donation-${Date.now()}@test.com`;
  const assoEmail = `asso-donation-${Date.now()}@test.com`;
  const password = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
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

    const assoRegister = await request(app.getHttpServer())
      .post('/api/v1/auth/register/association')
      .send({
        email: assoEmail,
        password,
        name: 'Donation Test Asso',
      });
    associationId = assoRegister.body.association.id as string;

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/associations/${associationId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const donorRegister = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: donorEmail, password, displayName: 'Donor' });
    donorToken = donorRegister.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a pending donation with invoice', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ associationId, amountEur: 5000, isAnonymous: true })
      .expect(201);

    expect(response.body.donation.status).toBe('PENDING');
    expect(response.body.donation.amountEur).toBe(5000);
    expect(response.body.donation.pointsEarned).toBe(50);
    expect(response.body.invoice.status).toBe('PENDING');

    donationId = response.body.donation.id as string;
  });

  it('rejects pay when Stripe is not configured', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/donations/${donationId}/pay`)
      .set('Authorization', `Bearer ${donorToken}`)
      .expect(400);
  });

  it('lists donor donations', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/donations/me')
      .set('Authorization', `Bearer ${donorToken}`)
      .expect(200);

    expect(response.body.length).toBeGreaterThanOrEqual(1);
    expect(response.body[0].id).toBe(donationId);
  });
});
