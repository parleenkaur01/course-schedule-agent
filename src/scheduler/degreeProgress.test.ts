import { describe, expect, it } from 'vitest';
import { sampleCourses, sampleDegreeEvaluation } from '../fixtures/sampleCourses';
import { deriveDegreeProgress } from './degreeProgress';

describe('deriveDegreeProgress', () => {
  it('counts each remaining course once and ignores completed or in-progress courses', () => {
    const progress = deriveDegreeProgress([
      ...sampleDegreeEvaluation,
      { courseId: 'CS 210', status: 'remaining' },
      { courseId: 'DONE', status: 'completed' },
      { courseId: 'NOW', status: 'in-progress' },
    ], sampleCourses);
    expect(progress.remainingUnits).toBe(10);
    expect(progress.remainingCourses).toHaveLength(3);
    expect(progress.missingCourseIds).toEqual([]);
  });

  it('reports missing course data instead of inventing units', () => {
    const progress = deriveDegreeProgress([{ courseId: 'UNKNOWN', status: 'remaining' }], sampleCourses);
    expect(progress.remainingUnits).toBe(0);
    expect(progress.missingCourseIds).toEqual(['UNKNOWN']);
  });
});
