# TaskFlow — Student Productivity Dashboard

TaskFlow is a responsive, browser-based dashboard for organising academic tasks, tracking completion, and managing deadlines.

## Features

- Add, edit, delete, complete, and reopen tasks
- Categories, priority levels, descriptions, and date-only deadlines
- Live search, status and priority filtering, and task sorting
- Dynamic dashboard statistics, progress, upcoming deadlines, and recent tasks
- Accessible dialogs, keyboard controls, toast feedback, and visible focus states
- Persistent tasks and light or dark theme preference using localStorage

## Technologies

HTML5, CSS3, and vanilla JavaScript. No build tools or external dependencies are required.

## Run locally

Open `index.html` in a browser, or open the `taskflow` folder in VS Code and use Live Server.

## Structure

```text
taskflow/
├── index.html
├── css/style.css
├── js/app.js
├── assets/favicon.svg
└── README.md
```

## Responsive design

The interface is mobile-first. The desktop sidebar becomes an accessible slide-out navigation on smaller screens, while cards, filters, and dialogs adapt through CSS Grid, Flexbox, and media queries.

## Local storage

TaskFlow safely stores task data and theme choice in browser localStorage. Demonstration tasks are added only when storage is first initialized; user changes are then retained between visits. Invalid saved task records are discarded safely, and the interface continues with an empty task list when browser storage is unavailable.

