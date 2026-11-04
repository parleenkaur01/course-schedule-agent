import { describe, expect, it } from 'vitest';
import { sampleCourses } from '../fixtures/sampleCourses';
import type { Course, Feedback, Preferences } from '../models/schedule';
import { generateSchedules } from './generateSchedules';

const preferences: Preferences = {
  semester: 'Fall', year: 2026, targetUnits: 10, unavailableDays: [], unavailableBlocks: [], timeWindows: ['morning', 'afternoon', 'evening', 'night'],
  prioritizeDaysOff: true, minimizeCampusGaps: true, instructorStyle: { grading: 'any', assignments: 'any', attendance: 'any' },
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

  it('keeps classes inside selected periods and allows a class across adjoining selected periods', () => {
    const course: Course = { id: 'A', title: 'A', units: 3, prerequisites: [], sections: [
      { id: 'morning', component: 'lecture', instructor: 'A', seats: 'open', meetings: [{ day: 'Mon', start: '11:30', end: '12:15', location: 'campus' }] },
      { id: 'afternoon', component: 'lecture', instructor: 'B', seats: 'open', meetings: [{ day: 'Tue', start: '13:00', end: '14:00', location: 'campus' }] },
    ] };
    expect(generateSchedules([course], { ...preferences, timeWindows: ['morning'] })).toEqual([]);
    expect(generateSchedules([course], { ...preferences, timeWindows: ['afternoon'] })[0].choices[0].sections[0].id).toBe('afternoon');
    expect(generateSchedules([course], { ...preferences, timeWindows: ['morning', 'afternoon'] }).some((schedule) => schedule.choices[0].sections[0].id === 'morning')).toBe(true);
  });

  it('ranks a short campus gap above a long same-day gap when that preference is selected', () => {
    const courses: Course[] = [
      { id: 'A', title: 'A', units: 3, prerequisites: [], sections: [{ id: '1', component: 'lecture', instructor: 'A', seats: 'open', meetings: [{ day: 'Mon', start: '10:00', end: '10:50', location: 'campus' }] }] },
      { id: 'B', title: 'B', units: 3, prerequisites: [], sections: [
        { id: 'long-gap', component: 'lecture', instructor: 'B', seats: 'open', meetings: [{ day: 'Mon', start: '14:00', end: '15:00', location: 'campus' }] },
        { id: 'short-gap', component: 'lecture', instructor: 'B', seats: 'open', meetings: [{ day: 'Mon', start: '11:00', end: '12:00', location: 'campus' }] },
      ] },
    ];
    const schedules = generateSchedules(courses, { ...preferences, targetUnits: 6, prioritizeDaysOff: false });
    expect(schedules[0].choices[1].sections[0].id).toBe('short-gap');
    expect(schedules[0].campusGapMinutes).toBe(10);
    expect(schedules.find((schedule) => schedule.choices[1]?.sections[0].id === 'long-gap')?.campusGapMinutes).toBe(190);
  });

  it('uses reported instructor style for ranking without treating it as a hard constraint', () => {
    const course: Course = { id: 'A', title: 'A', units: 3, prerequisites: [], sections: [
      { id: 'strict', component: 'lecture', instructor: 'Strict', seats: 'open', meetings: [{ day: 'Mon', start: '10:00', end: '11:00', location: 'campus' }] },
      { id: 'easy', component: 'lecture', instructor: 'Easy', seats: 'open', meetings: [{ day: 'Mon', start: '10:00', end: '11:00', location: 'campus' }] },
    ] };
    const feedback: Feedback[] = [
      { instructor: 'Strict', note: 'Invented strict grading report.', rating: 4, grading: 'stricter', source: 'fixture' },
      { instructor: 'Easy', note: 'Invented easier grading report.', rating: 4, grading: 'easier', source: 'fixture' },
    ];
    const schedules = generateSchedules([course], { ...preferences, targetUnits: 3, instructorStyle: { ...preferences.instructorStyle, grading: 'easier' } }, feedback);
    expect(schedules.map((schedule) => schedule.choices[0].sections[0].id)).toEqual(['easy', 'strict']);
  });

  it('excludes full sections and unconfirmed prerequisites', () => {
    const courses: Course[] = [{ id: 'A', title: 'A', units: 3, prerequisites: ['PRE'], sections: [{ id: '1', component: 'lecture', instructor: 'A', seats: 'full', meetings: [] }] }];
    expect(generateSchedules(courses, preferences)).toEqual([]);
  });

  it('explains when no option can be generated', () => {
    expect(generateSchedules(sampleCourses, { ...preferences, unavailableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] })).toEqual([]);
  });
});
