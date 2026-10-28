# Frontend

This frontend is a dependency-free static site served by Node.js.

## Structure

- `public/index.html` contains the workspace home page.
- `public/prospecting.html` contains the prospecting form.
- `public/css/styles.css` contains the responsive styles.
- `public/js/app.js` contains the form and page-navigation behavior.
- `images/` contains the artwork used as the home page background and the prospecting intro panel.
- `server.js` serves the static assets and background image, and forwards form submissions to the Python API.

The Previous runs menu loads completed runs from the backend. Select **Check executions** to retrieve the saved prospect records for that run.

## Run locally

Use Node.js 18.11 or newer:

```powershell
npm run dev
```

Open `http://localhost:3000` for the home page or `http://localhost:3000/prospecting` for the form. The Python API must be running at `http://127.0.0.1:8000` to submit the prospecting form.

For a non-watch server process, use:

```powershell
npm start
```

Set the `PORT` environment variable to change the frontend port.
