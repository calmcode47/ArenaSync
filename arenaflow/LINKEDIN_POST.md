Large venues still run too much of their crowd flow on guesswork: long queues, overloaded gates, delayed alerts, and poor visibility for staff.

For PromptWars, I built **ArenaFlow**: a full-stack venue intelligence platform for monitoring crowd density, queue pressure, and operational alerts in real time.

What ArenaFlow does:

- Forecasts queue pressure and wait times from live venue data
- Visualizes crowd density through a live 3D dashboard and map overlays
- Broadcasts operational alerts with multilingual support
- Keeps frontend and backend state synchronized over WebSockets

Tech stack:

- **Frontend:** React, TypeScript, Three.js, Framer Motion
- **Backend:** FastAPI, SQLAlchemy, WebSockets
- **Google services:** Google Maps, Google Cloud Translation, Firebase Hosting
- **Deployment:** Firebase Hosting for the frontend, Railway for the backend

The most useful part of this build was turning fragmented venue signals into a single operator view that staff can actually use under pressure.

Live preview: [https://flowarena-694a7.web.app](https://flowarena-694a7.web.app)
Repository: [https://github.com/calmcode47/ArenaSync](https://github.com/calmcode47/ArenaSync)

#PromptWars #FastAPI #React #TypeScript #ThreeJS #GoogleCloud #Firebase #WebDevelopment
