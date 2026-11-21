# Job board

A small job board with fictional internship listings and companies. It has job
search, expandable role details, and saved jobs.

## What I built

- Each listing shows the role, company, location, and monthly stipend.
- **Role details** expands to show the description, responsibilities, helpful
  qualifications, and learning outcomes.
- Jobs can be saved and removed. Saved jobs remain after a page refresh.
- The API provides `POST /api/saved`, `GET /api/saved`, and
  `DELETE /api/saved/:jobId`. Unknown job IDs return a clear error.
- Saved job IDs are stored in `saved.json` in the project root.

## Run and test

You need Node 20 or newer. No packages need to be installed.

```sh
npm start
```

Open http://localhost:3000 to use the app. In another terminal, run the tests:

```sh
npm test
```

The tests use Node's built-in test runner. They cover saving, duplicate saves,
persistence across a restart, removing jobs, invalid and unknown IDs, and
complete role details. Test saves use temporary files so they do not change the
app's saved jobs.

## Quick walkthrough

1. Start the app and open a listing's **Role details**.
2. Click **Save** and find the job under **Saved jobs**.
3. Refresh the page to see that it is still saved, then click **Remove**.
4. Run `npm test` to verify the API and saved-jobs behavior.

## Design decision

The JSON file stores job IDs instead of copies of job records. This keeps the
saved list small and means saved jobs use the current listing details.

## Tool use

Vs Code and Copilot assisted with the saved-jobs API and file-backed store, page
interactions, expanded job descriptions, and tests. The implementation was
refined to display company, location, and monthly stipend separately and to
cover persistence, duplicate saves, removal, and invalid IDs.

## What I would do next

If the board added accounts, I would make saved jobs specific to each user.
