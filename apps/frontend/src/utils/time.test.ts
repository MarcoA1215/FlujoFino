import { describe, it, expect } from 'vitest';
import { formatTime12h, formatTimeRange12h } from './time';

describe('formatTime12h', () => {
  it('formats morning times correctly', () => {
    expect(formatTime12h('08:00')).toBe('08:00 AM');
    expect(formatTime12h('09:30')).toBe('09:30 AM');
    expect(formatTime12h('11:45')).toBe('11:45 AM');
  });

  it('formats midnight and early morning', () => {
    expect(formatTime12h('00:00')).toBe('12:00 AM');
    expect(formatTime12h('00:15')).toBe('12:15 AM');
  });

  it('formats noon and afternoon times correctly', () => {
    expect(formatTime12h('12:00')).toBe('12:00 PM');
    expect(formatTime12h('12:30')).toBe('12:30 PM');
    expect(formatTime12h('13:00')).toBe('01:00 PM');
    expect(formatTime12h('14:30')).toBe('02:30 PM');
    expect(formatTime12h('20:00')).toBe('08:00 PM');
    expect(formatTime12h('23:59')).toBe('11:59 PM');
  });

  it('supports unpadded hours with padZero: false', () => {
    expect(formatTime12h('08:00', { padZero: false })).toBe('8:00 AM');
    expect(formatTime12h('14:30', { padZero: false })).toBe('2:30 PM');
    expect(formatTime12h('12:00', { padZero: false })).toBe('12:00 PM');
  });

  it('handles strings with seconds like HH:mm:ss', () => {
    expect(formatTime12h('14:30:00')).toBe('02:30 PM');
    expect(formatTime12h('09:15:32')).toBe('09:15 AM');
  });

  it('preserves already formatted AM/PM strings', () => {
    expect(formatTime12h('02:30 PM')).toBe('02:30 PM');
    expect(formatTime12h('9:00 AM')).toBe('9:00 AM');
  });

  it('handles empty and null values gracefully', () => {
    expect(formatTime12h('')).toBe('');
    expect(formatTime12h(null)).toBe('');
    expect(formatTime12h(undefined)).toBe('');
  });

  it('handles ISO timestamp strings', () => {
    expect(formatTime12h('2026-10-21T14:30:00.000Z')).toBe('02:30 PM');
  });
});

describe('formatTimeRange12h', () => {
  it('formats a range of times', () => {
    expect(formatTimeRange12h('08:00', '17:00')).toBe('08:00 AM - 05:00 PM');
    expect(formatTimeRange12h('09:30', '12:00')).toBe('09:30 AM - 12:00 PM');
  });

  it('handles partial ranges', () => {
    expect(formatTimeRange12h('08:00', null)).toBe('08:00 AM');
    expect(formatTimeRange12h(null, '17:00')).toBe('05:00 PM');
    expect(formatTimeRange12h(null, null)).toBe('');
  });
});
