'use client';

import { useEffect } from 'react';

export default function LanguageOrchestrator() {
  useEffect(() => {
    // 1. Initialize the Google Translate technical handshake
    const addScript = document.createElement('script');
    addScript.setAttribute('src', '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit');
    document.body.appendChild(addScript);

    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement({
        pageLanguage: 'en',
        autoDisplay: false,
      }, 'google_translate_element');
    };

    /**
     * 2. THE PROFESSIONAL SHIELD
     * This CSS ensures that the translation happens silently and the site stays high-end.
     * It hides the Google logo, the top toolbar, and the "Original Text" popups.
     */
    const style = document.createElement('style');
    style.innerHTML = `
      /* Hide the main Google Translate toolbar */
      .goog-te-banner-frame.skiptranslate, 
      .goog-te-gadget-icon, 
      .goog-te-menu-value span:nth-child(2),
      .goog-te-banner-frame { 
        display: none !important; 
      }
      
      /* Reset body position to prevent the gap at the top */
      body { 
        top: 0px !important; 
      }
      
      /* Hide the hover text suggestions/popups */
      #goog-gt-tt, .goog-te-balloon-frame { 
        display: none !important; 
      }
      .goog-text-highlight { 
        background: none !important; 
        box-shadow: none !important; 
      }

      /* Hide the widget completely */
      #google_translate_element { 
        display: none !important; 
      }

      /* Hide the mobile overlay bar */
      .VIpgJd-Zvi9f-ORoYce-sm_Z09e { 
        display: none !important; 
      }
    `;
    document.head.appendChild(style);
  }, []);

  // The hidden anchor that the engine attaches to
  return <div id="google_translate_element" style={{ display: 'none' }} />;
}