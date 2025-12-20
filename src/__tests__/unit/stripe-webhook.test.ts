/* eslint-env jest */
/* @jest-environment node */

import { POST } from '@/app/api/webhooks/stripe/route';
import Invoice from '@/lib/models/Invoice';
import Settings from '@/lib/models/Settings';
import { notificationService } from '@/lib/notifications';

// Mocks
jest.mock('@/lib/mongodb', () => jest.fn());
jest.mock('@/lib/models/Invoice');
jest.mock('@/lib/models/Settings');
jest.mock('@/lib/notifications');

const mockConstructEvent = jest.fn();

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        webhooks: {
            constructEvent: mockConstructEvent
        }
    }));
});

describe('Stripe Webhook API', () => {
    const mockInvoiceId = '507f1f77bcf86cd799439011';
    
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
        
        // Mock Settings
        (Settings.findOne as jest.Mock).mockResolvedValue({
            stripeSecretKey: 'sk_test_123'
        });
    });

    it('should return 400 if Stripe is not configured', async () => {
        (Settings.findOne as jest.Mock).mockResolvedValue(null);
        
        const req = {
            text: jest.fn().mockResolvedValue('body'),
            headers: { get: jest.fn().mockReturnValue('sig') }
        } as any;

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Stripe not configured');
    });

    it('should handle checkout.session.completed event and update invoice', async () => {
        // Mock Event
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    metadata: { invoiceId: mockInvoiceId }
                }
            }
        });

        // Mock Invoice Update
        const mockInvoice = {
            _id: mockInvoiceId,
            invoiceNumber: 'INV-001',
            client: { name: 'Test Client' }
        };

        const mockPopulate = jest.fn().mockResolvedValue(mockInvoice);
        (Invoice.findByIdAndUpdate as jest.Mock).mockReturnValue({
            populate: mockPopulate
        });

        // Create Request
        const req = {
            text: jest.fn().mockResolvedValue('raw_body'),
            headers: { get: jest.fn().mockReturnValue('valid_signature') }
        } as any;

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.received).toBe(true);
        expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(
            mockInvoiceId, 
            { status: 'paid', paidAt: expect.any(Date) }, 
            { new: true }
        );
        expect(notificationService.sendPaymentConfirmation).toHaveBeenCalled();
    });

    it('should return 400 on signature verification failure', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('Invalid signature');
        });

        const req = {
            text: jest.fn().mockResolvedValue('raw_body'),
            headers: { get: jest.fn().mockReturnValue('invalid_sig') }
        } as any;

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Webhook signature verification failed');
    });
});
