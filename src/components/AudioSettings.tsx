import React, { useState, useEffect, useCallback } from 'react';
import { AudioProcessingOptions, getAudioQualityPreset } from '../utils/audioProcessor';
import { 
  X, 
  Volume2, 
  Mic, 
  Headphones, 
  Zap, 
  Shield, 
  Radio,
  Waves,
  Settings2,
  Sparkles,
  Info,
  CheckCircle2,
  Speaker,
  RefreshCw
} from 'lucide-react';

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

interface AudioSettingsProps {
  options: AudioProcessingOptions;
  onOptionsChange: (options: AudioProcessingOptions) => void;
  voiceLevel?: number;
  isSelfMonitoring?: boolean;
  onToggleSelfMonitor?: () => void;
  isOpen: boolean;
  onClose: () => void;
  selectedMicId?: string;
  selectedSpeakerId?: string;
  onMicChange?: (deviceId: string) => void;
  onSpeakerChange?: (deviceId: string) => void;
}

// Toggle Switch Component
const Toggle: React.FC<{
  enabled: boolean;
  onChange: () => void;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}> = ({ enabled, onChange, color = 'purple' }) => {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-gradient-to-r from-indigo-500 to-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
        enabled ? colors[color] : 'bg-secondary'
      }`}
      aria-label="Toggle"
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

// Setting Item Component
const SettingItem: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all duration-200">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-secondary/50 text-purple-400">
        {icon}
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">{title}</label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

// Quality Preset Card
const QualityCard: React.FC<{
  name: string;
  icon: React.ReactNode;
  description: string;
  isActive: boolean;
  onClick: () => void;
  gradient: string;
}> = ({ name, icon, description, isActive, onClick, gradient }) => (
  <button
    onClick={onClick}
    className={`relative p-4 rounded-xl border transition-all duration-300 text-left ${
      isActive 
        ? 'border-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30' 
        : 'border-border/30 bg-secondary/20 hover:bg-secondary/40 hover:border-border/50'
    }`}
  >
    {isActive && (
      <div className="absolute top-2 right-2">
        <CheckCircle2 className="h-4 w-4 text-green-400" />
      </div>
    )}
    <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} w-fit mb-2`}>
      {icon}
    </div>
    <h4 className="font-semibold text-sm">{name}</h4>
    <p className="text-xs text-muted-foreground mt-1">{description}</p>
  </button>
);

