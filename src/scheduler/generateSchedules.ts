import { DAYS, TIME_WINDOWS, type Choice, type Course, type Feedback, type Meeting, type Preferences, type Schedule, type Section } from '../models/schedule';

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const overlaps = (a: Pick<Meeting, 'day' | 'start' | 'end'>, b: Pick<Meeting, 'day' | 'start' | 'end'>) =>
  a.day === b.day && minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end);

function fitsTimeWindows(meeting: Meeting, preferences: Preferences): boolean {
  const windows = TIME_WINDOWS.filter((window) => preferences.timeWindows.includes(window.id));
  let coveredUntil = minutes(meeting.start);
  for (const window of windows) {
    if (minutes(window.start) <= coveredUntil && minutes(window.end) > coveredUntil) coveredUntil = minutes(window.end);
    if (coveredUntil >= minutes(meeting.end)) return true;
  }
  return false;
}

function bundles(course: Course): Section[][] {
  const lectures = course.sections.filter((section) => section.component === 'lecture' && section.seats === 'open');
  const requiredTypes = [...new Set(course.sections.filter((section) => section.component !== 'lecture').map((section) => section.component))];
  return lectures.flatMap((lecture) => {
    let combinations: Section[][] = [[lecture]];
    for (const type of requiredTypes) {
      const compatible = course.sections.filter((section) => section.component === type && section.seats === 'open' &&
        section.linkedGroup === lecture.linkedGroup);
      combinations = combinations.flatMap((combination) => compatible.map((section) => [...combination, section]));
    }
    return combinations;
  });
}

function valid(choices: Choice[], preferences: Preferences): boolean {
  const meetings = choices.flatMap((choice) => choice.sections.flatMap((section) => section.meetings));
  if (meetings.some((meeting) => preferences.unavailableDays.includes(meeting.day) ||
    !fitsTimeWindows(meeting, preferences) ||
    preferences.unavailableBlocks.some((block) => overlaps(meeting, block)))) return false;
  return meetings.every((meeting, index) => meetings.slice(index + 1).every((other) => !overlaps(meeting, other)));
}

function describe(choices: Choice[], preferences: Preferences, feedback: Feedback[]): Schedule {
  const units = choices.reduce((sum, choice) => sum + choice.course.units, 0);
  const meetings = choices.flatMap((choice) => choice.sections.flatMap((section) => section.meetings));
  const campusMeetings = meetings.filter((meeting) => meeting.location === 'campus');
  const daysOnCampus = new Set(campusMeetings.map((meeting) => meeting.day)).size;
  const campusGapMinutes = DAYS.reduce((total, day) => {
    const dayMeetings = campusMeetings.filter((meeting) => meeting.day === day).sort((a, b) => a.start.localeCompare(b.start));
    return total + dayMeetings.slice(1).reduce((sum, meeting, index) => sum + Math.max(0, minutes(meeting.start) - minutes(dayMeetings[index].end)), 0);
  }, 0);
  const instructorNotes = choices.flatMap((choice) => choice.sections.filter((section) => section.component === 'lecture'))
    .map((section) => feedback.find((item) => item.instructor === section.instructor));
  const styleSelections = (['grading', 'assignments', 'attendance'] as const)
    .filter((key) => preferences.instructorStyle[key] !== 'any');
  const styleMatches = instructorNotes.reduce((sum, note) => sum + styleSelections.filter((key) => note?.[key] === preferences.instructorStyle[key]).length, 0);
  const styleMismatches = instructorNotes.reduce((sum, note) => sum + styleSelections.filter((key) => note?.[key] && note[key] !== preferences.instructorStyle[key]).length, 0);
  const styleUnknown = instructorNotes.reduce((sum, note) => sum + styleSelections.filter((key) => !note?.[key]).length, 0);
  const daysOff = DAYS.length - new Set(meetings.map((meeting) => meeting.day)).size;
  const score = units * 20 - Math.abs(preferences.targetUnits - units) * 8 +
    (preferences.prioritizeDaysOff ? daysOff * 10 : 0) -
    (preferences.minimizeCampusGaps ? campusGapMinutes / 10 : 0) +
    styleMatches * 9 - styleMismatches * 9;
  const reasons = [`${units} of ${preferences.targetUnits} remaining units`, `${daysOff} class-free weekday${daysOff === 1 ? '' : 's'}`, `${daysOnCampus} campus day${daysOnCampus === 1 ? '' : 's'}`, `${campusGapMinutes} min waiting between campus classes`];
  if (styleSelections.length) reasons.push(`${styleMatches} sample instructor-style match${styleMatches === 1 ? '' : 'es'}`);
  const tradeoffs = [];
  if (units < preferences.targetUnits) tradeoffs.push('Some remaining courses would need another term.');
  if (campusGapMinutes >= 90) tradeoffs.push('One or more days have a long break between campus classes.');
  if (styleMismatches) tradeoffs.push('Some sample instructor feedback differs from your style choices.');
  if (styleUnknown) tradeoffs.push('Some selected instructor-style details are unknown in the sample feedback.');
  if (!tradeoffs.length) tradeoffs.push('Check exact section times and instructor notes before choosing.');
  return {
    choices, units, score, daysOnCampus, campusGapMinutes, reasons, tradeoffs,
  };
}

export function generateSchedules(courses: Course[], preferences: Preferences, feedback: Feedback[] = [], completedCourseIds: string[] = []): Schedule[] {
  const eligible = courses.filter((course) => course.prerequisites.every((prerequisite) => completedCourseIds.includes(prerequisite)));
  const results: Schedule[] = [];
  function visit(index: number, choices: Choice[], units: number): void {
    if (index === eligible.length) {
      if (choices.length) results.push(describe(choices, preferences, feedback));
      return;
    }
    visit(index + 1, choices, units);
    const course = eligible[index];
    if (units + course.units > preferences.targetUnits) return;
    for (const sections of bundles(course)) {
      const next = [...choices, { course, sections }];
      if (valid(next, preferences)) visit(index + 1, next, units + course.units);
    }
  }
  visit(0, [], 0);
  results.sort((a, b) => b.score - a.score || b.units - a.units);
  // Different options must have a different course set or at least one different section.
  const seen = new Set<string>();
  return results.filter((schedule) => {
    const key = schedule.choices.map((choice) => `${choice.course.id}:${choice.sections.map((section) => section.id).join('+')}`).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}
