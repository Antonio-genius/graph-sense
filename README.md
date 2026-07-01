# Number Sense Trainer

A web based mini-game that trains your sense of numbers by letting you match tables and graphs.

## Features

- **6 question types** — Pie to Table, Table to Pie, Bar to Table, Table to Bar, Line to Table, Table to Line
- **Adjustable difficulty** — control data complexity with a 1–10 slider
- **Customizable rows and time limit** — up to 500 rows and configurable countdown
- **Statistics tracking** — per-category accuracy for all 6 question types
- **Practice mode** — drill any specific question type from the Statistics panel
- **Dark / light theme toggle** — preference saved to local storage
- **Pause and restart** — full game state management

## How to Run

No build step or dependencies required beyond Chart.js (loaded via CDN). You may simply open the folder and open index.html in your browser or use the following commands to run a local server:

```bash
# Python 3
python -m http.server 8080

# Or with npx
npx serve .
```

Then open `http://localhost:8080` in your browser.

To access from another device on the same network, use your machine's local IP:

```bash
python -m http.server 8080 --bind 0.0.0.0
```

## Tech Stack

- Vanilla HTML, CSS, and JavaScript (ES5-compatible)
- [Chart.js](https://www.chartjs.org/) for data visualization