export const AudioSettings: React.FC<AudioSettingsProps> = ({
  options,
  onOptionsChange,
  voiceLevel = 0,
  isSelfMonitoring = false,
  onToggleSelfMonitor,
  isOpen,
  onClose,
  selectedMicId,
  selectedSpeakerId,
  onMicChange,
  onSpeakerChange,
}) => {
  const [localOptions, setLocalOptions] = useState(options);
  const [activeTab, setActiveTab] = useState<'devices' | 'presets' | 'advanced'>('devices');
  const [microphones, setMicrophones] = useState<AudioDevice[]>([]);
  const [speakers, setSpeakers] = useState<AudioDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Load audio devices
  const loadDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const mics = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`,
          kind: 'audioinput' as const
        }));
      
      const spkrs = devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${d.deviceId.slice(0, 5)}`,
          kind: 'audiooutput' as const
        }));
      
      setMicrophones(mics);
      setSpeakers(spkrs);
    } catch (err) {
      console.error('Failed to load audio devices:', err);
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen, loadDevices]);

  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  const handleChange = (key: keyof AudioProcessingOptions, value: unknown) => {
    const newOptions = { ...localOptions, [key]: value };
    setLocalOptions(newOptions);
    onOptionsChange(newOptions);
  };

  const applyPreset = (preset: 'basic' | 'balanced' | 'professional' | 'ultra') => {
    const presetOptions = getAudioQualityPreset(preset);
    const newOptions = { ...localOptions, ...presetOptions };
    setLocalOptions(newOptions);
    onOptionsChange(newOptions);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-b from-background to-background/95 border border-border/50 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
              <Settings2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Audio Settings</h2>
              <p className="text-xs text-muted-foreground">Configure your voice experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voice Level Meter */}
        <div className="mb-6 p-4 rounded-xl bg-secondary/30 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Mic className={`h-4 w-4 ${voiceLevel > 10 ? 'text-green-400' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">Voice Level</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{Math.round(voiceLevel)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-75 rounded-full"
              style={{ width: `${Math.min(voiceLevel, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Silent</span>
            <span>Normal</span>
            <span>Loud</span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'devices' 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' 
                : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Headphones className="h-4 w-4 inline-block mr-1" />
            Devices
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'presets' 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' 
                : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-4 w-4 inline-block mr-1" />
            Presets
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'advanced' 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' 
                : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings2 className="h-4 w-4 inline-block mr-1" />
            Advanced
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {/* Devices Tab */}
          {activeTab === 'devices' && (
            <>
              {/* Refresh Button */}
              <div className="flex justify-end">
                <button
                  onClick={loadDevices}
                  disabled={isLoadingDevices}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingDevices ? 'animate-spin' : ''}`} />
                  Refresh Devices
                </button>
              </div>

              {/* Microphone Selection */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/30 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                    <Mic className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Microphone</h3>
                    <p className="text-xs text-muted-foreground">Select input device</p>
                  </div>
                </div>
                <select
                  value={selectedMicId || ''}
                  onChange={(e) => onMicChange?.(e.target.value)}
                  className="w-full p-3 rounded-xl bg-secondary/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer"
                >
                  <option value="">Default Microphone</option>
                  {microphones.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label}
                    </option>
                  ))}
                </select>
                {microphones.length === 0 && !isLoadingDevices && (
                  <p className="text-xs text-yellow-400">No microphones found. Check permissions.</p>
                )}
              </div>

              {/* Speaker Selection */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/30 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Speaker className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Speaker / Headphones</h3>
                    <p className="text-xs text-muted-foreground">Select output device</p>
                  </div>
                </div>
                <select
                  value={selectedSpeakerId || ''}
                  onChange={(e) => onSpeakerChange?.(e.target.value)}
                  className="w-full p-3 rounded-xl bg-secondary/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer"
                >
                  <option value="">Default Speaker</option>
                  {speakers.map((spk) => (
                    <option key={spk.deviceId} value={spk.deviceId}>
                      {spk.label}
                    </option>
                  ))}
                </select>
                {speakers.length === 0 && !isLoadingDevices && (
                  <p className="text-xs text-muted-foreground">Speaker selection not supported in this browser.</p>
                )}
              </div>

              {/* Self Monitor */}
              <SettingItem
                icon={<Headphones className="h-4 w-4" />}
                title="Self Monitor"
                description="Hear your own voice (for testing)"
              >
                <Toggle 
                  enabled={isSelfMonitoring} 
                  onChange={onToggleSelfMonitor || (() => {})} 
                  color="green"
                />
              </SettingItem>

              {isSelfMonitoring && (
                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-xs text-yellow-200">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Use headphones to avoid feedback. Turn off after testing.</span>
                </div>
              )}

              {/* Info */}
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-200">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Changing devices will reconnect your audio. Speaker selection requires Chrome/Edge.</span>
              </div>
            </>
          )}

          {activeTab === 'presets' && (
            <>
              {/* Quality Presets Grid */}
              <div className="grid grid-cols-2 gap-3">
                <QualityCard
                  name="Basic"
                  icon={<Mic className="h-4 w-4 text-white" />}
                  description="Browser processing only. Most stable."
                  isActive={localOptions.audioQuality === 'basic'}
                  onClick={() => applyPreset('basic')}
                  gradient="from-gray-500 to-gray-600"
                />
                <QualityCard
                  name="Balanced"
                  icon={<Zap className="h-4 w-4 text-white" />}
                  description="AI + Essential filters"
                  isActive={localOptions.audioQuality === 'balanced'}
                  onClick={() => applyPreset('balanced')}
                  gradient="from-blue-500 to-blue-600"
                />
                <QualityCard
                  name="Professional"
                  icon={<Radio className="h-4 w-4 text-white" />}
                  description="Full audio chain"
                  isActive={localOptions.audioQuality === 'professional'}
                  onClick={() => applyPreset('professional')}
                  gradient="from-purple-500 to-purple-600"
                />
                <QualityCard
                  name="Ultra"
                  icon={<Sparkles className="h-4 w-4 text-white" />}
                  description="Discord-level quality"
                  isActive={localOptions.audioQuality === 'ultra'}
                  onClick={() => applyPreset('ultra')}
                  gradient="from-pink-500 to-rose-600"
                />
              </div>

              {/* Info Box */}
              <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-200">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span><strong>Recommended:</strong> Use "Basic" for stable audio. Browser's native processing is already professional-grade.</span>
              </div>
            </>
          )}

          {activeTab === 'advanced' && (
            <>
              {/* AI Noise Suppression */}
              <SettingItem
                icon={<Shield className="h-4 w-4" />}
                title="AI Noise Suppression"
                description="RNNoise powered filtering"
              >
                <Toggle 
                  enabled={localOptions.useRNNoise || false} 
                  onChange={() => handleChange('useRNNoise', !localOptions.useRNNoise)} 
                />
              </SettingItem>

              {/* VAD */}
              <SettingItem
                icon={<Waves className="h-4 w-4" />}
                title="Voice Activity Detection"
                description="Auto-detect when speaking"
              >
                <Toggle 
                  enabled={localOptions.vadEnabled || false} 
                  onChange={() => handleChange('vadEnabled', !localOptions.vadEnabled)} 
                />
              </SettingItem>

              {/* VAD Threshold */}
              {localOptions.vadEnabled && (
                <div className="p-3 rounded-xl bg-secondary/30">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">VAD Sensitivity</span>
                    <span className="text-xs font-mono text-purple-400">{localOptions.vadThreshold || 40}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={localOptions.vadThreshold || 40}
                    onChange={(e) => handleChange('vadThreshold', Number(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>More sensitive</span>
                    <span>Less sensitive</span>
                  </div>
                </div>
              )}

              {/* High-Pass Filter */}
              <SettingItem
                icon={<Volume2 className="h-4 w-4" />}
                title="High-Pass Filter"
                description="Remove low frequency noise"
              >
                <Toggle 
                  enabled={localOptions.highPassFilter || false} 
                  onChange={() => handleChange('highPassFilter', !localOptions.highPassFilter)} 
                />
              </SettingItem>

              {/* Browser Processing Section */}
              <div className="pt-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Browser Processing
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20">
                    <span className="text-sm">Echo Cancellation</span>
                    <Toggle 
                      enabled={localOptions.echoCancellation || false} 
                      onChange={() => handleChange('echoCancellation', !localOptions.echoCancellation)} 
                      color="blue"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20">
                    <span className="text-sm">Noise Suppression</span>
                    <Toggle 
                      enabled={localOptions.noiseSuppression || false} 
                      onChange={() => handleChange('noiseSuppression', !localOptions.noiseSuppression)} 
                      color="blue"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20">
                    <span className="text-sm">Auto Gain Control</span>
                    <Toggle 
                      enabled={localOptions.autoGainControl || false} 
                      onChange={() => handleChange('autoGainControl', !localOptions.autoGainControl)} 
                      color="blue"
                    />
                  </div>
                </div>
              </div>

              {/* Output Gain */}
              <div className="p-3 rounded-xl bg-secondary/30">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Output Volume</span>
                  <span className="text-xs font-mono text-purple-400">{Math.round((localOptions.outputGain || 1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={(localOptions.outputGain || 1) * 100}
                  onChange={(e) => handleChange('outputGain', Number(e.target.value) / 100)}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-border/30 flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Mode: <span className="text-purple-400 font-medium">{localOptions.audioQuality?.toUpperCase()}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
