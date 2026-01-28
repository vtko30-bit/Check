'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { updateBranding } from '@/actions/branding';

interface SettingsViewProps {
  currentLogo: string | null;
}

export function SettingsView({ currentLogo }: SettingsViewProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogo);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
       alert('Por favor selecciona un archivo de imagen.');
       return;
    }

    // Validate size (limit to 1MB for Base64 storage)
    if (file.size > 1024 * 1024) {
      alert('La imagen es demasiado grande. El límite es 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
      setStatus('idle');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!logoPreview) return;

    setLoading(true);
    setStatus('idle');
    try {
      const result = await updateBranding(logoPreview);
      if (result.success) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Logotipo de la Empresa</h2>
        <p className="text-sm text-slate-500 mb-6">Esta imagen se usará en el Sidebar, la pantalla de Login y el menú móvil.</p>
        
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-48 h-48 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center relative overflow-hidden group">
            {logoPreview ? (
              <div className="relative w-full h-full p-4">
                <Image src={logoPreview} alt="Logo Preview" fill className="object-contain" />
              </div>
            ) : (
              <div className="text-center p-4">
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subir Logo</span>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleFileChange}
              disabled={loading}
            />
          </div>

          <div className="flex-1 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <h3 className="text-sm font-bold text-slate-700 mb-2">Recomendaciones:</h3>
              <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-4">
                <li>Formato PNG, SVG o JPG.</li>
                <li>Fondo transparente preferiblemente.</li>
                <li>Tamaño máximo de 1MB (optimizado).</li>
                <li>Relación de aspecto rectangular o cuadrada.</li>
              </ul>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                onClick={handleSave} 
                disabled={loading || !logoPreview || logoPreview === currentLogo}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
              
              {status === 'success' && (
                <div className="flex items-center gap-2 text-green-600 font-bold text-sm animate-in fade-in slide-in-from-left-2">
                  <CheckCircle2 className="w-5 h-5" />
                  ¡Guardado correctamente!
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                  <AlertCircle className="w-5 h-5" />
                  Error al guardar.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Otras Configuraciones</h2>
        <p className="text-sm text-slate-500 mb-4 italic">Más opciones próximamente...</p>
      </div>
    </div>
  );
}
