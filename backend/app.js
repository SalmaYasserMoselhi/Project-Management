const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const dotenv = require('dotenv');
const compression = require('compression');

dotenv.config({ path: './.env' });
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('./config/passport');

const userRouter = require('./routes/userRoutes.js');
const docRouter = require('./routes/docRoutes.js');
const workspaceRouter = require('./routes/workspaceRoutes.js');
const boardRouter = require('./routes/boardRoutes.js');
const cardRouter = require('./routes/cardRoutes.js');
const listRouter = require('./routes/listRoutes.js');
const conversationRouter = require('./routes/conversationRoutes.js');
const messageRouter = require('./routes/messageRoutes.js');
const attachmentRouter = require('./routes/attachmentsRoutes.js');
const app = express();

// 1) Global Middlewares
// Enable trust proxy
app.enable('trust proxy');
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(
  cors({
    origin: true, // allows all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Access-Control-Allow-Credentials',
    ],
  })
);

// Additional CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Preflight requests
app.options('*', cors());

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Security middlewares
app.use(mongoSanitize());
app.use(xss());
app.use(hpp({}));

// Serving static files
app.use(express.static(path.join(__dirname, 'Uploads')));

// Request timestamp middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Compression
app.use(compression());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    },
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Debug Middlewares
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log('Request URL:', req.originalUrl);
    next();
  });

  app.use((req, res, next) => {
    console.log('Request Cookies:', req.cookies);
    next();
  });
}

// Routes
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to Beehive Community API',
    documentation: '/api/v1/docs',
    apiPrefix: '/api/v1',
  });
});

// API Routes
app.use('/api/v1/users', userRouter);
app.use('/api/v1/docs', docRouter);
app.use('/api/v1/workspaces', workspaceRouter);
app.use('/api/v1/boards', boardRouter);
app.use('/api/v1/cards', cardRouter);
app.use('/api/v1/lists', listRouter);
app.use('/api/v1/conversations', conversationRouter);
app.use('/api/v1/message', messageRouter);
// app.use('/api/v1/attachments', attachmentRouter);

// Handle undefined routes
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

module.exports = app;
