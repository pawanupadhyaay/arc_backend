import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  X, 
  Calendar, 
  Users, 
  DollarSign, 
  MapPin, 
  Clock,
  Gamepad2,
  Trophy,
  Settings,
  Check,
  ArrowRight,
  ArrowLeft,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import axios from 'axios';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTournamentCreated: () => void;
}

const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  onClose,
  onTournamentCreated
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    banner: null as File | null,
    game: '',
    format: '',
    mode: '',
    totalSlots: 16,
    teamsPerGroup: 4,
    numberOfGroups: 4,
    prizePoolType: 'with_prize', // 'with_prize' or 'without_prize'
    prizePool: 0,
    entryFee: 0,
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    location: 'Online',
    timezone: 'UTC',
    rules: ''
  });

  // Game-specific configurations
  const gameConfigs: Record<string, {
    modes: string[];
    formats: Record<string, string[]>;
    defaultTeamSizes: Record<string, { min: number; max: number }>;
  }> = {
    'BGMI': {
      modes: ['Battle Royale', 'Deathmatch'],
      formats: {
        'Battle Royale': ['Solo', 'Duo', 'Squad'],
        'Deathmatch': ['Solo', 'Duo', 'Squad']
      },
      defaultTeamSizes: {
        'Solo': { min: 1, max: 1 },
        'Duo': { min: 2, max: 2 },
        'Squad': { min: 4, max: 4 }
      }
    },
    'Free Fire': {
      modes: ['Battle Royale', 'Deathmatch'],
      formats: {
        'Battle Royale': ['Solo', 'Duo', 'Squad'],
        'Deathmatch': ['Solo', 'Duo', 'Squad']
      },
      defaultTeamSizes: {
        'Solo': { min: 1, max: 1 },
        'Duo': { min: 2, max: 2 },
        'Squad': { min: 4, max: 4 }
      }
    },
    'Call of Duty Mobile': {
      modes: ['Battle Royale', 'Deathmatch'],
      formats: {
        'Battle Royale': ['Solo', 'Duo', 'Squad'],
        'Deathmatch': ['5v5']
      },
      defaultTeamSizes: {
        'Solo': { min: 1, max: 1 },
        'Duo': { min: 2, max: 2 },
        'Squad': { min: 4, max: 4 },
        '5v5': { min: 5, max: 5 }
      }
    },
    'Valorant': {
      modes: ['5v5'],
      formats: {
        '5v5': ['5v5']
      },
      defaultTeamSizes: {
        '5v5': { min: 5, max: 5 }
      }
    }
  };

  const steps = [
    { id: 1, title: 'Game & Format', icon: Gamepad2 },
    { id: 2, title: 'Basic Info & Slots', icon: Settings },
    { id: 3, title: 'Prize Pool & Schedule', icon: DollarSign },
    { id: 4, title: 'Review', icon: Trophy }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'game') {
      const selectedGame = gameConfigs[value];
      const autoMode = selectedGame?.modes?.length === 1 ? selectedGame.modes[0] : '';
      
      setFormData(prev => ({
        ...prev,
        game: value,
        format: '',
        mode: autoMode
      }));
    } else if (name === 'mode') {
      setFormData(prev => ({
        ...prev,
        mode: value,
        format: ''
      }));
    } else if (name === 'format') {
      setFormData(prev => ({
        ...prev,
        format: value
      }));
    } else if (name === 'totalSlots') {
      const slots = parseInt(value) || 16;
      const teamsPerGroup = formData.teamsPerGroup;
      const groups = Math.ceil(slots / teamsPerGroup);
      setFormData(prev => ({
        ...prev,
        totalSlots: slots,
        numberOfGroups: groups
      }));
    } else if (name === 'teamsPerGroup') {
      const teamsPerGroup = parseInt(value) || 4;
      const totalSlots = formData.totalSlots;
      const groups = Math.ceil(totalSlots / teamsPerGroup);
      setFormData(prev => ({
        ...prev,
        teamsPerGroup,
        numberOfGroups: groups
      }));
    } else if (name === 'prizePoolType') {
      setFormData(prev => ({
        ...prev,
        prizePoolType: value,
        prizePool: value === 'without_prize' ? 0 : prev.prizePool
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseInt(value) || 0
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        banner: file
      }));
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      setError('');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return formData.game && formData.format && formData.mode;
      case 2:
        return formData.name && formData.description && formData.totalSlots > 0 && formData.teamsPerGroup > 0;
      case 3:
        return (formData.prizePoolType === 'without_prize' || 
               (formData.prizePoolType === 'with_prize' && formData.prizePool > 0)) &&
               formData.registrationDeadline && formData.startDate && formData.endDate;
      case 4:
        return true; // Always allow proceeding to review step
      default:
        return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate all required fields before submission
      if (!formData.name || !formData.description || !formData.game || !formData.format || 
          !formData.startDate || !formData.endDate || !formData.registrationDeadline) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const submitData = new FormData();
      
      // Append all form data
      Object.keys(formData).forEach(key => {
        if (key === 'banner' && formData.banner) {
          submitData.append('banner', formData.banner);
        } else if (key !== 'banner') {
          submitData.append(key, (formData as any)[key]);
        }
      });

      // Debug: Log the form data being sent
      console.log('Form data being sent:', Object.fromEntries(submitData.entries()));

      await axios.post('/api/tournaments', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      onTournamentCreated();
      onClose();
      setFormData({
        name: '',
        description: '',
        banner: null,
        game: '',
        format: '',
        mode: '',
        totalSlots: 16,
        teamsPerGroup: 4,
        numberOfGroups: 4,
        prizePoolType: 'with_prize',
        prizePool: 0,
        entryFee: 0,
        startDate: '',
        endDate: '',
        registrationDeadline: '',
        location: 'Online',
        timezone: 'UTC',
        rules: ''
      });
      setCurrentStep(1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error creating tournament');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedGameConfig = gameConfigs[formData.game];
  const availableFormats = formData.mode && selectedGameConfig?.formats[formData.mode] ? selectedGameConfig.formats[formData.mode] : [];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Select Game</h3>
              <div className="grid grid-cols-2 gap-4">
                                 {Object.keys(gameConfigs).map((game) => (
                   <button
                     key={game}
                     type="button"
                     onClick={() => {
                       const selectedGame = gameConfigs[game];
                       const autoMode = selectedGame?.modes?.length === 1 ? selectedGame.modes[0] : '';
                       setFormData(prev => ({ ...prev, game, format: '', mode: autoMode }));
                     }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.game === game
                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                        : 'border-secondary-700 bg-secondary-800 text-gray-300 hover:border-secondary-600'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">
                        {game === 'BGMI' ? '🎮' : game === 'Valorant' ? '🔫' : game === 'Free Fire' ? '🔥' : '🎯'}
                      </div>
                      <div className="font-medium">{game}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {formData.game && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">
                  Select Format for {formData.game}
                </h3>
                
                {/* Mode Selection for games with multiple modes */}
                {selectedGameConfig?.modes && selectedGameConfig.modes.length > 1 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Select Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedGameConfig.modes.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, mode, format: '' }))}
                          className={`p-3 rounded-lg border transition-all ${
                            formData.mode === mode
                              ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                              : 'border-secondary-700 bg-secondary-800 text-gray-300 hover:border-secondary-600'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                                 {/* Auto-set mode for single mode games */}
                 {selectedGameConfig?.modes && selectedGameConfig.modes.length === 1 && (
                   <div className="mb-4">
                     <div className="text-sm text-gray-400">Mode: {selectedGameConfig.modes[0]}</div>
                   </div>
                 )}

                {/* Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select Format</label>
                  <div className="grid grid-cols-3 gap-3">
                                         {availableFormats.map((format) => {
                       const teamSize = selectedGameConfig?.defaultTeamSizes[format];
                       return (
                        <button
                          key={format}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, format }))}
                          className={`p-3 rounded-lg border transition-all ${
                            formData.format === format
                              ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                              : 'border-secondary-700 bg-secondary-800 text-gray-300 hover:border-secondary-600'
                          }`}
                        >
                          <div className="text-center">
                            <div className="font-medium">{format}</div>
                            <div className="text-xs text-gray-400">
                              {teamSize?.min === teamSize?.max 
                                ? `${teamSize.min} Player${teamSize.min > 1 ? 's' : ''}`
                                : `${teamSize?.min}-${teamSize?.max} Players`
                              }
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

             case 2:
         return (
           <div className="space-y-6">
             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">
                 Tournament Name *
               </label>
               <input
                 type="text"
                 name="name"
                 value={formData.name}
                 onChange={handleInputChange}
                 required
                 className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                 placeholder="Enter tournament name"
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">
                 Tournament Description *
               </label>
               <textarea
                 name="description"
                 value={formData.description}
                 onChange={handleInputChange}
                 required
                 rows={4}
                 className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
                 placeholder="Describe your tournament, what makes it special, and what players can expect"
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">
                 Tournament Banner
               </label>
               <div className="border-2 border-dashed border-secondary-700 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                 <input
                   type="file"
                   accept="image/*"
                   onChange={handleFileChange}
                   className="hidden"
                   id="banner-upload"
                 />
                 <label htmlFor="banner-upload" className="cursor-pointer">
                   {formData.banner ? (
                     <div className="space-y-2">
                       <ImageIcon className="h-12 w-12 text-primary-500 mx-auto" />
                       <div className="text-white font-medium">{formData.banner.name}</div>
                       <div className="text-sm text-gray-400">Click to change</div>
                     </div>
                   ) : (
                     <div className="space-y-2">
                       <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                       <div className="text-white font-medium">Upload Tournament Banner</div>
                       <div className="text-sm text-gray-400">PNG, JPG up to 5MB</div>
                     </div>
                   )}
                 </label>
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">
                 Total Number of Slots *
               </label>
               <input
                 type="number"
                 name="totalSlots"
                 value={formData.totalSlots}
                 onChange={handleInputChange}
                 min="4"
                 max="128"
                 required
                 className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
               />
               <p className="text-sm text-gray-400 mt-1">Total number of teams/players that can join</p>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">
                 Teams per Group *
               </label>
               <input
                 type="number"
                 name="teamsPerGroup"
                 value={formData.teamsPerGroup}
                 onChange={handleInputChange}
                 min="2"
                 max="16"
                 required
                 className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
               />
               <p className="text-sm text-gray-400 mt-1">Number of teams in each group</p>
             </div>

             <div className="bg-secondary-800 rounded-lg p-4">
               <div className="text-center">
                 <div className="text-2xl font-bold text-primary-500">{formData.numberOfGroups}</div>
                 <div className="text-sm text-gray-400">Number of Groups (Auto-calculated)</div>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-300 mb-2">
                   Location
                 </label>
                 <input
                   type="text"
                   name="location"
                   value={formData.location}
                   onChange={handleInputChange}
                   className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                   placeholder="Online"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-300 mb-2">
                   Timezone
                 </label>
                 <select
                   name="timezone"
                   value={formData.timezone}
                   onChange={handleInputChange}
                   className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                 >
                   <option value="UTC">UTC</option>
                   <option value="IST">IST (India)</option>
                   <option value="EST">EST (US East)</option>
                   <option value="PST">PST (US West)</option>
                   <option value="GMT">GMT (UK)</option>
                 </select>
               </div>
             </div>
           </div>
         );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tournament Type *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, prizePoolType: 'with_prize' }))}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.prizePoolType === 'with_prize'
                      ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                      : 'border-secondary-700 bg-secondary-800 text-gray-300 hover:border-secondary-600'
                  }`}
                >
                  <div className="text-center">
                    <DollarSign className="h-8 w-8 mx-auto mb-2" />
                    <div className="font-medium">Prize Pool Tournament</div>
                    <div className="text-xs text-gray-400">Competitive with rewards</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, prizePoolType: 'without_prize' }))}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.prizePoolType === 'without_prize'
                      ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                      : 'border-secondary-700 bg-secondary-800 text-gray-300 hover:border-secondary-600'
                  }`}
                >
                  <div className="text-center">
                    <Trophy className="h-8 w-8 mx-auto mb-2" />
                    <div className="font-medium">Fun Tournament</div>
                    <div className="text-xs text-gray-400">Just for fun & glory</div>
                  </div>
                </button>
              </div>
            </div>

            {formData.prizePoolType === 'with_prize' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prize Pool (₹) *
                  </label>
                  <input
                    type="number"
                    name="prizePool"
                    value={formData.prizePool}
                    onChange={handleNumberChange}
                    min="100"
                    required
                    className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                    placeholder="1000"
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
                    className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                    placeholder="0"
                  />
                </div>
              </div>
            )}

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
                   className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
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
                   className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
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
                   className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                 />
               </div>
             </div>

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
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-secondary-800 rounded-lg p-4">
              <h4 className="text-lg font-medium text-white mb-4">Tournament Summary</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Name:</div>
                  <div className="text-white font-medium">{formData.name}</div>
                </div>
                <div>
                  <div className="text-gray-400">Game:</div>
                  <div className="text-white font-medium">{formData.game}</div>
                </div>
                <div>
                  <div className="text-gray-400">Mode:</div>
                  <div className="text-white font-medium">{formData.mode || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-gray-400">Format:</div>
                  <div className="text-white font-medium">{formData.format}</div>
                </div>
                <div>
                  <div className="text-gray-400">Total Slots:</div>
                  <div className="text-white font-medium">{formData.totalSlots}</div>
                </div>
                <div>
                  <div className="text-gray-400">Teams per Group:</div>
                  <div className="text-white font-medium">{formData.teamsPerGroup}</div>
                </div>
                <div>
                  <div className="text-gray-400">Number of Groups:</div>
                  <div className="text-white font-medium">{formData.numberOfGroups}</div>
                </div>
                <div>
                  <div className="text-gray-400">Tournament Type:</div>
                  <div className="text-white font-medium">
                    {formData.prizePoolType === 'with_prize' ? 'Prize Pool Tournament' : 'Fun Tournament'}
                  </div>
                </div>
                {formData.prizePoolType === 'with_prize' && (
                  <>
                    <div>
                      <div className="text-gray-400">Prize Pool:</div>
                      <div className="text-white font-medium">₹{formData.prizePool.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Entry Fee:</div>
                      <div className="text-white font-medium">₹{formData.entryFee.toLocaleString()}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="text-center text-sm text-gray-400">
              Review all details above. Click "Create Tournament" to proceed.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-secondary-900 border border-secondary-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-800">
          <div className="flex items-center space-x-3">
            <Trophy className="h-6 w-6 text-primary-500" />
            <div>
              <h2 className="text-xl font-semibold text-white">Create New Tournament</h2>
              <p className="text-sm text-gray-400">Set up your tournament with all the features you need</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="p-6 border-b border-secondary-800">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                    isCompleted 
                      ? 'bg-primary-500 border-primary-500 text-white' 
                      : isCurrent 
                        ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                        : 'bg-secondary-800 border-secondary-700 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </div>
                  <div className="ml-3">
                    <div className={`text-sm font-medium ${
                      isCurrent ? 'text-white' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${
                      isCompleted ? 'bg-primary-500' : 'bg-secondary-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
                         <h3 className="text-2xl font-bold text-white mb-2">
               Step {currentStep} of 4: {steps[currentStep - 1].title}
             </h3>
             <p className="text-gray-400">
               {currentStep === 1 && "Select your game and tournament format"}
               {currentStep === 2 && "Basic tournament information, banner, and slots configuration"}
               {currentStep === 3 && "Choose tournament type, prizes, and schedule"}
               {currentStep === 4 && "Review and create tournament"}
             </p>
          </div>

          {error && (
            <div className="bg-error-500/20 border border-error-500/30 text-error-300 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-secondary-800">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center space-x-2 px-6 py-3 text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

                             {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceedToNext()}
                  className="flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 text-white rounded-lg font-medium transition-colors"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !canProceedToNext()}
                  className="flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 text-white rounded-lg font-medium transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Trophy className="h-4 w-4" />
                      <span>Create Tournament</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTournamentModal;
