import { useState } from 'react';
import { sampleCourses, sampleDegreeEvaluation, sampleFeedback } from '../fixtures/sampleCourses';
import { DAYS, type Day, type Preferences, type Schedule, type Semester } from '../models/schedule';
import { deriveDegreeProgress } from '../scheduler/degreeProgress';
import { generateSchedules } from '../scheduler/generateSchedules';

const currentYear = new Date().getFullYear();
const month = new Date().getMonth();
const semesters: Semester[] = ['Spring', 'Fall', 'Summer', 'Winter'];
const currentSemester: Semester = month < 2 || month === 11 ? 'Winter' : month < 5 ? 'Spring' : month < 8 ? 'Summer' : 'Fall';
const degreeProgress = deriveDegreeProgress(sampleDegreeEvaluation, sampleCourses);

const initial: Preferences = {
  semester: currentSemester, year: currentYear, targetUnits: degreeProgress.remainingUnits, unavailableDays: [], unavailableBlocks: [],
  earliest: '08:00', latest: '18:00', prioritizeDaysOff: true, prioritizeFewerVisits: true, prioritizeFeedback: false,
};

const pretty = (time: string) => new Date(`2000-01-01T${time}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export function App() {
  const [prefs, setPrefs] = useState<Preferences>(initial);
  const [day, setDay] = useState<Day>('Mon');
  const [blockStart, setBlockStart] = useState('12:00');
  const [blockEnd, setBlockEnd] = useState('13:00');
  const [results, setResults] = useState<Schedule[] | null>(null);
  const [progress, setProgress] = useState('Ready to plan with example data');
  const [error, setError] = useState('');

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((current) => ({ ...current, [key]: value }));
    setResults(null);
    setProgress('Ready to plan with example data');
  };
  const toggleDay = (value: Day) => update('unavailableDays', prefs.unavailableDays.includes(value) ? prefs.unavailableDays.filter((item) => item !== value) : [...prefs.unavailableDays, value]);
  const addBlock = () => {
    if (blockStart >= blockEnd) { setError('The blocked period must end after it starts.'); return; }
    setError('');
    update('unavailableBlocks', [...prefs.unavailableBlocks, { day, start: blockStart, end: blockEnd }]);
  };
  const generate = () => {
    if (prefs.earliest >= prefs.latest) { setError('Latest end must be after earliest start.'); return; }
    if (degreeProgress.missingCourseIds.length) { setError('Sample degree requirements have missing course data. Cannot calculate units.'); return; }
    if (degreeProgress.remainingUnits === 0) { setError('No remaining sample courses to schedule.'); return; }
    setError('');
    setProgress('Building schedules from example sections…');
    // Let React show the progress state before the calculation.
    window.setTimeout(() => {
      const schedules = generateSchedules(degreeProgress.remainingCourses, prefs, sampleFeedback);
      setResults(schedules);
      setProgress(schedules.length ? `Found ${schedules.length} sample options for ${prefs.semester} ${prefs.year}` : `No valid sample schedule found for ${prefs.semester} ${prefs.year}`);
    }, 60);
  };

  return <main>
    <header className="hero">
      <div className="eyebrow">SDSU COURSE SCHEDULE AGENT</div>
      <h1>Make room for your semester.</h1>
      <p>Explore sample schedules around the times that work for you.</p>
      <div className="demo-badge">DEMO DATA · No SDSU account access yet</div>
    </header>

    <section className="card" aria-label="Schedule preferences">
      <div className="section-title"><span className="step">1</span><h2>Your preferences</h2></div>
      <div className="two-col"><label>Semester<select value={prefs.semester} onChange={(event) => update('semester', event.target.value as Semester)}>{semesters.map((semester) => <option key={semester} value={semester}>{semester}</option>)}</select></label><label>Year<select value={prefs.year} onChange={(event) => update('year', Number(event.target.value))}>{[currentYear, currentYear + 1].map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div>
      <div className="empty" role="status">Sample degree evaluation: <strong>{degreeProgress.remainingUnits} units remaining</strong> across {degreeProgress.remainingCourses.length} courses. This total is calculated from example requirements and will be replaced by your real evaluation after SDSU integration.</div>
      <div className="field-label">Days you cannot attend</div>
      <div className="day-buttons">{DAYS.map((value) => <button key={value} type="button" aria-pressed={prefs.unavailableDays.includes(value)} className={prefs.unavailableDays.includes(value) ? 'selected' : ''} onClick={() => toggleDay(value)}>{value}</button>)}</div>
      <div className="field-label">Time you cannot attend</div>
      <div className="time-block"><select aria-label="Blocked day" value={day} onChange={(event) => setDay(event.target.value as Day)}>{DAYS.map((value) => <option key={value}>{value}</option>)}</select><input aria-label="Blocked start" type="time" value={blockStart} onChange={(event) => setBlockStart(event.target.value)} /><input aria-label="Blocked end" type="time" value={blockEnd} onChange={(event) => setBlockEnd(event.target.value)} /><button type="button" onClick={addBlock}>Add</button></div>
      {prefs.unavailableBlocks.length > 0 && <div className="chips">{prefs.unavailableBlocks.map((block, index) => <button key={`${block.day}-${block.start}-${index}`} type="button" onClick={() => update('unavailableBlocks', prefs.unavailableBlocks.filter((_, item) => item !== index))} aria-label={`Remove ${block.day} ${block.start} to ${block.end}`}>{block.day} {pretty(block.start)}–{pretty(block.end)} ×</button>)}</div>}
      <div className="two-col"><label>Earliest start<input type="time" value={prefs.earliest} onChange={(event) => update('earliest', event.target.value)} /></label><label>Latest end<input type="time" value={prefs.latest} onChange={(event) => update('latest', event.target.value)} /></label></div>
      <div className="field-label">What matters most?</div>
      <label className="checkbox"><input type="checkbox" checked={prefs.prioritizeDaysOff} onChange={(event) => update('prioritizeDaysOff', event.target.checked)} />More days off</label>
      <label className="checkbox"><input type="checkbox" checked={prefs.prioritizeFewerVisits} onChange={(event) => update('prioritizeFewerVisits', event.target.checked)} />Fewer campus visits</label>
      <label className="checkbox"><input type="checkbox" checked={prefs.prioritizeFeedback} onChange={(event) => update('prioritizeFeedback', event.target.checked)} />Example instructor feedback</label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" onClick={generate}>Generate sample schedules <span aria-hidden="true">→</span></button>
    </section>

    <section className="results" aria-live="polite">
      <div className="section-title"><span className="step">2</span><h2>Schedule options</h2></div>
      <p className="status">{progress}</p>
      {results?.length === 0 && <div className="empty">No schedule fits these constraints. Try allowing another day or extending your hours. Any unscheduled requirement still needs a later term.</div>}
      {results?.map((schedule, index) => <article className="option" key={index}>
        <div className="option-heading"><div><small>OPTION {index + 1}</small><h3>{index === 0 ? 'Best overall fit' : `Alternative ${index}`}</h3></div><strong>{schedule.units} units</strong></div>
        <div className="facts"><span>{schedule.daysOnCampus} campus days</span><span>{schedule.choices.length} courses</span></div>
        <div className="week">{DAYS.map((value) => {
          const meetings = schedule.choices.flatMap((choice) => choice.sections.flatMap((section) => section.meetings.filter((meeting) => meeting.day === value).map((meeting) => ({ course: choice.course.id, section: section.id, meeting }))));
          meetings.sort((a, b) => a.meeting.start.localeCompare(b.meeting.start));
          return <div className="weekday" key={value}><b>{value}</b><div>{meetings.length ? meetings.map(({ course, section, meeting }) => <div className="meeting" key={`${course}-${section}-${meeting.start}`}><strong>{course}</strong><span>{pretty(meeting.start)}–{pretty(meeting.end)}</span></div>) : <span className="off">Free</span>}</div></div>;
        })}</div>
        <div className="course-list">{schedule.choices.map((choice) => <div className="course" key={choice.course.id}><strong>{choice.course.id} · {choice.course.title}</strong>{choice.sections.map((section) => {
          const feedback = sampleFeedback.find((item) => item.instructor === section.instructor);
          return <div key={section.id}><span>{section.component} {section.id} · {section.instructor} · seats {section.seats}</span>{feedback && <span className="feedback">Example feedback: {feedback.rating}/5 · {feedback.note}</span>}</div>;
        })}</div>)}</div>
        <p className="reason">{schedule.reasons.join(' · ')}</p><p className="tradeoff">Tradeoff: {schedule.tradeoffs.join(' ')}</p>
      </article>)}
      <p className="source">Source: invented local fixture data. No live sections, seat counts, or instructor reviews. Freshness: sample only.</p>
    </section>
  </main>;
}
