# Nexus Community - Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Data Models](#data-models)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Security](#authentication--security)
7. [Real-time Features](#real-time-features)
8. [File Management](#file-management)
9. [Workflow & Business Logic](#workflow--business-logic)
10. [Technical Stack](#technical-stack)
11. [Frontend Implementation](#frontend-implementation)
12. [Development Setup](#development-setup)

## Project Overview

**Nexus Community** is a comprehensive project management and collaboration platform that combines the functionality of Trello, Slack, and Google Calendar into a unified workspace. The platform enables teams to manage projects, communicate in real-time, schedule meetings, and track progress through an intuitive interface.

### Key Goals

- **Unified Collaboration**: Provide a single platform for project management, communication, and scheduling
- **Real-time Collaboration**: Enable live updates and communication across team members
- **Flexible Workspace Management**: Support different workspace types (private, public, collaboration)
- **Comprehensive Task Management**: Full Kanban board functionality with cards, lists, and subtasks
- **Advanced Communication**: Real-time chat, video calls, and meeting scheduling
- **Smart Notifications**: Context-aware notifications for deadlines, updates, and activities

## Architecture

### Backend Architecture

The backend follows a **Model-View-Controller (MVC)** pattern with additional service layers:

```
Backend/
├── models/          # Data models and schemas
├── controllers/     # Business logic and request handling
├── routes/          # API route definitions
├── utils/           # Utility services and helpers
├── config/          # Configuration files
├── Middlewares/     # Custom middleware functions
├── Uploads/         # File storage
└── public/          # Static files
```

### Frontend Architecture

The frontend follows a **Component-Based Architecture** with Redux state management:

```
Frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── features/        # Redux slices and store
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── assets/          # Static assets
│   ├── styles/          # CSS and styling
│   └── types/           # TypeScript type definitions
├── public/              # Public assets
└── dist/                # Build output
```

### Key Architectural Patterns

- **Service-Oriented Architecture**: Separate services for permissions, notifications, activities, and invitations
- **Middleware Pattern**: Authentication, authorization, and validation middleware
- **Event-Driven Architecture**: Real-time updates using Socket.IO
- **Repository Pattern**: Centralized data access through models
- **Component-Based Architecture**: Modular, reusable React components
- **State Management**: Redux Toolkit for global state management
- **Container/Presentational Pattern**: Separation of logic and presentation

## Core Features

### 1. User Management & Authentication

- **Multi-Provider Authentication**: Email/password, Google OAuth, GitHub OAuth
- **Email Verification**: Secure email verification with token-based validation
- **Password Management**: Forgot password, reset password with verification codes
- **User Profiles**: Avatar upload, profile management, status tracking
- **Session Management**: JWT-based authentication with secure cookies

### 2. Workspace Management

- **Three Workspace Types**:
  - **Private**: Personal workspace for individual boards
  - **Public**: Team workspace for collaboration
  - **Collaboration**: Access to shared boards from other workspaces
- **Role-Based Access Control**: Owner, Admin, Member roles with granular permissions
- **Member Management**: Invite, remove, and manage member roles
- **Invitation System**: Email-based invitations with role assignment

### 3. Board Management (Kanban)

- **Board Creation**: Create boards within workspaces with customizable settings
- **List Management**: Create, edit, and organize lists within boards
- **Card Management**: Full CRUD operations for task cards
- **Card Features**:
  - Priority levels (none, low, medium, high)
  - Due dates with reminders
  - Member assignments
  - Labels and colors
  - Subtasks with individual assignments
  - Comments and attachments
  - State tracking (active, completed, overdue)
- **Board Settings**: Configurable permissions for card editing, moving, and member management
- **Archive System**: Archive and restore boards, lists, and cards

### 4. Real-time Communication

- **Chat System**: Real-time messaging between users
- **Conversation Management**: Create and manage chat conversations
- **Message Features**: Send, delete, and manage messages
- **Typing Indicators**: Real-time typing status
- **Online Status**: Track user online/offline status
- **Video Calls**: WebRTC-based video calling functionality

### 5. Meeting Management

- **Meeting Scheduling**: Create and schedule meetings with team members
- **Calendar Integration**: Google Calendar integration for meeting scheduling
- **Meeting Notifications**: Email notifications for meeting reminders
- **Meeting Details**: Title, description, date/time, attendees, and location

### 6. Dashboard & Analytics

- **High Priority Tasks**: View and manage high-priority tasks across all boards
- **Calendar Deadlines**: Calendar view of upcoming task deadlines
- **Activity Feed**: Real-time activity tracking across workspaces and boards
- **Statistics**: Task completion rates, productivity metrics
- **Time-based Filtering**: Filter activities by day, week, month, or year

### 7. File Management

- **Attachment System**: Upload and manage files on cards
- **File Types**: Support for various file types (images, documents, etc.)
- **Image Processing**: Automatic image resizing and optimization
- **File Organization**: Organized storage in user-specific and group-specific folders

### 8. Notification System

- **Real-time Notifications**: Instant notifications for board activities
- **Email Notifications**: Email alerts for important events
- **Notification Types**: Task assignments, due dates, mentions, comments
- **Notification Preferences**: User-configurable notification settings

## Data Models

### User Model

```javascript
{
  firstName,
    lastName,
    username,
    email,
    password,
    googleId,
    avatar,
    status,
    preferences,
    emailVerified,
    verificationTokens,
    createdAt,
    updatedAt;
}
```

### Workspace Model

```javascript
{
  name, description, type, createdBy,
  members: [{ user, role, permissions, joinedAt }],
  settings: { inviteRestriction, boardCreation, notificationsEnabled },
  invitations: [{ email, role, invitedBy, token, status }],
  activities: [{ user, action, data, createdAt }]
}
```

### Board Model

```javascript
{
  name, description, workspace, createdBy,
  members: [{ user, role, permissions, joinedAt }],
  settings: { general, notifications },
  archivedByUsers, starredByUsers,
  invitations: [{ email, role, invitedBy, token, status }],
  activities: [{ user, action, data, createdAt }]
}
```

### Card Model

```javascript
{
  title, description, position, priority, cover,
  dueDate: { startDate, endDate, reminder, notifiedDueSoon },
  state: { current, completedAt, completedBy, overdueAt },
  members: [{ user, assignedBy, assignedAt }],
  labels: [{ name, color }],
  subtasks: [{ title, isCompleted, position, assignedTo, dueDate }],
  createdBy, list, lastActivity, archived
}
```

### List Model

```javascript
{
  name, position, board, createdBy, cardLimit, archived, archivedAt, archivedBy;
}
```

### Conversation & Message Models

```javascript
// Conversation
{
  participants: [{ user, role }],
  type, name, lastMessage, unreadCount
}

// Message
{
  conversation, sender, content, attachments,
  readBy: [{ user, readAt }], deleted, deletedAt, deletedBy
}
```

## API Endpoints

### Authentication Routes (`/api/v1/users`)

- `POST /signup` - User registration
- `POST /login` - User login
- `POST /forgotPassword` - Password reset request
- `POST /verifyResetCode` - Verify reset code
- `PATCH /resetPassword` - Reset password
- `GET /auth/google` - Google OAuth
- `GET /auth/github` - GitHub OAuth
- `GET /verifyEmail/:token` - Email verification
- `GET /logout` - User logout

### User Management Routes

- `GET /me` - Get current user profile
- `PATCH /updateMe` - Update user profile
- `DELETE /deleteMe` - Delete user account
- `PATCH /updateMyPassword` - Update password
- `GET /search` - Search users
- `GET /workspace-users` - Get workspace users

### Workspace Routes (`/api/v1/workspaces`)

- `GET /user-workspaces` - Get user's workspaces
- `GET /public-member` - Get public and member workspaces
- `POST /:workspaceId` - Create workspace
- `GET /:workspaceId` - Get workspace details
- `PATCH /:workspaceId` - Update workspace
- `GET /:workspaceId/members` - Get workspace members
- `POST /:workspaceId/invite` - Invite members
- `DELETE /:workspaceId/members/:userId` - Remove member

### Board Routes (`/api/v1/boards`)

- `POST /` - Create board
- `GET /:id` - Get board details
- `PATCH /user-boards/:id` - Update board
- `DELETE /user-boards/:id` - Delete board
- `PATCH /user-boards/:id/archive` - Archive board
- `PATCH /user-boards/:id/restore` - Restore board
- `PATCH /user-boards/:id/star` - Star board
- `PATCH /user-boards/:id/unstar` - Unstar board
- `GET /user-boards/archived` - Get archived boards
- `GET /user-boards/starred` - Get starred boards

### Card Routes (`/api/v1/cards`)

- `POST /` - Create card
- `GET /:id` - Get card details
- `PATCH /:id` - Update card
- `DELETE /:id` - Delete card
- `PATCH /:id/move` - Move card
- `PATCH /:id/archive` - Archive card
- `PATCH /:id/restore` - Restore card
- `POST /:id/members` - Assign members
- `DELETE /:id/members/:userId` - Remove member assignment

### List Routes (`/api/v1/lists`)

- `POST /` - Create list
- `GET /:id` - Get list details
- `PATCH /:id` - Update list
- `DELETE /:id` - Delete list
- `PATCH /:id/archive` - Archive list
- `PATCH /:id/restore` - Restore list

### Conversation Routes (`/api/v1/conversations`)

- `GET /` - Get user conversations
- `POST /` - Create conversation
- `GET /:id` - Get conversation details
- `PATCH /:id` - Update conversation
- `DELETE /:id` - Delete conversation

### Message Routes (`/api/v1/message`)

- `POST /` - Send message
- `GET /:conversationId` - Get conversation messages
- `DELETE /:id` - Delete message

### Meeting Routes (`/api/v1/meetings`)

- `POST /` - Create meeting
- `GET /` - Get user meetings
- `GET /:id` - Get meeting details
- `PATCH /:id` - Update meeting
- `DELETE /:id` - Delete meeting

### Attachment Routes (`/api/v1/attachments`)

- `POST /` - Upload attachment
- `GET /:id` - Get attachment
- `DELETE /:id` - Delete attachment

### Dashboard Routes (`/api/v1/dashboard`)

- `GET /high-priority-tasks` - Get high priority tasks
- `GET /calendar-deadlines` - Get calendar deadlines
- `GET /recent-activities` - Get recent activities
- `GET /statistics` - Get productivity statistics

## Authentication & Security

### Authentication Methods

1. **Email/Password Authentication**

   - Secure password hashing with bcrypt
   - JWT token-based sessions
   - Email verification required

2. **OAuth Authentication**

   - Google OAuth 2.0 integration
   - GitHub OAuth integration
   - Automatic account linking

3. **Session Management**
   - HTTP-only cookies for JWT storage
   - Configurable session expiration
   - Secure cookie settings

### Security Features

- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation and sanitization
- **XSS Protection**: XSS prevention middleware
- **CSRF Protection**: CSRF token validation
- **SQL Injection Prevention**: MongoDB sanitization
- **File Upload Security**: Secure file upload with validation
- **Password Security**: Strong password requirements and secure reset process

### Permission System

The application implements a sophisticated role-based access control (RBAC) system:

#### Workspace Permissions

- **Owner**: Full control over workspace
- **Admin**: Manage members and boards (with restrictions)
- **Member**: Basic access based on settings

#### Board Permissions

- **Owner**: Full control over board
- **Admin**: Manage board and members (with restrictions)
- **Member**: Access based on board settings

#### Granular Permissions

- `manage_workspace` - Modify workspace settings
- `manage_members` - Add/remove members
- `create_boards` - Create new boards
- `invite_members` - Send invitations
- `view_board` - View board content
- `edit_cards` - Edit cards
- `move_cards` - Move cards between lists
- `delete_cards` - Delete cards

## Real-time Features

### Socket.IO Implementation

The application uses Socket.IO for real-time communication:

#### Connection Management

- User online/offline status tracking
- Automatic status updates
- Connection state management

#### Real-time Events

- **Chat Events**: Message sending, typing indicators, message deletion
- **Board Events**: Card updates, list changes, member activities
- **Notification Events**: Real-time notifications for board activities
- **Call Events**: Video call signaling and management

#### Room Management

- **Board Rooms**: Users join board-specific rooms for notifications
- **Workspace Rooms**: Workspace-level activity notifications
- **User Rooms**: User-specific notifications across devices

### Real-time Features

1. **Live Chat**: Real-time messaging with typing indicators
2. **Board Updates**: Live updates for card movements and changes
3. **Notifications**: Instant notifications for important events
4. **Online Status**: Real-time user online/offline status
5. **Video Calls**: WebRTC-based video calling
6. **Activity Feed**: Live activity updates across workspaces

## File Management

### File Upload System

- **Multer Integration**: Secure file upload handling
- **File Validation**: Type and size validation
- **Image Processing**: Automatic image resizing with Sharp
- **Storage Organization**: Organized file storage structure

### File Types Supported

- **Images**: JPEG, PNG, GIF with automatic optimization
- **Documents**: PDF, DOC, DOCX, XLS, XLSX
- **Other Files**: Various file types with size limits

### Storage Structure

```
Uploads/
├── attachments/     # Card attachments
├── users/          # User avatars
└── group/          # Group/workspace images
```

### Security Features

- **File Type Validation**: Whitelist of allowed file types
- **Size Limits**: Configurable file size limits
- **Virus Scanning**: File scanning for malicious content
- **Access Control**: File access based on user permissions

## Workflow & Business Logic

### User Registration Flow

1. User submits registration form
2. Email verification token generated
3. Verification email sent
4. User clicks verification link
5. Account activated and default workspaces created
6. User redirected to login

### Workspace Creation Flow

1. User creates workspace with type and settings
2. User automatically assigned as owner
3. Default permissions applied based on role
4. Workspace activities logged
5. Notification sent to workspace members

### Board Management Flow

1. User creates board within workspace
2. Board inherits workspace permissions
3. Default lists created (To Do, In Progress, Done)
4. Board members can be invited
5. Activities tracked and logged

### Card Workflow

1. Card created in specific list
2. Members can be assigned to card
3. Due dates and priorities set
4. Subtasks can be added
5. Progress tracked through completion
6. Notifications sent for deadlines

### Meeting Scheduling Flow

1. User creates meeting with details
2. Attendees invited via email
3. Google Calendar integration (optional)
4. Reminder notifications sent
5. Meeting details accessible to attendees

### Notification System

1. **Event Detection**: System monitors various events
2. **Permission Check**: Verify user has permission to receive notification
3. **Notification Creation**: Generate appropriate notification
4. **Delivery**: Send via email and/or real-time notification
5. **Tracking**: Track notification read status

## Technical Stack

### Backend Technologies

- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB ODM
- **Socket.IO**: Real-time communication
- **JWT**: Authentication tokens
- **Passport.js**: Authentication middleware
- **Multer**: File upload handling
- **Sharp**: Image processing
- **Nodemailer**: Email sending
- **Node-cron**: Scheduled tasks

### Frontend Technologies

- **React 18**: UI library with hooks and concurrent features
- **Vite**: Fast build tool and development server
- **Redux Toolkit**: State management with RTK Query
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **Socket.IO Client**: Real-time communication
- **Axios**: HTTP client for API calls
- **React Hook Form**: Form handling and validation
- **Yup**: Schema validation
- **React Beautiful DnD**: Drag and drop functionality
- **React Big Calendar**: Calendar component
- **ApexCharts**: Data visualization
- **React Hot Toast**: Toast notifications
- **Lucide React**: Icon library

### Security & Performance

- **Helmet**: Security headers
- **Rate Limiting**: API protection
- **Compression**: Response compression
- **CORS**: Cross-origin resource sharing
- **Mongo Sanitize**: SQL injection prevention
- **XSS Clean**: XSS protection

### Development Tools

- **Nodemon**: Development server with auto-restart
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Morgan**: HTTP request logging

## Frontend Implementation

### Component Architecture

#### Core Components

- **App.jsx**: Main application component with routing and layout
- **Sidebar.jsx**: Navigation sidebar with workspace and board management
- **Header.jsx**: Top navigation bar with user profile and notifications
- **Breadcrumb.jsx**: Navigation breadcrumbs for better UX

#### Feature Components

**Authentication Components:**

- `Login.jsx` - User login form with OAuth integration
- `Signup.jsx` - User registration with email verification
- `ForgetPassword.jsx` - Password reset functionality
- `ResetPassword.jsx` - Password reset confirmation

**Board Management Components:**

- `Board.jsx` - Main board view with Kanban layout
- `Column.jsx` - Individual list/column component
- `TaskCard.jsx` - Card component with drag-and-drop
- `AddList.jsx` - Create new list functionality
- `ProjectInfo.jsx` - Board settings and information

**Chat Components:**

- `ChatLayout.jsx` - Main chat interface
- `ChatList.jsx` - Conversation list sidebar
- `ChatMessages.jsx` - Message display area
- `ChatInput.jsx` - Message input with emoji picker
- `MessageBubble.jsx` - Individual message component

**Workspace Components:**

- `WorkspacePopup.jsx` - Workspace selection modal
- `InviteMembersPopup.jsx` - Member invitation interface
- `MembersModal.jsx` - Member management modal

**Dashboard Components:**

- `Dashboard.jsx` - Main dashboard with analytics
- `Calendar.jsx` - Calendar view for deadlines
- `Notifications.jsx` - Notification center

### State Management

#### Redux Store Structure

```javascript
{
  auth: {
    user: User | null,
    isAuthenticated: boolean,
    loading: boolean
  },
  user: {
    profile: UserProfile,
    workspaces: Workspace[]
  },
  sidebar: {
    isOpen: boolean,
    selectedWorkspace: Workspace | null,
    workspaceTransitionState: string
  },
  chat: {
    conversations: Conversation[],
    activeConversation: Conversation | null,
    messages: Message[]
  },
  userWorkspaces: {
    workspaces: Workspace[],
    loading: boolean
  },
  boards: {
    boards: Board[],
    currentBoard: Board | null,
    loading: boolean
  },
  cardDetails: {
    selectedCard: Card | null,
    isOpen: boolean
  },
  dashboard: {
    highPriorityTasks: Task[],
    calendarDeadlines: Task[],
    statistics: DashboardStats
  }
}
```

#### Redux Slices

- **authSlice**: Authentication state management
- **userSlice**: User profile and data management
- **sidebarSlice**: Sidebar navigation state
- **chatSlice**: Real-time chat functionality
- **workspaceSlice**: Workspace management
- **boardsSlice**: Board operations and state
- **cardDetailsSlice**: Card detail modal state
- **dashboardSlice**: Dashboard data and analytics

### Routing Structure

#### Route Configuration

```javascript
/                           # Landing page
/login                      # User login
/signup                     # User registration
/forgetpassword            # Password reset
/resetpassword             # Password reset confirmation
/verification              # Email verification
/verification-success      # Verification success page
/verification-failed       # Verification failed page
/main/*                    # Protected routes
  ├── dashboard            # Dashboard
  ├── notifications        # Notifications
  ├── chat                 # Chat interface
  ├── workspaces/:id/boards/:boardId  # Board view
  └── workspaces/:id/settings          # Workspace settings
```

### Real-time Features

#### Socket.IO Integration

- **Connection Management**: Automatic reconnection and status tracking
- **Event Handling**: Real-time updates for chat, board changes, and notifications
- **Room Management**: Dynamic room joining for workspace and board-specific updates

#### Real-time Components

- **Live Chat**: Real-time messaging with typing indicators
- **Board Updates**: Live card movements and changes
- **Notifications**: Instant notification delivery
- **Online Status**: Real-time user presence indicators

### UI/UX Design

#### Design System

- **Color Palette**: Purple (#4d2d61), Orange (#ff6b35), and complementary colors
- **Typography**: Inter for headings, system fonts for body text
- **Spacing**: Consistent spacing using Tailwind's spacing scale
- **Components**: Reusable component library with consistent styling

#### Responsive Design

- **Mobile-First**: Responsive design starting from mobile breakpoints
- **Breakpoints**: Tailwind CSS breakpoints (sm, md, lg, xl, 2xl)
- **Touch-Friendly**: Optimized for touch interactions on mobile devices

#### Animations

- **Framer Motion**: Smooth page transitions and component animations
- **Micro-interactions**: Hover effects, loading states, and feedback animations
- **Drag and Drop**: Smooth drag-and-drop animations for cards and lists

### Performance Optimization

#### Code Splitting

- **Route-based Splitting**: Lazy loading of route components
- **Component Splitting**: Dynamic imports for heavy components
- **Bundle Optimization**: Tree shaking and dead code elimination

#### Caching Strategies

- **Redux Persist**: Local storage for user preferences
- **API Caching**: RTK Query for intelligent API caching
- **Image Optimization**: Lazy loading and optimization for images

#### Performance Monitoring

- **Bundle Analysis**: Regular bundle size monitoring
- **Performance Metrics**: Core Web Vitals tracking
- **Error Tracking**: Comprehensive error monitoring and reporting

### Development Workflow

#### Build Process

- **Vite**: Fast development server and optimized builds
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **TypeScript**: Type safety (if implemented)

#### Testing Strategy

- **Unit Testing**: Component and utility function testing
- **Integration Testing**: Redux store and API integration testing
- **E2E Testing**: End-to-end user flow testing

#### Deployment

- **Build Optimization**: Production-ready builds with optimization
- **CDN Integration**: Static asset delivery through CDN
- **Environment Configuration**: Environment-specific configurations

### Accessibility Features

#### WCAG Compliance

- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Color Contrast**: High contrast ratios for readability
- **Focus Management**: Proper focus indicators and management

#### Inclusive Design

- **Responsive Design**: Works across all device sizes
- **Touch Targets**: Adequate touch target sizes for mobile
- **Loading States**: Clear loading indicators and states
- **Error Handling**: User-friendly error messages and recovery

## Development Setup

### Prerequisites

- Node.js (v18+)
- MongoDB
- Git

### Environment Variables

```env
# Database
DATABASE=mongodb://localhost:27017/Nexus
DATABASE_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90

# Email
EMAIL_FROM=noreply@Nexus.com
EMAIL_PASSWORD=your_email_password

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Application
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
BASE_URL=http://localhost:3001
SESSION_SECRET=your_session_secret
```

### Installation Steps

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start MongoDB service
5. Run the application: `npm start`

### API Documentation

The API documentation is available at `/api/v1/docs` when the server is running.

## Conclusion

Nexus Community is a comprehensive project management platform that successfully combines multiple collaboration tools into a unified experience. The architecture is scalable, secure, and follows modern development practices. The real-time features, robust permission system, and comprehensive API make it suitable for teams of all sizes.

The platform's modular design allows for easy extension and maintenance, while the extensive feature set provides everything needed for effective team collaboration and project management. The frontend implementation provides a modern, responsive, and accessible user interface that enhances the overall user experience.
