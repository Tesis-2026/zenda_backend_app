import { NotificationsScheduleService } from '../../src/modules/notifications/schedule/notifications-schedule.service';

describe('NotificationsScheduleService hourly streak reminders', () => {
  const send = { execute: jest.fn() };
  const userPort = { listEligibleUsers: jest.fn() };
  const prisma = { transaction: { count: jest.fn() } };
  let service: NotificationsScheduleService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsScheduleService(send as never, userPort as never, prisma as never);
    userPort.listEligibleUsers.mockResolvedValue([
      { id: 'user-1', fcmToken: 'token', dailyReminderAt: null },
    ]);
    prisma.transaction.count.mockResolvedValue(0);
    send.execute.mockResolvedValue({ notification: { id: 'notification-1' } });
  });

  it('sends one hourly reminder during waking hours when today has no activity', async () => {
    await service.runDailyReminder(new Date('2026-09-22T15:00:00.000Z')); // 10:00 Lima

    expect(send.execute).toHaveBeenCalledTimes(1);
    expect(send.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'DAILY_REMINDER',
        data: { route: '/add-transaction', reminderFrequency: 'hourly' },
      }),
    );
  });

  it('stops reminders after the user records a transaction today', async () => {
    prisma.transaction.count.mockResolvedValue(1);

    await service.runDailyReminder(new Date('2026-09-22T15:00:00.000Z'));

    expect(send.execute).not.toHaveBeenCalled();
  });

  it('does not send hourly reminders overnight', async () => {
    await service.runDailyReminder(new Date('2026-09-22T10:00:00.000Z')); // 05:00 Lima

    expect(userPort.listEligibleUsers).not.toHaveBeenCalled();
    expect(send.execute).not.toHaveBeenCalled();
  });
});
