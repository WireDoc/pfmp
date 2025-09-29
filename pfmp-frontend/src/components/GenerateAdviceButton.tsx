import React, { useState } from 'react';
import { adviceService } from '../services/api';

interface GenerateAdviceButtonProps {
  userId: number;
  onGenerated?: () => void; // callback to refresh list
}

const GenerateAdviceButton: React.FC<GenerateAdviceButtonProps> = ({ userId, onGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      await adviceService.generate(userId);
      onGenerated?.();
    } catch (e) {
      setError('Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <button onClick={handleGenerate} disabled={loading || !userId} style={{ padding: '0.5rem 1rem' }}>
        {loading ? 'Generating…' : 'Generate Advice'}
      </button>
      {error && <span style={{ color: 'red', fontSize: '0.75rem' }}>{error}</span>}
    </div>
  );
};

export default GenerateAdviceButton;
