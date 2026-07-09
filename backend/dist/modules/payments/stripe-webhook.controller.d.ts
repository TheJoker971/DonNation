import type { RawBodyRequest } from '@nestjs/common/interfaces';
import type { Request } from 'express';
import { StripeService } from './stripe.service';
export declare class StripeWebhookController {
    private readonly stripeService;
    constructor(stripeService: StripeService);
    handleWebhook(req: RawBodyRequest<Request>, signature: string): Promise<{
        received: boolean;
    }>;
}
