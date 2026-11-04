import { useEffect, useState } from 'react';
import { sampleCourses, sampleDegreeEvaluation, sampleFeedback } from '../fixtures/sampleCourses';
import { DAYS, TIME_WINDOWS, type Day, type Preferences, type Schedule, type Semester, type TimeWindowId } from '../models/schedule';
import { deriveDegreeProgress } from '../scheduler/degreeProgress';
import { generateSchedules } from '../scheduler/generateSchedules';
import { PORTAL_ORIGIN, RUN_KEY, type SdsuWorkflow } from '../sdsu/portal';

const currentYear = new Date().getFullYear();
const month = new Date().getMonth();
const semesters: Semester[] = ['Spring', 'Fall', 'Summer', 'Winter'];
const currentSemester: Semester = month < 2 || month === 11 ? 'Winter' : month < 5 ? 'Spring' : month < 8 ? 'Summer' : 'Fall';
const degreeProgress = deriveDegreeProgress(sampleDegreeEvaluation, sampleCourses);

const initial: Preferences = {
  semester: currentSemester, year: currentYear, targetUnits: degreeProgress.remainingUnits, unavailableDays: [], unavailableBlocks: [],
  timeWindows: ['morning', 'afternoon', 'evening', 'night'], prioritizeDaysOff: true, minimizeCampusGaps: true,
  instructorStyle: { grading: 'any', assignments: 'any', attendance: 'any' },
};

