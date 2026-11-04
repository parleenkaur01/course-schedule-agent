# SDSU Course Schedule Agent

A Chrome side-panel extension that helps plan course schedules. Its courses, sections, and instructor notes are **fixture data**, not live SDSU or Rate My Professors data. The extension can open the official my.SDSU site and check for two student-homepage tiles after you sign in, but does not read your degree evaluation yet.

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

1. In the side panel, click **Open my.SDSU**. This opens SDSU's official `https://my.sdsu.edu/` page.
2. Click SDSU's **my.SDSU Login** link. Sign in on SDSU's pages and complete Duo yourself.
3. When your student homepage is visible, leave that tab active and click **Check student homepage** in the side panel.
4. Chrome may ask whether to allow the extension to access `cmsweb.cms.sdsu.edu`. This permission is used only to check for the Degree Evaluation and Manage Classes tile labels. The extension does not read or store login fields, credentials, Duo codes, cookies, or student records.
5. If both tiles are detected, the panel shows **Student homepage detected**. This confirms only that the expected homepage labels are visible, not that a degree evaluation has been read.

If the check cannot see the tiles, share only the non-sensitive **hostname** shown in the address bar and the status message in the side panel. Do not share your password, Duo code, student ID, or a full screenshot of your account.

After changing source code, run `npm run build` again and click the extension's **Reload** button on `chrome://extensions`.

For UI development in a normal browser tab, `npm run dev` opens the side-panel page at Vite's local URL. The Chrome side-panel behavior itself is tested by loading `dist` as above.

## How this version works

The side panel gathers preferences, including a semester and the current or following year, and calls a deterministic scheduler. Changing the term labels the sample results; it does not fetch term-specific offerings yet. The unit goal is calculated from the invented degree evaluation in `src/fixtures/sampleCourses.ts`; the student does not enter it. Selected morning, afternoon, evening, and night periods define when a class may meet; adjacent selected periods allow a class to cross their boundary. The scheduler combines required lecture/lab components, rejects overlaps and blocked hours, and ranks valid combinations. It ranks days off separately from waiting time between campus classes. Grading, assignment, and attendance style preferences use invented student-report patterns in the fixture file and never override schedule validity. There are no API keys, SDSU host permissions, or live site requests in this version.

## Next milestone

After you confirm the homepage connection in Chrome, we will inspect the Degree Evaluation and Manage Classes pages in your browser session, then implement an extraction adapter. Degree Evaluation may use another domain, so its permission will be added only after the domain is identified. Never share a password or Duo code.
