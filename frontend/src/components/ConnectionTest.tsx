import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ConnectionTest: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<string>('Checking...');
  const [socketStatus, setSocketStatus] = useState<string>('Checking...');
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testBackendConnection = async () => {
    try {
      addResult('Testing backend connection...');
      const response = await axios.get('/api/health');
      if (response.data.success) {
        setBackendStatus('✅ Connected');
        addResult('Backend connection successful');
      } else {
        setBackendStatus('❌ Failed');
        addResult('Backend connection failed');
      }
    } catch (error) {
      setBackendStatus('❌ Error');
      addResult(`Backend connection error: ${error}`);
    }
  };

  const testNotificationsAPI = async () => {
    try {
      addResult('Testing notifications API...');
      const token = localStorage.getItem('token');
      if (!token) {
        addResult('❌ No auth token found');
        return;
      }

      const response = await axios.get('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        addResult('✅ Notifications API working');
      } else {
        addResult('❌ Notifications API failed');
      }
    } catch (error: any) {
      addResult(`❌ Notifications API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
  };

  const testWebRTCSupport = () => {
    addResult('Testing WebRTC support...');
    
    if (!navigator.mediaDevices) {
      addResult('❌ MediaDevices not supported');
      return;
    }

    if (!navigator.mediaDevices.getUserMedia) {
      addResult('❌ getUserMedia not supported');
      return;
    }

    if (!window.RTCPeerConnection) {
      addResult('❌ RTCPeerConnection not supported');
      return;
    }

    addResult('✅ WebRTC supported');
    
    // Test STUN servers
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addResult('✅ ICE candidate generated');
      }
    };

    pc.onicegatheringstatechange = () => {
      addResult(`ICE gathering state: ${pc.iceGatheringState}`);
    };

    // Create a dummy offer to test ICE gathering
    pc.createOffer()
      .then(offer => {
        addResult('✅ Offer creation successful');
        return pc.setLocalDescription(offer);
      })
      .then(() => {
        addResult('✅ Local description set');
      })
      .catch(error => {
        addResult(`❌ WebRTC test failed: ${error.message}`);
      });
  };

  useEffect(() => {
    testBackendConnection();
    testNotificationsAPI();
    testWebRTCSupport();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">Connection Test</h1>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Status</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Backend:</span>
                  <span className={backendStatus.includes('✅') ? 'text-green-400' : 'text-red-400'}>
                    {backendStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Socket:</span>
                  <span className={socketStatus.includes('✅') ? 'text-green-400' : 'text-red-400'}>
                    {socketStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={testBackendConnection}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Test Backend
                </button>
                <button
                  onClick={testNotificationsAPI}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Test Notifications
                </button>
                <button
                  onClick={testWebRTCSupport}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Test WebRTC
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Test Results</h2>
            <div className="bg-black/20 rounded-lg p-4 h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm text-gray-300 mb-1">
                  {result}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionTest;
