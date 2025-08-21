# GameConnect Frontend

A modern React frontend for the GameConnect gaming social media platform.

## Features

- **Authentication**: Login and registration with role-based access (Player/Team)
- **Dashboard**: Feed of posts with filtering by type
- **Posts**: Create, like, comment, and share posts with media upload
- **Profiles**: View user/team profiles with follow functionality
- **Search**: Search for players and teams
- **Messaging**: Real-time direct messaging
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **React 18** with TypeScript
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Axios** for API calls
- **Socket.IO** for real-time features
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend server running on `http://localhost:5000`

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm start
   ```

3. **Open your browser** and navigate to `http://localhost:3000`

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Navbar.tsx      # Navigation bar
│   └── PostCard.tsx    # Post display component
├── contexts/           # React contexts
│   ├── AuthContext.tsx # Authentication state
│   └── SocketContext.tsx # Socket.IO connection
├── pages/              # Page components
│   ├── Login.tsx       # Login page
│   ├── Register.tsx    # Registration page
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Profile.tsx     # User profile page
│   ├── Search.tsx      # Search functionality
│   ├── Messages.tsx    # Messaging system
│   └── CreatePost.tsx  # Post creation
├── App.tsx             # Main app component
└── index.css           # Global styles with Tailwind
```

## Features Overview

### Authentication
- Clean login and registration forms
- Role selection (Player/Team)
- JWT token management
- Protected routes

### Dashboard
- Post feed with filtering
- Sidebar with user stats
- Trending topics
- Create post button

### Posts
- Rich text content
- Media upload (images/videos)
- Post types: General, Recruitment, Achievement, Looking for Team
- Like and comment functionality
- Real-time updates

### Profiles
- User/team information display
- Follow/unfollow functionality
- Post history
- Stats (followers, following, posts)

### Search
- Real-time search with debouncing
- Filter by role (Player/Team)
- User cards with quick actions

### Messaging
- Real-time chat using Socket.IO
- Chat list with unread indicators
- Message history
- Typing indicators (coming soon)

## API Integration

The frontend communicates with the backend API at `http://localhost:5000/api`. Make sure your backend is running and properly configured.

## Styling

The app uses Tailwind CSS for styling with custom components:
- `.btn-primary` - Primary button style
- `.btn-secondary` - Secondary button style
- `.card` - Card container style
- `.input-field` - Input field style

## Responsive Design

The app is fully responsive and works on:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

## Future Enhancements

- Group chat functionality
- Notifications system
- Tournament features
- Advanced search filters
- Dark mode
- Mobile app (React Native)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the GameConnect platform.
