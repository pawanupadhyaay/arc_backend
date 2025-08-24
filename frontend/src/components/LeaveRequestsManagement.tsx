import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, User, MessageSquare, Calendar } from 'lucide-react';
import axios from 'axios';

interface LeaveRequest {
  _id: string;
  staffMember: {
    _id: string;
    username: string;
    profile?: {
      displayName?: string;
      avatar?: string;
    };
  };
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
  respondedBy?: {
    username: string;
    profile?: {
      displayName?: string;
    };
  };
  adminResponse?: string;
}

interface LeaveRequestsManagementProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const LeaveRequestsManagement: React.FC<LeaveRequestsManagementProps> = ({
  teamId,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLeaveRequests();
    }
  }, [isOpen, teamId]);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/leave-requests/team/${teamId}/leave-requests`);
      if (response.data.success) {
        setLeaveRequests(response.data.data.leaveRequests);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (requestId: string, action: 'approve' | 'reject') => {
    setRespondingTo(requestId);
    setMessage(null);

    try {
      const apiResponse = await axios.patch(`/api/leave-requests/team/${teamId}/leave-request/${requestId}`, {
        action,
        adminResponse: response.trim()
      });

      if (apiResponse.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully!` 
        });
        
        // Refresh the list
        await fetchLeaveRequests();
        onUpdate();
        
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error responding to leave request:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to respond to leave request. Please try again.' 
      });
    } finally {
      setRespondingTo(null);
      setResponse('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-secondary-700 text-secondary-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-secondary-800 rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Leave Requests Management</h3>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-white transition-colors"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-secondary-500 mx-auto mb-4" />
              <p className="text-secondary-400">No leave requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map((request) => (
                <div key={request._id} className="bg-secondary-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <img
                        src={request.staffMember.profile?.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzNzM3M0EiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjIwOTEgMTAgMjQgMTEuNzkwOSAyNCAxNEMyNCAxNi4yMDkxIDIyLjIwOTEgMTggMjAgMThDMTcuNzkwOSAxOCAxNiAxNi4yMDkxIDE2IDE0QzE2IDExLjc5MDkgMTYuNzkwOSAxMCAyMCAxMFoiIGZpbGw9IiM2QjZCNkIiLz4KPHBhdGggZD0iTTI4IDMwQzI4IDI2LjY4NjMgMjQuNDE4MyAyNCAyMCAyNEMxNS41ODE3IDI0IDEyIDI2LjY4NjMgMTIgMzBIMjhaIiBmaWxsPSIjNkI2QjZCIi8+Cjwvc3ZnPgo='}
                        alt={request.staffMember.profile?.displayName || request.staffMember.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-semibold text-white">
                          {request.staffMember.profile?.displayName || request.staffMember.username}
                        </h4>
                        <p className="text-sm text-secondary-400">
                          @{request.staffMember.username}
                        </p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs border ${getStatusColor(request.status)} flex items-center space-x-1`}>
                      {getStatusIcon(request.status)}
                      <span className="capitalize">{request.status}</span>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="mb-3 p-3 bg-secondary-600 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <MessageSquare className="h-4 w-4 text-secondary-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-white mb-1">Reason:</p>
                          <p className="text-sm text-secondary-300">{request.reason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-sm text-secondary-400 mb-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Requested: {formatDate(request.requestedAt)}</span>
                    </div>
                    {request.respondedAt && (
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>
                          Responded by {request.respondedBy?.profile?.displayName || request.respondedBy?.username} on {formatDate(request.respondedAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {request.adminResponse && (
                    <div className="mb-3 p-3 bg-secondary-600 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <MessageSquare className="h-4 w-4 text-secondary-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-white mb-1">Admin Response:</p>
                          <p className="text-sm text-secondary-300">{request.adminResponse}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="space-y-3">
                      <textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder="Add a response (optional)..."
                        className="w-full px-3 py-2 bg-secondary-600 border border-secondary-500 rounded-lg text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows={2}
                        maxLength={500}
                      />
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleRespond(request._id, 'reject')}
                          disabled={respondingTo === request._id}
                          className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {respondingTo === request._id ? 'Processing...' : 'Reject'}
                        </button>
                        <button
                          onClick={() => handleRespond(request._id, 'approve')}
                          disabled={respondingTo === request._id}
                          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {respondingTo === request._id ? 'Processing...' : 'Approve'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestsManagement;
