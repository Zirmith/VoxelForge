const express = require('express');
const path = require('path');
const helmet = require('helmet'); // Security headers
const rateLimit = require('express-rate-limit'); // Rate limiting
const cors = require('cors'); // CORS protection
const morgan = require('morgan'); // HTTP request logger
const getmac = require('getmac'); // Get MAC address
const axios = require('axios')
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

// Route to get the Minecraft head image without the helmet
app.get('/head/:username/nohelm', async (req, res) => {
    const { username } = req.params;

    try {
        // Attempt to fetch the image from mc-heads.net
        const response = await axios({
            method: 'get',
            url: `https://mc-heads.net/head/${username}/nohelm`,
            responseType: 'arraybuffer' // Ensures we get the image data in binary form
        });

        // Set the content type to image/png
        res.setHeader('Content-Type', 'image/png');
        // Send the image back as a response
        res.send(Buffer.from(response.data, 'binary'));
    } catch (error) {
        console.log(`mc-heads.net failed, trying minotar.net for ${username}`);

        // Fallback to minotar.net if the first attempt fails
        try {
            const fallbackResponse = await axios({
                method: 'get',
                url: `https://minotar.net/avatar/${username}/32`,
                responseType: 'arraybuffer'
            });

            res.setHeader('Content-Type', 'image/png');
            res.send(Buffer.from(fallbackResponse.data, 'binary'));
        } catch (fallbackError) {
            console.error('Both mc-heads.net and minotar.net failed:', fallbackError);
            res.status(500).send('Error fetching Minecraft head');
        }
    }
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong! Please try again later.');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
