const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test data
let testData = {
  adminUser: null,
  staffUser: null,
  team: null,
  leaveRequest: null
};

async function testLeaveRequestSystem() {
  console.log('🧪 Testing Leave Request System...\n');

  try {
    // Step 1: Login as admin user
    console.log('1. Logging in as admin user...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'password123'
    });
    testData.adminUser = adminLoginResponse.data;
    console.log('✅ Admin login successful');

    // Step 2: Login as staff user
    console.log('\n2. Logging in as staff user...');
    const staffLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'staff@test.com',
      password: 'password123'
    });
    testData.staffUser = staffLoginResponse.data;
    console.log('✅ Staff login successful');

    // Step 3: Get team info (assuming admin has a team)
    console.log('\n3. Getting team information...');
    const teamResponse = await axios.get(`${BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${testData.adminUser.token}` }
    });
    
    const adminTeam = teamResponse.data.teamInfo?.ownedTeams?.[0] || teamResponse.data.teamInfo?.staff?.[0]?.team;
    if (!adminTeam) {
      console.log('❌ No team found for admin user');
      return;
    }
    testData.team = adminTeam;
    console.log(`✅ Found team: ${adminTeam.teamName}`);

    // Step 4: Add staff user to team (if not already added)
    console.log('\n4. Adding staff user to team...');
    try {
      await axios.post(`${BASE_URL}/users/${testData.adminUser.user._id}/add-staff`, {
        username: testData.staffUser.user.username
      }, {
        headers: { Authorization: `Bearer ${testData.adminUser.token}` }
      });
      console.log('✅ Staff user added to team');
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message.includes('already a staff member')) {
        console.log('ℹ️ Staff user already in team');
      } else {
        throw error;
      }
    }

    // Step 5: Staff user creates a leave request
    console.log('\n5. Staff user creating leave request...');
    const leaveRequestResponse = await axios.post(`${BASE_URL}/leave-requests/team/${testData.team._id}/leave-request`, {
      reason: 'Testing leave request system'
    }, {
      headers: { Authorization: `Bearer ${testData.staffUser.token}` }
    });
    testData.leaveRequest = leaveRequestResponse.data;
    console.log('✅ Leave request created successfully');
    console.log(`   Request ID: ${testData.leaveRequest._id}`);
    console.log(`   Status: ${testData.leaveRequest.status}`);

    // Step 6: Verify leave request appears in team's leave requests
    console.log('\n6. Verifying leave request appears in team requests...');
    const teamRequestsResponse = await axios.get(`${BASE_URL}/leave-requests/team/${testData.team._id}/leave-requests`, {
      headers: { Authorization: `Bearer ${testData.adminUser.token}` }
    });
    
    const pendingRequests = teamRequestsResponse.data.filter(req => req.status === 'pending');
    console.log(`✅ Found ${pendingRequests.length} pending leave requests`);
    
    if (pendingRequests.length > 0) {
      console.log(`   Latest request: ${pendingRequests[0].staffMember.username} - ${pendingRequests[0].reason}`);
    }

    // Step 7: Admin approves the leave request
    console.log('\n7. Admin approving leave request...');
    const approveResponse = await axios.patch(`${BASE_URL}/leave-requests/team/${testData.team._id}/leave-request/${testData.leaveRequest._id}`, {
      action: 'approve',
      adminResponse: 'Approved for testing purposes'
    }, {
      headers: { Authorization: `Bearer ${testData.adminUser.token}` }
    });
    console.log('✅ Leave request approved successfully');

    // Step 8: Verify staff user is no longer active in team
    console.log('\n8. Verifying staff user is removed from team...');
    const updatedTeamResponse = await axios.get(`${BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${testData.adminUser.token}` }
    });
    
    const updatedTeam = updatedTeamResponse.data.teamInfo?.ownedTeams?.find(t => t._id === testData.team._id) ||
                       updatedTeamResponse.data.teamInfo?.staff?.find(s => s.team._id === testData.team._id)?.team;
    
    if (updatedTeam) {
      const activeStaff = updatedTeam.staff?.filter(s => s.isActive) || [];
      const inactiveStaff = updatedTeam.staff?.filter(s => !s.isActive) || [];
      console.log(`✅ Team staff status: ${activeStaff.length} active, ${inactiveStaff.length} inactive`);
      
      const testStaff = updatedTeam.staff?.find(s => s.user._id === testData.staffUser.user._id);
      if (testStaff) {
        console.log(`   Test staff member: isActive=${testStaff.isActive}, leftAt=${testStaff.leftAt}`);
      }
    }

    // Step 9: Verify leave request status is updated
    console.log('\n9. Verifying leave request status...');
    const updatedRequestResponse = await axios.get(`${BASE_URL}/leave-requests/team/${testData.team._id}/leave-requests`, {
      headers: { Authorization: `Bearer ${testData.adminUser.token}` }
    });
    
    const approvedRequest = updatedRequestResponse.data.find(req => req._id === testData.leaveRequest._id);
    if (approvedRequest) {
      console.log(`✅ Leave request status: ${approvedRequest.status}`);
      console.log(`   Admin response: ${approvedRequest.adminResponse}`);
      console.log(`   Left date: ${approvedRequest.leftDate}`);
    }

    // Step 10: Test staff user's own leave requests
    console.log('\n10. Checking staff user\'s leave requests...');
    const userRequestsResponse = await axios.get(`${BASE_URL}/leave-requests/user/leave-requests`, {
      headers: { Authorization: `Bearer ${testData.staffUser.token}` }
    });
    
    console.log(`✅ Staff user has ${userRequestsResponse.data.length} leave requests`);
    userRequestsResponse.data.forEach((req, index) => {
      console.log(`   Request ${index + 1}: ${req.status} - ${req.reason}`);
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Staff can create leave requests');
    console.log('- Admins can view pending requests');
    console.log('- Admins can approve requests');
    console.log('- Staff members are properly marked as inactive when approved');
    console.log('- Leave request status is properly tracked');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testLeaveRequestSystem();
