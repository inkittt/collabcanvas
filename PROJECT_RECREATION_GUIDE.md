# CollabCanvas - Complete Project Recreation Guide

## 🎯 Project Overview
**CollabCanvas** is a real-time collaborative image editing platform built with React.js and Supabase. It enables multiple users to work together on canvases with live updates, chat, and presence tracking.

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework**: React 18.2.0 with Create React App
- **UI Library**: Material-UI (@mui/material, @mui/icons-material)
- **Styling**: Emotion (@emotion/react, @emotion/styled)
- **Routing**: React Router DOM 6.11.1
- **Canvas Library**: Fabric.js 5.3.0 for drawing/editing
- **Drawing Effects**: RoughJS 4.6.6 for hand-drawn style

### Backend & Services
- **Database**: PostgreSQL or MongoDB
- **Authentication**: JWT-based auth or Auth0/Firebase Auth
- **Real-time**: WebSocket server (Socket.io or native WebSockets)
- **Storage**: AWS S3, Cloudinary, or local file storage
- **Backend Framework**: Node.js/Express, Python/FastAPI, or Go

## 📁 Project Structure

```
src/
├── auth/
│   └── AuthContext.js              # Authentication context provider
├── components/
│   ├── Auth/                       # Login, signup, password reset
│   │   ├── AuthForm.js
│   │   ├── Login.js
│   │   ├── SignUp.js
│   │   ├── ResetPassword.js
│   │   └── UpdatePassword.js
│   ├── Canvas/                     # Core canvas functionality
│   │   ├── CanvasDashboard.js      # Canvas management dashboard
│   │   ├── CanvasEditor.js         # Main canvas editor with Fabric.js
│   │   ├── CanvasPage.js           # Canvas page wrapper
│   │   ├── CanvasChat.js           # Canvas-specific chat
│   │   ├── CanvasCollaborators.js  # Collaborator management
│   │   ├── ImageEditor.js          # Image editing tools
│   │   └── filters.js              # Image filters
│   ├── Chat/                       # Chat components
│   │   ├── ChatPanel.js            # General chat panel
│   │   └── CommunityChat.js        # Global community chat
│   ├── Examples/
│   │   └── RealtimeDemo.js         # Real-time features demo
│   ├── Profile/                    # User profile management
│   │   ├── ProfileEditor.js
│   │   └── UserMenu.js
│   └── Introduction/
│       └── IntroductionPage.js     # Landing/intro page
├── lib/
│   ├── websocket.js                # WebSocket client configuration
│   ├── realtime.js                 # Real-time WebSocket helpers
│   ├── realtimeService.js          # Real-time service wrapper
│   └── apiClient.js                # HTTP API client
├── services/
│   ├── canvasService.js            # Canvas CRUD operations
│   ├── elementService.js           # Canvas element operations
│   └── profileService.js           # User profile operations
├── contexts/                       # Additional React contexts
├── theme/                          # Material-UI theme configuration
├── assets/                         # Images, logos, SVGs
└── migrations/                     # Database migration scripts
```

## 🗄️ Database Schema

### Core Tables
```sql
-- User profiles
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Canvas projects
canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Canvas collaborators with permissions
canvas_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID REFERENCES canvases(id),
  user_id UUID REFERENCES profiles(id),
  permission_level TEXT CHECK (permission_level IN ('viewer', 'editor')),
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Canvas elements (shapes, text, images)
elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID REFERENCES canvases(id),
  user_id UUID REFERENCES profiles(id),
  element_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Community chat messages
community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

## 🔧 Key Dependencies

### Frontend Dependencies
```json
{
  "dependencies": {
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "@mui/icons-material": "^5.11.16",
    "@mui/material": "^5.13.0",
    "socket.io-client": "^4.7.2",
    "fabric": "^5.3.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.11.1",
    "react-scripts": "5.0.1",
    "roughjs": "^4.6.6",
    "axios": "^1.4.0"
  }
}
```

### Backend Dependencies (Node.js/Express)
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.1",
    "bcryptjs": "^2.4.3",
    "mongoose": "^7.3.0",
    "multer": "^1.4.5",
    "dotenv": "^16.1.4"
  }
}
```

