import { describe, expect, it } from 'vitest';
import { sampleCourses } from '../fixtures/sampleCourses';
import type { Course, Preferences } from '../models/schedule';
import { generateSchedules } from './generateSchedules';

const preferences: Preferences = {
  semester: 'Sample semester', targetUnits: 10, unavailableDays: [], unavailableBlocks: [], earliest: '08:00', latest: '18:00',
  prioritizeDaysOff: true, prioritizeFewerVisits: true, prioritizeFeedback: false,
};

describe('generateSchedules', () => {
  it('returns different valid bundles and always pairs biology lecture with a linked lab', () => {
    const schedules = generateSchedules(sampleCourses, preferences);
    expect(schedules.length).toBeGreaterThan(1);
    for (const schedule of schedules) {
      const bio = schedule.choices.find((choice) => choice.course.id === 'BIO 101');
      if (bio) {
        expect(bio.sections).toHaveLength(2);
        expect(bio.sections[0].linkedGroup).toBe(bio.sections[1].linkedGroup);
      }
      expect(schedule.units).toBeLessThanOrEqual(10);
    }
  });

  it('rejects overlapping classes', () => {
    const courses: Course[] = [
      { id: 'A', title: 'A', units: 3, prerequisites: [], sections: [{ id: '1', component: 'lecture', instructor: 'A', seats: 'open', meetings: [{ day: 'Mon', start: '09:00', end: '10:00', location: 'campus' }] }] },
      { id: 'B', title: 'B', units: 3, prerequisites: [], sections: [{ id: '1', component: 'lecture', instructor: 'B', seats: 'open', meetings: [{ day: 'Mon', start: '09:30', end: '10:30', location: 'campus' }] }] },
    ];
    expect(generateSchedules(courses, preferences).every((schedule) => schedule.choices.length === 1)).toBe(true);
  });

  it('respects unavailable days and time blocks', () => {
    const schedules = generateSchedules(sampleCourses, { ...preferences, unavailableDays: ['Fri'], unavailableBlocks: [{ day: 'Mon', start: '08:30', end: '10:00' }] });
    expect(schedules.length).toBeGreaterThan(0);
    expect(schedules.every((schedule) => schedule.choices.every((choice) => choice.sections.every((section) => section.meetings.every((meeting) => meeting.day !== 'Fri' && !(meeting.day === 'Mon' && meeting.start === '09:00')))))).toBe(true);
  });

  it('excludes full sections and unconfirmed prerequisites', () => {
    const courses: Course[] = [{ id: 'A', title: 'A', units: 3, prerequisites: ['PRE'], sections: [{ id: '1', component: 'lecture', instructor: 'A', seats: 'full', meetings: [] }] }];
    expect(generateSchedules(courses, preferences)).toEqual([]);
  });

  it('explains when no option can be generated', () => {
    expect(generateSchedules(sampleCourses, { ...preferences, unavailableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] })).toEqual([]);
  });
});
