'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

export function SendReportButton() {
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cron');
      const data = await res.json();
      if (data.success && data.previewUrl) {
          window.open(data.previewUrl, '_blank');
      } else {
        alert('Error enviando el reporte');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleSend} disabled={loading} variant="outline" size="sm" className="gap-2">
      <Send className="w-4 h-4" />
      {loading ? 'Enviando...' : 'Enviar Reporte'}
    </Button>
  );
}
