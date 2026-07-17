import { describe, expect, it } from 'vitest';
import { shouldAutoStartProcedureToday } from '@/lib/procedure-schedule';

describe('shouldAutoStartProcedureToday', () => {
  it('one_time solo el día de vencimiento', () => {
    expect(shouldAutoStartProcedureToday('one_time', '2026-07-17', '2026-07-17')).toBe(true);
    expect(shouldAutoStartProcedureToday('one_time', '2026-07-17', '2026-07-18')).toBe(false);
    expect(shouldAutoStartProcedureToday('one_time', '2026-07-17', '2026-07-16')).toBe(false);
  });

  it('daily desde la fecha de referencia', () => {
    expect(shouldAutoStartProcedureToday('daily', '2026-07-10', '2026-07-17')).toBe(true);
    expect(shouldAutoStartProcedureToday('daily', '2026-07-20', '2026-07-17')).toBe(false);
    expect(shouldAutoStartProcedureToday('daily', null, '2026-07-17')).toBe(true);
  });

  it('weekly_1 solo lunes a partir de la fecha', () => {
    // 2026-07-13 = lunes
    expect(shouldAutoStartProcedureToday('weekly_1', '2026-07-06', '2026-07-13')).toBe(true);
    // 2026-07-14 = martes
    expect(shouldAutoStartProcedureToday('weekly_1', '2026-07-06', '2026-07-14')).toBe(false);
  });

  it('monthly mismo día del mes', () => {
    expect(shouldAutoStartProcedureToday('monthly', '2026-06-17', '2026-07-17')).toBe(true);
    expect(shouldAutoStartProcedureToday('monthly', '2026-06-17', '2026-07-16')).toBe(false);
  });

  it('date_range hasta la fecha fin', () => {
    expect(shouldAutoStartProcedureToday('date_range', '2026-07-20', '2026-07-17')).toBe(true);
    expect(shouldAutoStartProcedureToday('date_range', '2026-07-10', '2026-07-17')).toBe(false);
  });
});
