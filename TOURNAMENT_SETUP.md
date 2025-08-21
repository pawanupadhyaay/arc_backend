# Tournament System Setup Guide

## 🏆 Tournament Data Storage

**Tournament data is saved in MongoDB** in the `tournaments` collection. You don't need to manually add data to MongoDB - the system handles everything automatically through the API.

## 🚀 How to Setup Tournaments

### 1. Backend Setup
The tournament system is already integrated into your backend:

- ✅ **Tournament Model**: `backend/models/Tournament.js`
- ✅ **Tournament Controller**: `backend/controllers/tournamentController.js`
- ✅ **Tournament Routes**: `backend/routes/tournaments.js`
- ✅ **Server Integration**: Routes are already added to `server.js`

### 2. Frontend Setup
The tournament interface is ready:

- ✅ **Tournaments Page**: `frontend/src/pages/Tournaments.tsx`
- ✅ **Create Tournament Modal**: `frontend/src/components/CreateTournamentModal.tsx`
- ✅ **Navigation**: Already integrated in navbar

### 3. Add Sample Data (Optional)
To add sample tournaments for testing:

```bash
cd backend
node seed-tournaments.js
```

This will create 4 sample tournaments with different games and formats.

## 🎮 Tournament Features

### Create Tournament
- **Modal Interface**: Click "Create Tournament" button to open overlay modal
- **Comprehensive Form**: All tournament details in organized sections
- **Validation**: Date validation, required fields, etc.
- **Real-time**: Tournament appears immediately after creation

### Tournament Management
- **Host Controls**: Only tournament host can edit/delete
- **Status Management**: Upcoming → Registration Open → Ongoing → Completed
- **Participant Management**: Join/leave functionality
- **Group Assignment**: Auto-assign participants to groups
- **Broadcasting**: Send messages to all participants

### Tournament Types Supported
- **Games**: BGMI, Valorant, Free Fire, Call of Duty Mobile
- **Formats**: Solo, Duo, Squad, Full Team
- **Tournament Types**: Single Elimination, Double Elimination, Round Robin, Swiss System

## 📊 Database Schema

Tournaments are stored with these key fields:
- Basic info (name, description, game, format)
- Schedule (start/end dates, registration deadline)
- Settings (prize pool, entry fee, team sizes)
- Participants (players and teams)
- Matches and results
- Groups and broadcast channels

## 🔧 API Endpoints

```
GET    /api/tournaments          # Get all tournaments
POST   /api/tournaments          # Create tournament
GET    /api/tournaments/:id      # Get single tournament
PUT    /api/tournaments/:id      # Update tournament
DELETE /api/tournaments/:id      # Delete tournament
POST   /api/tournaments/:id/join # Join tournament
POST   /api/tournaments/:id/leave # Leave tournament
```

## 🎯 Usage Instructions

1. **Start your backend server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start your frontend**:
   ```bash
   cd frontend
   npm start
   ```

3. **Create tournaments**:
   - Go to Tournaments page
   - Click "Create Tournament" button
   - Fill out the modal form
   - Submit to create tournament

4. **Manage tournaments**:
   - Hosts can edit/delete their tournaments
   - Users can join/leave tournaments
   - View tournament details and participants

## 🎨 UI Design

The tournament system follows your design preferences:
- **Minimal UI**: Clean, professional interface
- **Dark Theme**: Black background with subtle gradients
- **Moderate Buttons**: Not oversized, properly aligned
- **Overlay Modals**: Create tournament in modal instead of separate page

## 🔒 Security Features

- **Authentication Required**: All tournament operations require login
- **Host Authorization**: Only tournament hosts can modify their tournaments
- **Status Validation**: Cannot modify tournaments that have started
- **Date Validation**: Prevents invalid tournament schedules

---

**Your tournament system is ready to use! 🚀**

No manual MongoDB setup needed - everything works through the web interface.
