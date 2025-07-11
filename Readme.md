# Nexus Community
**An Integrated Solution for Enhanced Team Productivity**

<div align="center">
  <img src="backend/assets/nexus-logo.png" alt="Nexus Community Logo" width="200"/>
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
  [![React](https://img.shields.io/badge/React-18.3+-blue.svg)](https://reactjs.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green.svg)](https://mongodb.com/)
</div>

## 📋 Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [Team](#team)
- [License](#license)

## 🚀 Overview

Nexus Community is a comprehensive, unified project management and collaboration platform that addresses the fragmentation of modern digital workspaces. Instead of juggling multiple tools like Trello, Slack, and calendar applications, teams can manage their entire workflow from a single, intuitive interface.

The platform eliminates context-switching overhead, breaks down data silos, and provides a holistic view of project activities, fostering more efficient and integrated team collaboration.

## ✨ Key Features

### 🎯 **Project Management**
- **Kanban Boards**: Full-featured boards with customizable lists and cards
- **Task Management**: Priority levels, due dates, member assignments, and labels
- **Subtasks & Checklists**: Break down complex tasks into manageable components
- **Archive System**: Archive and restore boards, lists, and cards

### 💬 **Real-time Communication**
- **Instant Messaging**: Real-time chat with typing indicators
- **Conversation Management**: Organized discussion threads
- **File Sharing**: Seamless attachment handling within conversations
- **Online Status Tracking**: See who's available in real-time

### 📅 **Meeting & Calendar Management**
- **Meeting Scheduling**: Schedule meetings with team members
- **Built-in Calendar**: Google Calendar-like interface for event management
- **Automated Notifications**: Email reminders and alerts
- **Meeting Management**: Detailed meeting information and coordination

### 👥 **Workspace Management**
- **Multiple Workspace Types**: Private, public, and collaborative workspaces
- **Role-based Access Control**: Owner, Admin, and Member roles
- **Team Invitations**: Email-based invitation system
- **Member Management**: Easy user onboarding and permissions

### 🔐 **Security & Authentication**
- **Multi-factor Authentication**: Email/password, Google OAuth, GitHub OAuth
- **JWT-based Sessions**: Secure and stateless authentication
- **Email Verification**: Account security through email verification
- **Password Management**: Secure password reset and recovery

### 📊 **Analytics & Dashboard**
- **Personal Dashboard**: High-priority tasks and calendar overview
- **Activity Feeds**: Recent project activities and updates
- **Productivity Statistics**: Time-based filtering and insights
- **Real-time Notifications**: Smart alerts for important updates

### 📎 **File Management**
- **Multi-format Support**: Images, documents, and various file types
- **Automatic Processing**: Image resizing and optimization
- **Organized Storage**: Structured file organization and retrieval
- **Secure Access**: Permission-based file access control

## 🛠 Tech Stack

### **Backend**
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with JWT
- **Real-time**: Socket.IO for WebSocket communication
- **Email**: Nodemailer with Gmail integration
- **Security**: Helmet, bcryptjs, rate limiting, XSS protection
- **File Processing**: Multer, Sharp for image optimization

### **Frontend**
- **Framework**: React 18 with Hooks
- **Build Tool**: Vite for fast development and optimized builds
- **State Management**: Redux Toolkit with RTK Query
- **Styling**: Tailwind CSS for utility-first styling
- **Animations**: Framer Motion for smooth transitions
- **Form Handling**: React Hook Form with Yup validation
- **Icons**: Lucide React, React Icons, Font Awesome
- **Date/Time**: Moment.js, date-fns, React DatePicker
- **Drag & Drop**: React Beautiful DnD for Kanban functionality

### **Development & DevOps**
- **Linting**: ESLint with React plugins
- **Package Management**: npm
- **Environment**: dotenv for configuration
- **Development**: Nodemon for backend, Vite HMR for frontend

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **MongoDB** (v5.0 or higher) - Local installation or MongoDB Atlas
- **Git** (for cloning the repository)

### Optional but Recommended:
- **MongoDB Compass** (for database visualization)
- **Postman** (for API testing)

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/nexus-community.git
cd nexus-community
```

### 2. Install Dependencies

#### Install Root Dependencies
```bash
npm install
```

#### Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

#### Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 3. Database Setup

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

#### Option B: MongoDB Atlas (Recommended)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Whitelist your IP address

## ⚙️ Environment Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
# Database Configuration
DATABASE=mongodb+srv://<username>:<password>@cluster.mongodb.net/nexus-community?retryWrites=true&w=majority
DATABASE_PASSWORD=your_database_password

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-characters
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90

# Server Configuration
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
BASE_FILE_URL=http://localhost:3000

# Session Configuration
SESSION_SECRET=your-session-secret-key

# Email Configuration (Gmail)
GMAIL_USERNAME=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/users/auth/google/callback

# GitHub OAuth (Optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/v1/users/auth/github/callback

# File Upload Configuration
DEFAULT_GROUP_PICTURE=/uploads/default-group.png
```

### 🔑 Getting OAuth Credentials

#### Google OAuth Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs: `http://localhost:3000/api/v1/users/auth/google/callback`

#### GitHub OAuth Setup:
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/v1/users/auth/github/callback`

#### Gmail App Password:
1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account settings
3. Generate an App Password for the application

## 🚀 Running the Application

### Development Mode

#### Method 1: Run Both Services Simultaneously (Recommended)
```bash
# From the root directory
npm run dev
```

#### Method 2: Run Services Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# Backend will run on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend will run on http://localhost:5173
```

### Production Mode

#### Build Frontend:
```bash
cd frontend
npm run build
```

#### Start Backend in Production:
```bash
cd backend
npm run start:prod
```

### 🌐 Access the Application

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **API Documentation**: [http://localhost:3000/api/v1/docs](http://localhost:3000/api/v1/docs)

## 📁 Project Structure

```
nexus-community/
├── 📁 backend/                 # Backend API server
│   ├── 📁 config/             # Configuration files
│   ├── 📁 controllers/        # Route controllers
│   ├── 📁 middlewares/        # Custom middleware
│   ├── 📁 models/            # Database models
│   ├── 📁 routes/            # API routes
│   ├── 📁 utils/             # Utility functions
│   ├── 📁 uploads/           # File upload storage
│   ├── 📄 app.js             # Express app configuration
│   ├── 📄 server.js          # Server entry point
│   ├── 📄 socketServer.js    # Socket.IO configuration
│   └── 📄 package.json       # Backend dependencies
│
├── 📁 frontend/               # React frontend application
│   ├── 📁 src/
│   │   ├── 📁 Auth/          # Authentication components
│   │   ├── 📁 Board/         # Kanban board components
│   │   ├── 📁 Calendar/      # Calendar components
│   │   ├── 📁 Card/          # Task card components
│   │   ├── 📁 Chat/          # Chat components
│   │   ├── 📁 Components/    # Shared components
│   │   ├── 📁 features/      # Redux slices and store
│   │   ├── 📁 Main/          # Main page components
│   │   ├── 📁 Workspace/     # Workspace components
│   │   ├── 📁 utils/         # Frontend utilities
│   │   ├── 📄 App.jsx        # Main app component
│   │   └── 📄 main.jsx       # React entry point
│   ├── 📄 index.html         # HTML template
│   ├── 📄 vite.config.js     # Vite configuration
│   └── 📄 package.json       # Frontend dependencies
│
├── 📁 CV Template/           # Team CV templates
├── 📄 Nexus Documentation.md # Project documentation
├── 📄 package.json          # Root package configuration
└── 📄 README.md             # This file
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/v1/users/signup` - User registration
- `POST /api/v1/users/login` - User login
- `GET /api/v1/users/auth/google` - Google OAuth
- `GET /api/v1/users/auth/github` - GitHub OAuth
- `POST /api/v1/users/forgotPassword` - Password reset request
- `PATCH /api/v1/users/resetPassword/:token` - Reset password

### Workspace Management
- `GET /api/v1/workspaces` - Get user workspaces
- `POST /api/v1/workspaces` - Create new workspace
- `PATCH /api/v1/workspaces/:id` - Update workspace
- `DELETE /api/v1/workspaces/:id` - Delete workspace
- `POST /api/v1/workspaces/:id/invite` - Invite members

### Board & Task Management
- `GET /api/v1/boards` - Get all boards
- `POST /api/v1/boards` - Create new board
- `GET /api/v1/boards/:id` - Get board details
- `PATCH /api/v1/boards/:id` - Update board
- `DELETE /api/v1/boards/:id` - Delete board

### Real-time Events (Socket.IO)
- `join-workspace` - Join workspace room
- `message-sent` - Send chat message
- `typing-start/stop` - Typing indicators
- `board-updated` - Board changes
- `card-moved` - Card position changes

For complete API documentation, visit the development server at `/api/v1/docs`.

## 🤝 Contributing

We welcome contributions to Nexus Community! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Commit your changes**
   ```bash
   git commit -m "Add: your feature description"
   ```
5. **Push to your branch**
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request**

### Development Guidelines
- Follow the existing code style and structure
- Write clear, descriptive commit messages
- Test your changes thoroughly
- Update documentation when necessary
- Follow React and Node.js best practices

## 👥 Team

**Menoufia University - Faculty of Computer Science & Information**
**Department of Computer Science - Graduation Project 2024/2025**

### Development Team
- **Amena Mahmoud El-Sheikh**
- **Rana Mohamed Abd-Elhalim**
- **Salma Yasser Ahmed Moselhi**
- **Fatma Emad Ghozia**
- **Adham Khaled Fares**
- **Youssef Mohamed Mahmoud**

### Academic Supervision
- **Supervisor**: Dr. Nesma Mahmoud
- **Head of Department**: Dr. Gamal Farouk
- **Dean**: Dr. Hatem Abd-Elkader

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Troubleshooting

### Common Issues

**1. MongoDB Connection Error**
- Ensure MongoDB is running locally or check your Atlas connection string
- Verify your IP is whitelisted in MongoDB Atlas
- Check your database credentials

**2. OAuth Authentication Issues**
- Verify your OAuth credentials are correctly set in `.env`
- Ensure callback URLs match your OAuth app settings
- Check that your OAuth apps are not in development mode restrictions

**3. Port Already in Use**
- Change the port in your `.env` file
- Kill the process using the port: `lsof -ti:3000 | xargs kill -9` (macOS/Linux)

**4. Email Service Not Working**
- Ensure you're using an App Password for Gmail, not your regular password
- Check that 2FA is enabled on your Google account
- Verify your Gmail username and app password in `.env`

### Getting Help
- Check the [issues page](https://github.com/your-username/nexus-community/issues) for known problems
- Create a new issue with a detailed description of your problem
- Include error messages, environment details, and steps to reproduce

---

<div align="center">
  <p>Built with ❤️ by the Nexus Community Team</p>
  <p>© 2024 Menoufia University - Department of Computer Science</p>
</div> 