## 🚀 Setup Instructions

### 1. Frontend Setup
```bash
npx create-react-app collabcanvas
cd collabcanvas
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install socket.io-client fabric roughjs react-router-dom axios
```

### 2. Backend Setup
```bash
mkdir collabcanvas-server
cd collabcanvas-server
npm init -y
npm install express socket.io cors jsonwebtoken bcryptjs mongoose multer dotenv
```

### 3. Database Configuration
- Set up MongoDB Atlas or local MongoDB
- Configure connection string
- Set up user authentication schema
- Create canvas and element collections

### 4. Environment Variables

**Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=http://localhost:5000
```

**Backend (.env)**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:3000
```

## 🔑 Core Features Implementation

### Real-time Collaboration
- **Canvas Sync**: Live updates using Supabase Realtime
- **Presence Tracking**: Show active users on canvas
- **Cursor Tracking**: Display other users' cursor positions
- **Element Updates**: Real-time element creation/modification

### Canvas Editor
- **Fabric.js Integration**: Advanced canvas manipulation
- **Drawing Tools**: Pen, shapes, text, images
- **Filters**: Image processing with custom filters
- **History**: Undo/redo functionality

### Authentication & Authorization
- **Multi-auth**: Email/password + OAuth providers
- **Role-based Access**: Owner, editor, viewer permissions
- **Profile Management**: User profiles with avatars

### Chat System
- **Global Chat**: Community-wide messaging
- **Canvas Chat**: Project-specific communication
- **Real-time Messages**: Live chat updates

## 📋 Key Files to Recreate

### 1. Supabase Client (`src/lib/supabase.js`)
- Client configuration with retry logic
- Connection testing and fallbacks
- Environment variable handling

### 2. Real-time Service (`src/lib/realtime.js`)
- Canvas subscription management
- Presence tracking implementation
- Event handling for live updates

### 3. Canvas Editor (`src/components/Canvas/CanvasEditor.js`)
- Fabric.js canvas initialization
- Drawing tools implementation
- Real-time element synchronization

### 4. Authentication Context (`src/auth/AuthContext.js`)
- User session management
- Authentication state handling
- Protected route logic

### 5. Services Layer
- **CanvasService**: CRUD operations for canvases
- **ElementService**: Canvas element management
- **ProfileService**: User profile operations

## 🎨 UI/UX Features
- **Material-UI Theme**: Consistent design system
- **Responsive Design**: Mobile-friendly interface
- **Dark/Light Mode**: Theme switching capability
- **Loading States**: Proper loading indicators
- **Error Handling**: User-friendly error messages

## 🔒 Security Considerations
- **Row Level Security (RLS)**: Database-level permissions
- **Input Validation**: Client and server-side validation
- **CORS Configuration**: Proper cross-origin setup
- **Rate Limiting**: API call throttling

## 📱 Additional Features
- **Image Upload**: Drag-and-drop image support
- **Export Options**: Save canvas as image/PDF
- **Collaboration Invites**: Share canvas with others
- **Version History**: Track canvas changes over time

## 🐛 Common Issues & Solutions
1. **Network Timeouts**: Implement retry logic in Supabase client
2. **RLS Policy Conflicts**: Careful policy design to avoid recursion
3. **Real-time Connection**: Proper subscription cleanup
4. **Canvas Performance**: Optimize Fabric.js rendering

## 📚 Documentation References
- [Supabase Documentation](https://supabase.com/docs)
- [Fabric.js Documentation](http://fabricjs.com/docs/)
- [Material-UI Documentation](https://mui.com/)
- [React Router Documentation](https://reactrouter.com/)

---

**Note**: This guide provides the complete blueprint for recreating the CollabCanvas project. Use this as a reference when asking AI assistants to help build specific components or features.
