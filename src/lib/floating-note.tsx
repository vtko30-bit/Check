'use client';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Task } from '@/types';
import { StickyNote } from '@/components/tasks/StickyNote';

export async function launchFloatingNote(task: Task) {
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

    // Setup the body for the floating note to match the main app
    pip.document.body.className = document.body.className;
    pip.document.body.style.background = "transparent";
    pip.document.body.style.margin = "0";
    pip.document.body.style.display = "flex";
    pip.document.body.style.justifyContent = "center";
    pip.document.body.style.alignItems = "center";
    pip.document.body.style.height = "100vh";
    pip.document.body.style.overflow = "hidden";

    // Create a container for the React app
    const container = pip.document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    pip.document.body.appendChild(container);

    // Create a React root and render the note
    const root = createRoot(container);
    root.render(
      <StickyNote task={task} isFloatingWindow />
    );

    // Ensure the root is unmounted when the window is closed
    pip.addEventListener('pagehide', () => {
      root.unmount();
    });

    return pip;
  } catch (err) {
    console.error("Failed to open PiP window:", err);
  }
}
