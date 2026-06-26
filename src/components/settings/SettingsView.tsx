'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { removeBranding, updateBranding } from '@/actions/branding';
import { cn } from '@/lib/utils';

interface SettingsViewProps {
  currentLogo: string | null;
}

const MAX_FILE_SIZE = 400 * 1024;
const VALID_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml']);
const VALID_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.svg']);

function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : '';
}

function validateLogoFile(file: File): string | null {
  const extension = getFileExtension(file.name);
  const isValidType =
    VALID_MIME_TYPES.has(file.type) ||
    VALID_EXTENSIONS.has(extension);

  if (!isValidType) {
    return 'Formato no válido. Solo se permiten archivos PNG, SVG o JPG.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'La imagen supera el límite de 400KB. Usa una imagen más pequeña o compáctala.';
  }

  return null;
}

export function SettingsView({ currentLogo }: SettingsViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [baselineLogo, setBaselineLogo] = useState<string | null>(currentLogo);
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogo);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setBaselineLogo(currentLogo);
    setLogoPreview(currentLogo);
    setSelectedFileName(null);
    setFileError(null);
  }, [currentLogo]);

  const hasActiveImage = Boolean(logoPreview);
  const hasChanges = logoPreview !== baselineLogo && !fileError;
  const canSave = hasChanges && !loading;

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setStatus('idle');
    setErrorMessage(null);

    if (!file) return;

    const validationError = validateLogoFile(file);
    if (validationError) {
      setFileError(validationError);
      setSelectedFileName(null);
      resetFileInput();
      return;
    }

    setFileError(null);
    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setLogoPreview(null);
    setSelectedFileName(null);
    setFileError(null);
    setStatus('idle');
    setErrorMessage(null);
    resetFileInput();
  };

  const handleSave = async () => {
    if (!canSave) return;

    setLoading(true);
    setStatus('idle');
    setErrorMessage(null);

    try {
      const result = logoPreview
        ? await updateBranding(logoPreview)
        : await removeBranding();

      if (result.success) {
        setBaselineLogo(logoPreview);
        setSelectedFileName(null);
        setStatus('success');
        router.refresh();
      } else {
        setStatus('error');
        setErrorMessage(result.error ?? 'Error al guardar.');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      const msg = error instanceof Error ? error.message : 'Error inesperado. Intenta de nuevo.';
      setErrorMessage(
        msg.includes('Payload') || msg.includes('body') || msg.includes('size')
          ? 'La imagen es demasiado grande. Usa una imagen más pequeña (< 400KB).'
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Logotipo de la Empresa</h2>
        <p className="text-sm text-slate-500 mb-6">
          Esta imagen se usará en el Sidebar, la pantalla de Login y el menú móvil.
        </p>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-48 h-48 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center relative overflow-hidden shrink-0">
            {logoPreview ? (
              <div className="relative w-full h-full p-4">
                <Image src={logoPreview} alt="Vista previa del logo" fill className="object-contain" />
              </div>
            ) : (
              <div className="text-center p-4">
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Subir Logo
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4 min-w-0">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectClick}
                  disabled={loading}
                >
                  {hasActiveImage ? 'Cambiar imagen' : 'Seleccionar archivo'}
                </Button>
                {hasActiveImage && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleRemove}
                    disabled={loading}
                  >
                    Eliminar
                  </Button>
                )}
              </div>

              {!hasActiveImage && (
                <p className="text-sm text-slate-500">Ningún archivo seleccionado</p>
              )}

              {selectedFileName && hasActiveImage && (
                <p className="text-sm text-slate-600 truncate">{selectedFileName}</p>
              )}

              {fileError && (
                <p className="text-sm text-red-600" role="alert">
                  {fileError}
                </p>
              )}

              <ul className="text-sm text-slate-400 space-y-0.5 list-disc pl-4 pt-1">
                <li>Formato PNG, SVG o JPG.</li>
                <li>Fondo transparente preferiblemente.</li>
                <li>Tamaño máximo de 400KB (la imagen se guarda en la base de datos).</li>
                <li>Relación de aspecto rectangular o cuadrada.</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={cn(
                  canSave
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-slate-200 text-slate-400 hover:bg-slate-200 cursor-not-allowed opacity-100'
                )}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Guardando cambios...
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
                <div className="flex items-center gap-2 text-red-600 font-bold text-sm" role="alert">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {errorMessage}
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
