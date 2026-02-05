'use client';

import React, { useMemo } from 'react';
import { Task } from '@/types';
import { toggleTaskPin, updateTaskStatus } from '@/actions/tasks';
import { createPortal } from 'react-dom';
import { NoteUI } from './NoteUI';

interface StickyNoteProps {
  task: Task;
  isFloatingWindow?: boolean;
}

const colors = [
  'bg-yellow-200 border-yellow-300 text-yellow-900',
  'bg-blue-200 border-blue-300 text-blue-900',
  'bg-green-200 border-green-300 text-green-900',
  'bg-pink-200 border-pink-300 text-pink-900',
  'bg-purple-200 border-purple-300 text-purple-900',
];

export function StickyNote({ task, isFloatingWindow = false }: StickyNoteProps) {
  const [pipWindow, setPipWindow] = React.useState<Window | null>(null);

  // Use task.id to get a stable random color and rotation
  const idHash = task.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorClass = colors[idHash % colors.length];
  
  // Random rotation between -3 and 3 degrees
  const rotation = useMemo(() => {
    return (idHash % 7) - 3;
  }, [idHash]);

  const handleUnpin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleTaskPin(task.id, false);
    if (pipWindow) pipWindow.close();
  };

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const result = await updateTaskStatus(task.id, newStatus);
    if (!result?.success && result?.error) {
      alert(result.error);
    }
  };

  const handleFloat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!('documentPictureInPicture' in globalThis)) {
      alert("Tu navegador no soporta ventanas flotantes (PiP de documentos). Prueba con Chrome o Edge.");
      return;
    }

    try {
      // The Document Picture-in-Picture API is still experimental and not fully typed in standard lib.dom.d.ts.
      // Using 'any' to bypass TypeScript errors for this experimental API.
      const pip = await (globalThis as any).documentPictureInPicture.requestWindow({
        width: 200,
        height: 210,
      });

      // Copy all style elements and links from the main document to the PiP window
      [...document.head.querySelectorAll('style, link[rel="stylesheet"]')].forEach((el) => {
        pip.document.head.appendChild(el.cloneNode(true));
      });

      // Copy font variables specifically if they are in computed style
      const computedBody = globalThis.getComputedStyle(document.body);
      const fontHandwritten = computedBody.getPropertyValue('--font-handwritten');
      if (fontHandwritten) {
        pip.document.body.style.setProperty('--font-handwritten', fontHandwritten);
      }

      // Add font variables to the new body
      pip.document.body.className = document.body.className;
      pip.document.body.style.background = "transparent";
      pip.document.body.style.margin = "0";
      pip.document.body.style.display = "flex";
      pip.document.body.style.justifyContent = "center";
      pip.document.body.style.alignItems = "center";
      pip.document.body.style.height = "100vh";
      pip.document.body.style.overflow = "hidden";

      setPipWindow(pip);

      pip.addEventListener('pagehide', () => {
        setPipWindow(null);
      });
    } catch (err) {
      console.error("Failed to open PiP window:", err);
    }
  };

  const props = {
    task,
    rotation,
    colorClass,
    onUnpin: handleUnpin,
    onToggleStatus: handleToggleStatus,
    onFloat: handleFloat,
  };

  if (isFloatingWindow) {
    return <NoteUI {...props} isFloating />;
  }

  return (
    <>
      <NoteUI {...props} />
      {pipWindow && createPortal(
        <NoteUI {...props} isFloating />, 
        pipWindow.document.body
      )}
    </>
  );
}
