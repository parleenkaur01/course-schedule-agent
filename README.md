# SDSU Course Schedule Agent

A Chrome side-panel extension that helps plan course schedules. Its courses, sections, and instructor notes are **fixture data**, not live SDSU or Rate My Professors data. After you sign in, the extension can open Degree Evaluation, inspect the Snapshot chart, and look through expanded audit sections for unmet course options.

## What you need

- Node.js 20.19+ and npm
- Google Chrome 114+

## Run locally

```bash
npm install
npm run check
npm test
npm run build
```

To load the extension in Chrome:

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (upper right).
3. Click **Load unpacked** and select this project's `dist` folder.
4. Pin **SDSU Course Schedule Agent** using Chrome's puzzle-piece icon, then click its icon to open the side panel.
5. Select the days and time periods you can attend, optionally add a specific busy time, and click **Generate sample schedules**.

## Try the my.SDSU connection

1. In the side panel, click **Start SDSU workflow**. Chrome may request access to `cmsweb.cms.sdsu.edu` and `sdsu.uachieve.com`; grant it to let the extension navigate those two sites. If you already have the student homepage or an audit tab open, the workflow can start there.
2. Otherwise, the extension opens SDSU's official `https://my.sdsu.edu/` page. Click SDSU's **my.SDSU Login** link. Sign in on SDSU's pages and complete Duo yourself.
3. Leave the side panel open. It shows the current step: sign-in, open Degree Evaluation, select program, run program, and view audit. A temporary arrow and outline show where the extension is about to click.
4. If another SDSU sign-in appears, complete it on SDSU's page. The panel shows the instruction, and Chrome may display a system notification. The extension does not read or store login fields, credentials, Duo codes, or cookies.
5. If there are several degree programs or several completed audits, choose the correct one yourself. The extension resumes after the page changes.
6. Once the audit opens, the extension scrolls to **SNAPSHOT**, hovers over its chart segments, opens all sections, and scrolls through the requirements. The side panel shows Complete, In Progress, and Not Met units separately. **Target** uses the verified Not Met amount only when the categories add up to the required total. It lists course options found in visibly unmet requirements for review.

The workflow waits up to 15 minutes for a student homepage. It recognizes the confirmed uAchieve audit hostname `sdsu.uachieve.com` and clicks controls only when there is a unique visible match. The audit inspector sends chart counts and short unmet requirement/course labels to extension session storage. It does not send the full audit or credentials. The signed-in page structure is unavailable locally, so the chart hover and course extraction still need a live browser test. A listed course may be one of several allowed options; do not treat the list as a final graduation plan.

If the check cannot see the tiles, share only the non-sensitive **hostname** shown in the address bar and the status message in the side panel. Do not share your password, Duo code, student ID, or a full screenshot of your account.

After changing source code, run `npm run build` again and click the extension's **Reload** button on `chrome://extensions`.

For UI development in a normal browser tab, `npm run dev` opens the side-panel page at Vite's local URL. The Chrome side-panel behavior itself is tested by loading `dist` as above.

## How this version works

The side panel gathers preferences, including a semester and the current or following year, and calls a deterministic scheduler. Changing the term labels the sample results; it does not fetch term-specific offerings yet. The **Target** button shows verified Not Met units from the audit chart. In Progress units are displayed separately because they depend on course completion. Sample schedules still use the invented 10-unit degree evaluation in `src/fixtures/sampleCourses.ts`, so they must not be treated as a plan for the real target. Selected morning, afternoon, evening, and night periods define when a class may meet; adjacent selected periods allow a class to cross their boundary. The scheduler combines required lecture/lab components, rejects overlaps and blocked hours, and ranks valid combinations. It ranks days off separately from waiting time between campus classes. Grading, assignment, and attendance style preferences use invented student-report patterns in the fixture file and never override schedule validity. There are no API keys or live course-section requests in this version.

## Next milestone

After the audit inspector is confirmed against the live page, connect the confirmed unmet courses to the Manage Classes listings. Never share a password or Duo code.
