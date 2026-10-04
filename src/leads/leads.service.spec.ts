import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityType } from '../generated/prisma/enums.js';

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a follow-up scheduled activity when a lead has an initial follow-up', async () => {
    const lead = {
      id: 'lead-id',
      nextFollowUpAt: new Date('2026-10-10T09:00:00.000Z'),
    };
    const leadActivity = {
      create: vi.fn().mockResolvedValue({}),
    };

    prisma.user.findUnique.mockResolvedValue({ id: 'user-id' });
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        lead: {
          create: vi.fn().mockResolvedValue(lead),
        },
        leadActivity,
      }),
    );

    await service.create('user-id', {
      name: 'Test lead',
      nextFollowUpAt: '2026-10-10T09:00:00.000Z',
    });

    expect(leadActivity.create).toHaveBeenCalledTimes(2);
    expect(leadActivity.create).toHaveBeenNthCalledWith(1, {
      data: {
        leadId: 'lead-id',
        type: ActivityType.LEAD_CREATED,
        title: 'Lead created',
        description: 'You added this lead',
      },
    });
    expect(leadActivity.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        leadId: 'lead-id',
        type: ActivityType.FOLLOW_UP_SCHEDULED,
        title: 'Follow-up scheduled',
      }),
    });
  });

  it('does not create a follow-up scheduled activity without an initial follow-up', async () => {
    const leadActivity = {
      create: vi.fn().mockResolvedValue({}),
    };

    prisma.user.findUnique.mockResolvedValue({ id: 'user-id' });
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        lead: {
          create: vi.fn().mockResolvedValue({ id: 'lead-id' }),
        },
        leadActivity,
      }),
    );

    await service.create('user-id', { name: 'Test lead' });

    expect(leadActivity.create).toHaveBeenCalledTimes(1);
    expect(leadActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: ActivityType.LEAD_CREATED,
      }),
    });
  });
});
