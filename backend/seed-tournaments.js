const mongoose = require('mongoose');
const Tournament = require('./models/Tournament');
const User = require('./models/User');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

const seedTournaments = async () => {
  try {
    // Find a user to be the host (or create one if needed)
    let host = await User.findOne();
    if (!host) {
      console.log('No users found. Please create a user first.');
      return;
    }

    // Sample tournament data
    const tournaments = [
      {
        name: 'BGMI Pro League Season 1',
        description: 'The ultimate BGMI tournament for professional players. Compete for glory and massive prize pool!',
        game: 'BGMI',
        mode: 'Battle Royale',
        format: 'Squad',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        location: 'Online',
        timezone: 'IST',
        prizePool: 50000,
        entryFee: 500,
        totalSlots: 32,
        teamsPerGroup: 4,
        numberOfGroups: 8,
        prizePoolType: 'with_prize',
        rules: 'No hacking, Fair play only, Respect other players, Follow tournament schedule',
        status: 'Registration Open',
        host: host._id
      },
      {
        name: 'Valorant Championship 2024',
        description: 'Join the most competitive Valorant tournament of the year!',
        game: 'Valorant',
        mode: '5v5',
        format: '5v5',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        registrationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        location: 'Online',
        timezone: 'UTC',
        prizePool: 75000,
        entryFee: 1000,
        totalSlots: 16,
        teamsPerGroup: 4,
        numberOfGroups: 4,
        prizePoolType: 'with_prize',
        rules: 'Standard Valorant rules, No smurfing, Team communication required',
        status: 'Upcoming',
        host: host._id
      },
      {
        name: 'Free Fire Battle Royale',
        description: 'Epic Free Fire tournament with exciting gameplay and rewards!',
        game: 'Free Fire',
        mode: 'Battle Royale',
        format: 'Squad',
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        registrationDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        location: 'Online',
        timezone: 'IST',
        prizePool: 25000,
        entryFee: 200,
        totalSlots: 64,
        teamsPerGroup: 4,
        numberOfGroups: 16,
        prizePoolType: 'with_prize',
        rules: 'Free Fire official rules, No teaming, Fair play',
        status: 'Registration Open',
        host: host._id
      },
      {
        name: 'COD Mobile Masters',
        description: 'Master the battlefield in this Call of Duty Mobile tournament!',
        game: 'Call of Duty Mobile',
        mode: 'Battle Royale',
        format: 'Duo',
        startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
        registrationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        location: 'Online',
        timezone: 'EST',
        prizePool: 40000,
        entryFee: 300,
        totalSlots: 48,
        teamsPerGroup: 4,
        numberOfGroups: 12,
        prizePoolType: 'with_prize',
        rules: 'COD Mobile rules, No camping, Active gameplay required',
        status: 'Upcoming',
        host: host._id
      },
      {
        name: 'Valorant Fun Night',
        description: 'A casual Valorant tournament just for fun! No pressure, just enjoy the game with friends.',
        game: 'Valorant',
        mode: '5v5',
        format: '5v5',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        registrationDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        location: 'Online',
        timezone: 'UTC',
        prizePool: 0,
        entryFee: 0,
        totalSlots: 16,
        teamsPerGroup: 4,
        numberOfGroups: 4,
        prizePoolType: 'without_prize',
        rules: 'Just have fun, be respectful, no toxicity',
        status: 'Registration Open',
        host: host._id
      }
    ];

    // Clear existing tournaments
    await Tournament.deleteMany({});
    console.log('Cleared existing tournaments');

    // Insert new tournaments
    const createdTournaments = await Tournament.insertMany(tournaments);
    console.log(`Created ${createdTournaments.length} tournaments`);

    console.log('Tournament seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding tournaments:', error);
    process.exit(1);
  }
};

// Run the seeding
connectDB().then(() => {
  seedTournaments();
});
