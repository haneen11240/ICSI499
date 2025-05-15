/**
 * Ora: AI Technical Consultant for Google Meet
 * 
 * File: vite.config.js
 * Purpose: Vite bundler configuration.
 * 
 * Description:
 * Specifies how popup.js and background.js are compiled into CSP-compliant extension bundles.
 * 
 * Authors:
 * - Enea Zguro
 * - Ilyas Tahari
 * - Elissa Jagroop
 * - Haneen Qasem
 * 
 * Institution: SUNY University at Albany  
 * Course: ICSI499 Capstone Project, Spring 2025  
 * Instructor: Dr. Pradeep Atrey
 */

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'popup.js',
        background: 'background.js'
      },
      output: {
        entryFileNames: '[name].bundle.js'
      }
    }
  }
});