export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
export const DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export type Semester = 'Spring' | 'Summer' | 'Fall' | 'Winter';
export type Meeting = { day: Day; start: string; end: string; location: 'campus' | 'online' };
export type Component = 'lecture' | 'lab' | 'discussion';
export type Section = {
  id: string;
  component: Component;
  instructor: string;
  meetings: Meeting[];
  seats: 'open' | 'full' | 'unknown';
  linkedGroup?: string;
};
export type Course = {
  id: string;
  title: string;
  units: number;
  prerequisites: string[];
  sections: Section[];
};
export type DegreeRequirement = {
  courseId: string;
  status: 'completed' | 'in-progress' | 'remaining';
};
export type Feedback = { instructor: string; note: string; rating: number; source: 'fixture' };
export type Preferences = {
  semester: Semester;
  year: number;
  targetUnits: number;
  unavailableDays: Day[];
  unavailableBlocks: { day: Day; start: string; end: string }[];
  earliest: string;
  latest: string;
  prioritizeDaysOff: boolean;
  prioritizeFewerVisits: boolean;
  prioritizeFeedback: boolean;
};
export type Choice = { course: Course; sections: Section[] };
export type Schedule = { choices: Choice[]; units: number; score: number; daysOnCampus: number; reasons: string[]; tradeoffs: string[] };
