import React, { useState } from 'react';
import { AudioProcessingOptions, getAudioQualityPreset } from '../utils/audioProcessor';

interface AudioSettingsProps {
  options: AudioProcessingOptions;
  onOptionsChange: (options: AudioProcessingOptions) => void;
  voiceLevel?: number;
  isSelfMonitoring?: boolean;
  onToggleSelfMonitor?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettings: React.FC<AudioSettingsProps> = ({
  options,
  onOptionsChange,
  voiceLevel = 0,
  isSelfMonitoring = false,
  onToggleSelfMonitor,
  isOpen,
  onClose,
}) => {
  const [localOptions, setLocalOptions] = useState(options);

  const handleChange = (key: keyof AudioProcessingOptions, value: any) => {
    const newOptions = { ...localOptions, [key]: value };
    setLocalOptions(newOptions);
    onOptionsChange(newOptions);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Audio Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
            aria-label="Close settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Quality Preset Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Audio Quality Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['basic', 'balanced', 'professional', 'ultra'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    const presetOptions = getAudioQualityPreset(preset as any);
                    const newOptions = { ...localOptions, ...presetOptions };
                    setLocalOptions(newOptions);
                    onOptionsChange(newOptions);
                  }}
                  className={`px-3 py-2 rounded text-xs font-medium transition ${
                    localOptions.audioQuality === preset
                      ? preset === 'ultra' 
                        ? 'bg-purple-600 text-white'
                        : 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {localOptions.audioQuality === 'basic' && '🎙️ Basic: Browser processing only'}
              {localOptions.audioQuality === 'balanced' && '⚡ Balanced: AI + Essential processing'}
              {localOptions.audioQuality === 'professional' && '🎯 Professional: Full audio chain'}
              {localOptions.audioQuality === 'ultra' && '🚀 Ultra: Discord-level (Max noise reduction)'}
            </p>
          </div>

          {/* Voice Level Meter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Voice Level {voiceLevel > 0 && <span className="text-green-400">🎤</span>}
            </label>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
                style={{ width: `${voiceLevel}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 mt-1 block">{Math.round(voiceLevel)}%</span>
          </div>

          {/* Self Monitor (Hear Yourself) */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-white">Kendini Dinle</label>
              <p className="text-xs text-gray-400">Kendi sesini gerçek zamanlı duy (test için)</p>
            </div>
            <button
              onClick={onToggleSelfMonitor}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                isSelfMonitoring ? 'bg-green-600' : 'bg-gray-600'
              }`}
              aria-label="Toggle Self Monitor"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  isSelfMonitoring ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {isSelfMonitoring && (
            <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs text-yellow-200">
              <strong>⚠️ Uyarı:</strong> Kulaklık kullanmıyorsan feedback (geri besleme) oluşabilir. Test tamamlandıktan sonra kapat.
            </div>
          )}

          {/* AI Noise Suppression */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-white">AI Noise Suppression (RNNoise)</label>
              <p className="text-xs text-gray-400">Advanced noise reduction</p>
            </div>
            <button
              onClick={() => handleChange('useRNNoise', !localOptions.useRNNoise)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                localOptions.useRNNoise ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              aria-label="Toggle RNNoise"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  localOptions.useRNNoise ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* VAD */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-white">Voice Activity Detection</label>
              <p className="text-xs text-gray-400">Auto-mute when not speaking</p>
            </div>
            <button
              onClick={() => handleChange('vadEnabled', !localOptions.vadEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                localOptions.vadEnabled ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              aria-label="Toggle VAD"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  localOptions.vadEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* VAD Threshold */}
          {localOptions.vadEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                VAD Sensitivity: {localOptions.vadThreshold || 40}
              </label>
              <input
                type="range"
                min="5"
                max="100"
                value={localOptions.vadThreshold || 40}
                onChange={(e) => handleChange('vadThreshold', Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>More Sensitive (More Noise)</span>
                <span>Less Sensitive (Less Noise)</span>
              </div>
            </div>
          )}

          {/* High-Pass Filter */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-white">High-Pass Filter</label>
              <p className="text-xs text-gray-400">Remove fan/AC noise</p>
            </div>
            <button
              onClick={() => handleChange('highPassFilter', !localOptions.highPassFilter)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                localOptions.highPassFilter ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              aria-label="Toggle High-Pass Filter"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  localOptions.highPassFilter ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Browser Audio Processing (when RNNoise is off) */}
          {!localOptions.useRNNoise && (
            <>
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-white mb-3">Browser Audio Processing</h3>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">Echo Cancellation</label>
                <button
                  onClick={() => handleChange('echoCancellation', !localOptions.echoCancellation)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    localOptions.echoCancellation ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  aria-label="Toggle Echo Cancellation"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      localOptions.echoCancellation ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">Noise Suppression</label>
                <button
                  onClick={() => handleChange('noiseSuppression', !localOptions.noiseSuppression)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    localOptions.noiseSuppression ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  aria-label="Toggle Noise Suppression"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      localOptions.noiseSuppression ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">Auto Gain Control</label>
                <button
                  onClick={() => handleChange('autoGainControl', !localOptions.autoGainControl)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    localOptions.autoGainControl ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  aria-label="Toggle Auto Gain Control"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      localOptions.autoGainControl ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 space-y-2">
          <div className="p-3 bg-blue-900/30 border border-blue-700/50 rounded text-xs text-blue-200">
            <strong>💡 Best Quality:</strong> RNNoise ON + VAD ON + High-Pass Filter ON
          </div>
          <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs text-yellow-200">
            <strong>⚠️ Noise/Crackling?</strong> Increase VAD Sensitivity slider (move right) to reduce noise gate triggers
          </div>
        </div>
      </div>
    </div>
  );
};
