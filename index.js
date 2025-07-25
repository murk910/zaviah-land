// index.js
const express = require('express');
const { google } = require('googleapis');
const session = require('express-session');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Session to store auth tokens
app.use(session({ secret: 'zaviah_secret', resave: false, saveUninitialized: true }));

// Configure Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Route: Home
app.get('/', (req, res) => {
  res.send('<a href="/auth">Connect Google Calendar</a>');
});

// Route: Start auth flow
app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly']
  });
  res.redirect(authUrl);
});

// Route: OAuth callback
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  req.session.tokens = tokens;
  res.redirect('/calendar');
});

// Route: Fetch calendar events
app.get('/calendar', async (req, res) => {
  if (!req.session.tokens) return res.status(401).send('Not authorized');
  oauth2Client.setCredentials(req.session.tokens);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const now = new Date().toISOString();

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now,
    maxResults: 5,
    singleEvents: true,
    orderBy: 'startTime'
  });

  const events = response.data.items.map(event => ({
    summary: event.summary,
    start: event.start.dateTime || event.start.date
  }));

  res.json(events);
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
