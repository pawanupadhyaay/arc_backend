const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_PLAYER_ID = 'your-test-player-id'; // Replace with actual test player ID
const TEST_TEAM_ID = 'your-test-team-id'; // Replace with actual test team ID
const TEST_GAME = 'BGMI'; // Replace with actual game

async function testLeaveTeam() {
  try {
    console.log('Testing leave team functionality...');
    
    // First, get the player's current team status
    console.log('\n1. Getting player profile before leaving team...');
    const playerResponse = await axios.get(`${BASE_URL}/users/${TEST_PLAYER_ID}`);
    const playerData = playerResponse.data.data.user;
    
    console.log('Player joined teams:', playerData.playerInfo?.joinedTeams || []);
    
    // Find the active team membership
    const activeTeam = playerData.playerInfo?.joinedTeams?.find(
      team => team.team._id === TEST_TEAM_ID && team.isActive
    );
    
    if (!activeTeam) {
      console.log('No active team membership found for this player and team');
      return;
    }
    
    console.log('Active team membership found:', activeTeam);
    
    // Test leaving the team
    console.log('\n2. Testing leave team API...');
    const leaveResponse = await axios.delete(`${BASE_URL}/users/${TEST_TEAM_ID}/roster/${TEST_GAME}/leave`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN}` // You'll need to set this
      }
    });
    
    console.log('Leave team response:', leaveResponse.data);
    
    // Verify the changes
    console.log('\n3. Getting player profile after leaving team...');
    const updatedPlayerResponse = await axios.get(`${BASE_URL}/users/${TEST_PLAYER_ID}`);
    const updatedPlayerData = updatedPlayerResponse.data.data.user;
    
    console.log('Updated player joined teams:', updatedPlayerData.playerInfo?.joinedTeams || []);
    
    // Find the updated team membership
    const updatedTeam = updatedPlayerData.playerInfo?.joinedTeams?.find(
      team => team.team._id === TEST_TEAM_ID
    );
    
    if (updatedTeam) {
      console.log('Updated team membership:', updatedTeam);
      console.log('Is active:', updatedTeam.isActive);
      console.log('Left at:', updatedTeam.leftAt);
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testLeaveTeam();
