import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  DollarSign, 
  Trophy,
  Settings,
  Save,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

interface TournamentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: any;
  onTournamentUpdated: () => void;
}

const TournamentManagementModal: React.FC<TournamentManagementModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onTournamentUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    registrationDeadline: '',
    startDate: '',
    endDate: '',
    prizePool: 0,
    entryFee: 0,
    rules: '',
    status: ''
  });

  useEffect(() => {
    if (tournament) {
      setFormData({
        name: tournament.name || '',
        description: tournament.description || '',
        registrationDeadline: tournament.registrationDeadline ? new Date(tournament.registrationDeadline).toISOString().slice(0, 16) : '',
        startDate: tournament.startDate ? new Date(tournament.startDate).toISOString().slice(0, 16) : '',
        endDate: tournament.endDate ? new Date(tournament.endDate).toISOString().slice(0, 16) : '',
        prizePool: tournament.prizePool || 0,
        entryFee: tournament.entryFee || 0,
        rules: tournament.rules ? tournament.rules.join(', ') : '',
        status: tournament.status || ''
      });
    }
  }, [tournament]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseInt(value) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const submitData = {
        ...formData,
        rules: formData.rules ? formData.rules.split(',').map(rule => rule.trim()) : []
      };

      await axios.put(`/api/tournaments/${tournament._id}`, submitData);
      
      setSuccess('Tournament updated successfully!');
      onTournamentUpdated();
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating tournament');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !tournament) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-secondary-900 border border-secondary-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-800">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-primary-500" />
            <div>
              <h2 className="text-xl font-semibold text-white">Manage Tournament</h2>
              <p className="text-sm text-gray-400">Update tournament details and dates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-error-500/20 border border-error-500/30 text-error-300 px-4 py-3 rounded-lg text-sm mb-6 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg text-sm mb-6 flex items-center">
              <Trophy className="h-4 w-4 mr-2" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tournament Info */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tournament Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                placeholder="Tournament name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
                placeholder="Tournament description"
              />
            </div>

            {/* Dates Section */}
            <div className="bg-secondary-800 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary-500" />
                Tournament Schedule
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Registration Deadline *
                  </label>
                  <input
                    type="datetime-local"
                    name="registrationDeadline"
                    value={formData.registrationDeadline}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-secondary-900 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-secondary-900 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Date *
                  </label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-secondary-900 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Prize Pool Section */}
            {tournament.prizePoolType === 'with_prize' && (
              <div className="bg-secondary-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-primary-500" />
                  Prize Pool & Entry Fee
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Prize Pool (₹)
                    </label>
                    <input
                      type="number"
                      name="prizePool"
                      value={formData.prizePool}
                      onChange={handleNumberChange}
                      min="0"
                      className="w-full bg-secondary-900 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Entry Fee (₹)
                    </label>
                    <input
                      type="number"
                      name="entryFee"
                      value={formData.entryFee}
                      onChange={handleNumberChange}
                      min="0"
                      className="w-full bg-secondary-900 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tournament Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Registration Open">Registration Open</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Rules */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tournament Rules
              </label>
              <textarea
                name="rules"
                value={formData.rules}
                onChange={handleInputChange}
                rows={4}
                className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
                placeholder="Enter tournament rules (comma-separated)"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-secondary-800">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-lg bg-secondary-700 text-white font-semibold hover:bg-secondary-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 text-white font-semibold transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Update Tournament</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TournamentManagementModal;
