const express = require('express');
const path = require('path');
const helmet = require('helmet'); // Security headers
const rateLimit = require('express-rate-limit'); // Rate limiting
const cors = require('cors'); // CORS protection
const morgan = require('morgan'); // HTTP request logger
const getmac = require('getmac'); // Get MAC address

const app = express();

const PORT = process.env.PORT || 3000;

// Array to store logs
const logs = [];

// Helmet to set secure HTTP headers
app.use(helmet());

// Rate Limiting: Limit each IP to 100 requests per windowMs (15 minutes)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (15 minutes)
    message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Enable CORS with default settings (customize as needed)
app.use(cors());

// Custom Logging Middleware to log additional user info
app.use((req, res, next) => {
    try {
        // Get the MAC address of the local machine (server)
        const macAddress = getmac.default();

        // Create a log entry with details
        const logEntry = {
            ip: req.ip,
            macAddress: macAddress,
            userAgent: req.headers['user-agent'],
            method: req.method,
            url: req.originalUrl,
            timestamp: new Date(),
        };

        // Store the log entry
        logs.push(logEntry);

        // Log to console
        console.log(`[LOG] User Details: 
            IP Address: ${req.ip}
            MAC Address: ${macAddress}
            User-Agent: ${req.headers['user-agent']}
            Method: ${req.method}
            URL: ${req.originalUrl}
            Timestamp: ${logEntry.timestamp}`);
    } catch (err) {
        console.error('Error fetching MAC address:', err);
    }
    next();
});

// Logging HTTP requests using Morgan
app.use(morgan('combined'));

// Serve static files from the public and assets folder
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// Main route
app.get('/', (req, res) => {
    res.render('index');
});

// Route to display stored logs
app.get('/Site-Logs', (req, res) => {
    res.json(logs); // Send logs as JSON
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong! Please try again later.');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
