import type { Course, DegreeRequirement } from '../models/schedule';

export function deriveDegreeProgress(requirements: DegreeRequirement[], courses: Course[]) {
  const remainingIds = [...new Set(requirements.filter((item) => item.status === 'remaining').map((item) => item.courseId))];
  const remainingCourses = remainingIds.flatMap((id) => courses.find((course) => course.id === id) ?? []);
  const missingCourseIds = remainingIds.filter((id) => !remainingCourses.some((course) => course.id === id));
  return {
    remainingCourses,
    remainingUnits: remainingCourses.reduce((sum, course) => sum + course.units, 0),
    missingCourseIds,
  };
}
