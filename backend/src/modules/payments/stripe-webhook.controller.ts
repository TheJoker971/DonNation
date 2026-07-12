import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common/interfaces';
import type { Request } from 'express';
import { StripeService } from './stripe.service';

@Controller('payments/stripe')
export class StripeWebhookController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const event = this.stripeService.constructWebhookEvent(
      req.rawBody,
      signature,
    );
    await this.stripeService.handleWebhookEvent(event);

    return { received: true };
  }
}
