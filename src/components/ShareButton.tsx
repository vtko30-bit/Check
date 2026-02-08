'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareButtonProps {
  compact?: boolean;
}

export function ShareButton({ compact }: ShareButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    const url = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://check-one-omega.vercel.app';
    const shareData = {
      title: 'Check',
      text: 'App de gestión de tareas',
      url,
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        toast.success('Enlace compartido');
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Enlace copiado al portapapeles');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url);
          toast.success('Enlace copiado al portapapeles');
        } catch {
          toast.error('No se pudo compartir');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "sm"}
      onClick={handleShare}
      disabled={loading}
      className={compact ? "text-slate-600 hover:text-primary" : "w-full justify-start gap-2 text-slate-600 hover:text-primary hover:bg-primary/5"}
    >
      <Share2 className="w-4 h-4 shrink-0" />
      {!compact && <span>Compartir app</span>}
    </Button>
  );
}
