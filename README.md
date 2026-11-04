# SDSU Course Schedule Agent

A Chrome side-panel extension that helps plan course schedules. This first milestone is a **fixture demo**: its courses, sections, and instructor notes are examples, not live SDSU or Rate My Professors data. It does not access your SDSU account yet.

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

After changing source code, run `npm run build` again and click the extension's **Reload** button on `chrome://extensions`.

For UI development in a normal browser tab, `npm run dev` opens the side-panel page at Vite's local URL. The Chrome side-panel behavior itself is tested by loading `dist` as above.

## How this version works

The side panel gathers preferences, including a semester and the current or following year, and calls a deterministic scheduler. Changing the term labels the sample results; it does not fetch term-specific offerings yet. The unit goal is calculated from the invented degree evaluation in `src/fixtures/sampleCourses.ts`; the student does not enter it. Selected morning, afternoon, evening, and night periods define when a class may meet; adjacent selected periods allow a class to cross their boundary. The scheduler combines required lecture/lab components, rejects overlaps and blocked hours, and ranks valid combinations. Instructor notes in the fixture file are invented examples and are labeled as such in the UI. There are no API keys, SDSU host permissions, or live site requests in this version.

## Next milestone

After you sign in normally on my.SDSU, we will inspect the real Degree Evaluation and Manage Classes pages in your browser session, then implement an extraction adapter. We will ask for only the relevant browser permissions once the actual domains and page structure are known. Never share a password or Duo code.