const pretty = (time: string) => new Date(`2000-01-01T${time}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const timeChoices = Array.from({ length: 65 }, (_, index) => {
  const minutes = 6 * 60 + index * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

export function App() {
  const [prefs, setPrefs] = useState<Preferences>(initial);
  const [day, setDay] = useState<Day>('Mon');
  const [blockStart, setBlockStart] = useState('12:00');
  const [blockEnd, setBlockEnd] = useState('13:00');
  const [results, setResults] = useState<Schedule[] | null>(null);
  const [progress, setProgress] = useState('Ready to plan with example data');
  const [error, setError] = useState('');
  const [workflow, setWorkflow] = useState<SdsuWorkflow | null>(null);
  const [portalMessage, setPortalMessage] = useState('Ready to open my.SDSU.');
  const [startingPortal, setStartingPortal] = useState(false);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.session) return;
    void chrome.storage.session.get(RUN_KEY).then((stored) => {
      setWorkflow((stored[RUN_KEY] as SdsuWorkflow | undefined) ?? null);
    });
    const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'session' && changes[RUN_KEY]) setWorkflow((changes[RUN_KEY].newValue as SdsuWorkflow | undefined) ?? null);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const startPortal = async () => {
    if (typeof chrome === 'undefined' || !chrome.permissions || !chrome.runtime) {
      setPortalMessage('Load the built extension in Chrome to start the SDSU workflow.');
      return;
    }
    setStartingPortal(true);
    try {
      // Request site access directly from the button click, before opening SDSU.
      const granted = await chrome.permissions.request({ permissions: ['scripting'], origins: [PORTAL_ORIGIN] });
      if (!granted) {
        setPortalMessage('Chrome access was not granted. Allow portal access when you are ready to try again.');
        return;
      }
      const response = await chrome.runtime.sendMessage({ type: 'START_SDSU_WORKFLOW' }) as { ok: boolean };
      if (!response?.ok) setPortalMessage('Could not start the workflow. Reload the extension and try again.');
    } catch {
      setPortalMessage('Could not start the workflow. Reload the extension and try again.');
    } finally {
      setStartingPortal(false);
    }
  };

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((current) => ({ ...current, [key]: value }));
    setResults(null);
    setProgress('Ready to plan with example data');
  };
  const toggleDay = (value: Day) => update('unavailableDays', prefs.unavailableDays.includes(value) ? prefs.unavailableDays.filter((item) => item !== value) : [...prefs.unavailableDays, value]);
  const toggleTimeWindow = (value: TimeWindowId) => update('timeWindows', prefs.timeWindows.includes(value) ? prefs.timeWindows.filter((item) => item !== value) : [...prefs.timeWindows, value]);
  const updateStyle = <K extends keyof Preferences['instructorStyle']>(key: K, value: Preferences['instructorStyle'][K]) =>
    update('instructorStyle', { ...prefs.instructorStyle, [key]: value });
  const changeBlockStart = (value: string) => {
    setBlockStart(value);
    if (value >= blockEnd) setBlockEnd(timeChoices[Math.min(timeChoices.indexOf(value) + 4, timeChoices.length - 1)]);
  };
  const addBlock = () => {
    if (blockStart >= blockEnd) { setError('The blocked period must end after it starts.'); return; }
    setError('');
    if (prefs.unavailableBlocks.some((block) => block.day === day && block.start === blockStart && block.end === blockEnd)) return;
    update('unavailableBlocks', [...prefs.unavailableBlocks, { day, start: blockStart, end: blockEnd }]);
  };
  const generate = () => {
    if (prefs.timeWindows.length === 0) { setError('Choose at least one class time period.'); return; }
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
      <div className="demo-badge">SAMPLE SCHEDULES · Live SDSU courses not connected yet</div>
    </header>

    <section className="card portal-card" aria-label="Connect to my.SDSU">
      <div className="section-title"><span className="step">↗</span><h2>Connect to my.SDSU</h2></div>
      <p>Start here, then sign in and complete Duo on SDSU’s pages. Once the student homepage appears, the extension will look for and open Degree Evaluation while showing its progress here.</p>
      <div className="portal-actions"><button type="button" disabled={startingPortal || workflow?.phase === 'awaiting-sign-in' || workflow?.phase === 'opening-degree-evaluation'} onClick={() => { void startPortal(); }}>{startingPortal ? 'Starting…' : 'Start SDSU workflow'}</button></div>
      <p className={workflow?.phase === 'tile-clicked' ? 'portal-ready' : 'portal-help'} role="status">{workflow?.message ?? portalMessage}</p>
      <small>The extension uses only the SDSU portal site to open the tile. Another SDSU sign-in may appear. Sample schedules below still use invented data.</small>
    </section>

    <section className="card" aria-label="Schedule preferences">
      <div className="section-title"><span className="step">1</span><h2>Your preferences</h2></div>
      <div className="two-col"><label>Semester<select value={prefs.semester} onChange={(event) => update('semester', event.target.value as Semester)}>{semesters.map((semester) => <option key={semester} value={semester}>{semester}</option>)}</select></label><label>Year<select value={prefs.year} onChange={(event) => update('year', Number(event.target.value))}>{[currentYear, currentYear + 1].map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div>
      <div className="empty" role="status">Sample degree evaluation: <strong>{degreeProgress.remainingUnits} units remaining</strong> across {degreeProgress.remainingCourses.length} courses. This total is calculated from example requirements and will be replaced by your real evaluation after SDSU integration.</div>
      <div className="field-label">Days you can attend class</div>
      <p className="availability-hint">Green = available. Tap a day to turn it off.</p>
      <div className="day-buttons" role="group" aria-label="Available days">{DAYS.map((value) => {
        const available = !prefs.unavailableDays.includes(value);
        return <button key={value} type="button" aria-pressed={available} className={available ? 'selected' : ''} onClick={() => toggleDay(value)}>{value}</button>;
      })}</div>
      <div className="field-label">Class times that work for you</div>
      <p className="availability-hint">Check one or more. Classes must fit within the periods you select.</p>
      <div className="time-window-options">{TIME_WINDOWS.map((window) => <label className="time-window" key={window.id}><input type="checkbox" checked={prefs.timeWindows.includes(window.id)} onChange={() => toggleTimeWindow(window.id)} /><span><strong>{window.label}</strong><small>{window.hours}</small></span></label>)}</div>
      <details className="busy-details"><summary>Have a specific busy time? (optional)</summary><p className="availability-hint">Choose a day and time range, then add it.</p>
        <div className="time-block"><select aria-label="Busy day" value={day} onChange={(event) => setDay(event.target.value as Day)}>{DAYS.map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Busy from" value={blockStart} onChange={(event) => changeBlockStart(event.target.value)}>{timeChoices.slice(0, -1).map((time) => <option key={time} value={time}>{pretty(time)}</option>)}</select><select aria-label="Busy until" value={blockEnd} onChange={(event) => setBlockEnd(event.target.value)}>{timeChoices.filter((time) => time > blockStart).map((time) => <option key={time} value={time}>{pretty(time)}</option>)}</select><button type="button" onClick={addBlock}>Add</button></div>
        {prefs.unavailableBlocks.length > 0 && <div className="chips">{prefs.unavailableBlocks.map((block, index) => <button key={`${block.day}-${block.start}-${index}`} type="button" onClick={() => update('unavailableBlocks', prefs.unavailableBlocks.filter((_, item) => item !== index))} aria-label={`Remove ${block.day} ${block.start} to ${block.end}`}>{block.day} {pretty(block.start)}–{pretty(block.end)} ×</button>)}</div>}
      </details>
      <div className="field-label">What matters most?</div>
      <label className="checkbox"><input type="checkbox" checked={prefs.minimizeCampusGaps} onChange={(event) => update('minimizeCampusGaps', event.target.checked)} />Shorter gaps between campus classes</label>
      <p className="availability-hint">For example, avoid waiting from 10:50 AM until 2 PM between classes.</p>
      <label className="checkbox"><input type="checkbox" checked={prefs.prioritizeDaysOff} onChange={(event) => update('prioritizeDaysOff', event.target.checked)} />More days off campus</label>
      <p className="availability-hint">Group classes on fewer weekdays when possible.</p>
      <div className="field-label">Instructor style (optional)</div>
      <p className="availability-hint">Based only on invented example student reports in this demo.</p>
      <label>Grading<select value={prefs.instructorStyle.grading} onChange={(event) => updateStyle('grading', event.target.value as Preferences['instructorStyle']['grading'])}><option value="any">No preference</option><option value="easier">Easier grading reported</option><option value="stricter">Stricter grading reported</option></select></label>
      <label>Assignments<select value={prefs.instructorStyle.assignments} onChange={(event) => updateStyle('assignments', event.target.value as Preferences['instructorStyle']['assignments'])}><option value="any">No preference</option><option value="lighter">Lighter workload reported</option><option value="heavier">Heavier workload reported</option></select></label>
      <label>Attendance<select value={prefs.instructorStyle.attendance} onChange={(event) => updateStyle('attendance', event.target.value as Preferences['instructorStyle']['attendance'])}><option value="any">No preference</option><option value="flexible">Flexible attendance reported</option><option value="mandatory">Mandatory attendance reported</option></select></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" onClick={generate}>Generate sample schedules <span aria-hidden="true">→</span></button>
    </section>

    <section className="results" aria-live="polite">
      <div className="section-title"><span className="step">2</span><h2>Schedule options</h2></div>
      <p className="status">{progress}</p>
      {results?.length === 0 && <div className="empty">No schedule fits these constraints. Try allowing another day or extending your hours. Any unscheduled requirement still needs a later term.</div>}
      {results?.map((schedule, index) => <article className="option" key={index}>
        <div className="option-heading"><div><small>OPTION {index + 1}</small><h3>{index === 0 ? 'Best overall fit' : `Alternative ${index}`}</h3></div><strong>{schedule.units} units</strong></div>
        <div className="facts"><span>{schedule.daysOnCampus} campus days</span><span>{schedule.campusGapMinutes} min between campus classes</span><span>{schedule.choices.length} courses</span></div>
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
