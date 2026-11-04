import type { Course, Feedback } from '../models/schedule';

// Entirely invented example offerings. Never present these as real SDSU sections.
export const sampleCourses: Course[] = [
  { id: 'CS 210', title: 'Data Structures', units: 3, prerequisites: [], sections: [
    { id: '01', component: 'lecture', instructor: 'Alex Rivera', seats: 'open', meetings: [{ day: 'Mon', start: '09:00', end: '10:15', location: 'campus' }, { day: 'Wed', start: '09:00', end: '10:15', location: 'campus' }] },
    { id: '02', component: 'lecture', instructor: 'Morgan Lee', seats: 'open', meetings: [{ day: 'Tue', start: '13:00', end: '14:15', location: 'campus' }, { day: 'Thu', start: '13:00', end: '14:15', location: 'campus' }] },
  ] },
  { id: 'MATH 245', title: 'Discrete Mathematics', units: 3, prerequisites: [], sections: [
    { id: '01', component: 'lecture', instructor: 'Jordan Kim', seats: 'open', meetings: [{ day: 'Mon', start: '11:00', end: '12:15', location: 'campus' }, { day: 'Wed', start: '11:00', end: '12:15', location: 'campus' }] },
    { id: '02', component: 'lecture', instructor: 'Taylor Chen', seats: 'open', meetings: [{ day: 'Tue', start: '10:00', end: '11:15', location: 'campus' }, { day: 'Thu', start: '10:00', end: '11:15', location: 'campus' }] },
  ] },
  { id: 'BIO 101', title: 'Introduction to Biology', units: 4, prerequisites: [], sections: [
    { id: '01', component: 'lecture', instructor: 'Sam Patel', seats: 'open', linkedGroup: 'A', meetings: [{ day: 'Mon', start: '13:00', end: '14:15', location: 'campus' }, { day: 'Wed', start: '13:00', end: '14:15', location: 'campus' }] },
    { id: 'L1', component: 'lab', instructor: 'Casey Park', seats: 'open', linkedGroup: 'A', meetings: [{ day: 'Fri', start: '10:00', end: '12:00', location: 'campus' }] },
    { id: 'L2', component: 'lab', instructor: 'Casey Park', seats: 'open', linkedGroup: 'A', meetings: [{ day: 'Wed', start: '14:30', end: '16:30', location: 'campus' }] },
    { id: '02', component: 'lecture', instructor: 'Robin Diaz', seats: 'open', linkedGroup: 'B', meetings: [{ day: 'Tue', start: '15:00', end: '16:15', location: 'campus' }, { day: 'Thu', start: '15:00', end: '16:15', location: 'campus' }] },
    { id: 'L3', component: 'lab', instructor: 'Drew Singh', seats: 'open', linkedGroup: 'B', meetings: [{ day: 'Thu', start: '10:00', end: '12:00', location: 'campus' }] },
  ] },
];

export const sampleFeedback: Feedback[] = [
  { instructor: 'Alex Rivera', rating: 4.4, note: 'Example student reports praise clear explanations.', source: 'fixture' },
  { instructor: 'Morgan Lee', rating: 4.8, note: 'Example student reports mention helpful office hours.', source: 'fixture' },
  { instructor: 'Jordan Kim', rating: 4.2, note: 'Example student reports mention frequent quizzes.', source: 'fixture' },
  { instructor: 'Taylor Chen', rating: 4.5, note: 'Example student reports praise organized lectures.', source: 'fixture' },
  { instructor: 'Sam Patel', rating: 4.1, note: 'Example student reports mention a steady workload.', source: 'fixture' },
  { instructor: 'Robin Diaz', rating: 4.7, note: 'Example student reports praise detailed feedback.', source: 'fixture' },
];
