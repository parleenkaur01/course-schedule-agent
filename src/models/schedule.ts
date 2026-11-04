export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
export const DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export type Semester = 'Spring' | 'Summer' | 'Fall' | 'Winter';
export const TIME_WINDOWS = [
  { id: 'morning', label: 'Morning', hours: '6 AM–12 PM', start: '06:00', end: '12:00' },
  { id: 'afternoon', label: 'Afternoon', hours: '12–4 PM', start: '12:00', end: '16:00' },
  { id: 'evening', label: 'Evening', hours: '4–7 PM', start: '16:00', end: '19:00' },
  { id: 'night', label: 'Night', hours: '7–10 PM', start: '19:00', end: '22:00' },
] as const;
export type TimeWindowId = typeof TIME_WINDOWS[number]['id'];
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
export type GradingStyle = 'easier' | 'stricter';
export type AssignmentStyle = 'lighter' | 'heavier';
export type AttendanceStyle = 'flexible' | 'mandatory';
export type Feedback = {
  instructor: string;
  note: string;
  rating: number;
  source: 'fixture';
  grading?: GradingStyle;
  assignments?: AssignmentStyle;
  attendance?: AttendanceStyle;
};
export type Preferences = {
  semester: Semester;
  year: number;
  targetUnits: number;
  unavailableDays: Day[];
  unavailableBlocks: { day: Day; start: string; end: string }[];
  timeWindows: TimeWindowId[];
  prioritizeDaysOff: boolean;
  minimizeCampusGaps: boolean;
  instructorStyle: {
    grading: GradingStyle | 'any';
    assignments: AssignmentStyle | 'any';
    attendance: AttendanceStyle | 'any';
  };
};
export type Choice = { course: Course; sections: Section[] };
export type Schedule = { choices: Choice[]; units: number; score: number; daysOnCampus: number; campusGapMinutes: number; reasons: string[]; tradeoffs: string[] };
