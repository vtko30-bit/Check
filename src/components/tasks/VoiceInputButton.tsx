'use client';

import { useEffect } from 'react';
import { Mic } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInputButton({
  onTranscription,
  disabled = false,
  className,
}: VoiceInputButtonProps) {
  const { isSupported, isListening, error, toggle, clearError } = useSpeechRecognition({
    onTranscription,
  });

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleClick = () => {
    if (!isSupported) {
      toast.error('Dictado no disponible en este navegador. Usa Chrome o Edge.');
      return;
    }
    toggle();
  };

  return (
    <Button
      type="button"
      variant={isListening ? 'destructive' : 'outline'}
      size="icon"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'shrink-0',
        isListening && 'animate-pulse',
        className
      )}
      aria-label={isListening ? 'Detener dictado' : 'Dictar por voz'}
      aria-pressed={isListening}
      title={isListening ? 'Detener dictado' : 'Dictar por voz'}
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
