import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

const MediaTest: React.FC = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  const initializeMedia = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const constraints = {
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      console.log('Media initialized successfully');
      console.log('Audio tracks:', stream.getAudioTracks().map(t => ({ label: t.label, enabled: t.enabled })));
      console.log('Video tracks:', stream.getVideoTracks().map(t => ({ label: t.label, enabled: t.enabled })));

    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      setError(`Failed to access media: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const newState = !audioTrack.enabled;
        audioTrack.enabled = newState;
        setIsMicOn(newState);
        console.log('Microphone toggled:', newState ? 'ON' : 'OFF');
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const newState = !videoTrack.enabled;
        videoTrack.enabled = newState;
        setIsVideoOn(newState);
        console.log('Video toggled:', newState ? 'ON' : 'OFF');
      }
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">Media Test</h1>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Video Display */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Local Video</h2>
              <div className="bg-black rounded-lg overflow-hidden aspect-video">
                {localStream ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <p className="text-gray-400">No video stream</p>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Controls</h2>
                
                {!localStream ? (
                  <button
                    onClick={initializeMedia}
                    disabled={isLoading}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Initializing...' : 'Start Media Test'}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <button
                      onClick={toggleMic}
                      className={`w-full px-6 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                        isMicOn ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                      <span>{isMicOn ? 'Microphone ON' : 'Microphone OFF'}</span>
                    </button>

                    <button
                      onClick={toggleVideo}
                      className={`w-full px-6 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                        isVideoOn ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                      <span>{isVideoOn ? 'Video ON' : 'Video OFF'}</span>
                    </button>

                    <button
                      onClick={cleanup}
                      className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Stop Media Test
                    </button>
                  </div>
                )}
              </div>

              {/* Status */}
              {localStream && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Status</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Microphone:</span>
                      <span className={isMicOn ? 'text-green-400' : 'text-red-400'}>
                        {isMicOn ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Video:</span>
                      <span className={isVideoOn ? 'text-green-400' : 'text-red-400'}>
                        {isVideoOn ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Audio Tracks:</span>
                      <span className="text-blue-400">
                        {localStream.getAudioTracks().length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Video Tracks:</span>
                      <span className="text-blue-400">
                        {localStream.getVideoTracks().length}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Instructions</h3>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• Click "Start Media Test" to initialize camera and microphone</li>
              <li>• Use the toggle buttons to test microphone and video controls</li>
              <li>• Check the browser console for detailed logs</li>
              <li>• Ensure your browser has permission to access camera and microphone</li>
              <li>• Test that audio is working by speaking and seeing the microphone indicator</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaTest;
