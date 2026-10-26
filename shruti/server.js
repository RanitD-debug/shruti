const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Detect Desktop directory
function getDesktopDirectory() {
    const userProfile = process.env.USERPROFILE || '';
    const oneDriveDesktop = path.join(userProfile, 'OneDrive', 'Desktop');
    if (fs.existsSync(oneDriveDesktop)) {
        return oneDriveDesktop;
    }
    const standardDesktop = path.join(userProfile, 'Desktop');
    if (fs.existsSync(standardDesktop)) {
        return standardDesktop;
    }
    return oneDriveDesktop;
}

const DESKTOP_DIR = getDesktopDirectory();
const ANSWERS_DIR = path.join(DESKTOP_DIR, 'Shruti_Answers');
const JSON_FILE = path.join(ANSWERS_DIR, 'answers.json');
const TXT_FILE = path.join(ANSWERS_DIR, 'answers_summary.txt');
const LOG_FILE = path.join(ANSWERS_DIR, 'live_activity.log');

// Ensure destination folder exists
if (!fs.existsSync(ANSWERS_DIR)) {
    fs.mkdirSync(ANSWERS_DIR, { recursive: true });
}

console.log(`[Shruti Quiz Server] Answers folder: ${ANSWERS_DIR}`);

// In-memory / persistent answers cache
function loadAnswers() {
    if (fs.existsSync(JSON_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
        } catch (e) {
            return { answers: {}, status: 'in-progress' };
        }
    }
    return { answers: {}, status: 'in-progress', startedAt: new Date().toISOString() };
}

function saveAnswersData(data) {
    fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2), 'utf8');

    // Build human-friendly readable text file
    const lines = [];
    lines.push('===================================================================');
    lines.push('                   🌸 SHRUTI\'S VIBE CHECK ANSWERS 🐾');
    lines.push('===================================================================');
    lines.push(`Last Updated : ${new Date().toLocaleString()}`);
    const answerEntries = Object.entries(data.answers || {});
    lines.push(`Progress     : ${answerEntries.length} question(s) answered`);
    lines.push(`Status       : ${data.status === 'completed' ? '🎉 COMPLETED! (Said YES! 🐈💖)' : '⏳ In Progress...'}`);
    lines.push('===================================================================\n');

    if (answerEntries.length === 0) {
        lines.push('(Waiting for her first response...)\n');
    } else {
        answerEntries.forEach(([qId, item], index) => {
            lines.push(`[${qId.toUpperCase()}]`);
            lines.push(`Question: ${item.question}`);
            lines.push(`Answer  : 👉 ${item.answer}`);
            lines.push(`Time    : ${item.formattedTime || item.timestamp}`);
            lines.push('-------------------------------------------------------------------');
        });
    }

    if (data.status === 'completed') {
        lines.push('\n💖 Date Confirmed! She said YES to going out before the 28th! ☕✨');
    }

    fs.writeFileSync(TXT_FILE, lines.join('\n'), 'utf8');
}

function appendLog(message) {
    const timeStr = new Date().toLocaleString();
    const logLine = `[${timeStr}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
    console.log(`[LIVE UPDATE] ${message}`);
}

const PORT = 3000;
const HTML_FILE_PATH = fs.existsSync(path.join(__dirname, 'index.html'))
    ? path.join(__dirname, 'index.html')
    : path.join(__dirname, 'pastel_cat_q_a_invite.html');

const server = http.createServer((req, res) => {
    // Enable CORS for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Serve HTML page
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html' || req.url === '/pastel_cat_q_a_invite.html')) {
        if (fs.existsSync(HTML_FILE_PATH)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fs.readFileSync(HTML_FILE_PATH));
            return;
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('HTML file not found');
            return;
        }
    }

    // Get current status / answers
    if (req.method === 'GET' && req.url === '/api/status') {
        const data = loadAnswers();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
    }

    // Save answer endpoint
    if (req.method === 'POST' && req.url === '/api/save-answer') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const { questionId, questionText, answer, isCompleted, isDraft } = payload;

                const store = loadAnswers();
                if (!store.answers) store.answers = {};

                const now = new Date();
                store.answers[questionId] = {
                    question: questionText,
                    answer: answer,
                    timestamp: now.toISOString(),
                    formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    isDraft: !!isDraft
                };

                store.lastUpdated = now.toISOString();
                if (isCompleted) {
                    store.status = 'completed';
                    store.completedAt = now.toISOString();
                }

                saveAnswersData(store);

                const draftTag = isDraft ? ' (typing draft)' : '';
                appendLog(`[${questionId}] ${questionText} => "${answer}"${draftTag}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, savedTo: ANSWERS_DIR }));
            } catch (err) {
                console.error('Error handling save-answer:', err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Fallback 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`===================================================================`);
    console.log(`🌸 Shruti Quiz Server is active!`);
    console.log(`🌐 Local URL    : http://localhost:${PORT}`);
    console.log(`📁 Saving to    : ${ANSWERS_DIR}`);
    console.log(`===================================================================`);
});
