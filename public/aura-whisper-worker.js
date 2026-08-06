/* public/aura-whisper-worker.js
 * ---------------------------------------------------------------------------
 * Speech recognition that never leaves the device.
 *
 * Chrome's built-in SpeechRecognition streams audio to Google. For a director
 * dictating "what is our outstanding balance", that sentence goes to a third
 * party. This runs OpenAI's Whisper model inside the browser via WebAssembly
 * instead: the audio is transcribed on the machine it was spoken on, and no
 * request leaves except the one-time model download.
 *
 * It runs in a worker because transcription blocks its thread for a second or
 * two. On the main thread that freezes the whole chat window mid-sentence.
 *
 * The model is fetched from the jsDelivr CDN on first use and then cached by
 * the browser, so the download happens once per device rather than per visit.
 * --------------------------------------------------------------------------- */

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// No local model server — everything comes from the CDN and browser cache.
env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber = null;
let loadedModel = null;

self.onmessage = async (event) => {
  const { type, model, audio, language } = event.data || {};

  try {
    if (type === 'load') {
      if (transcriber && loadedModel === model) {
        self.postMessage({ type: 'ready', model });
        return;
      }

      transcriber = await pipeline('automatic-speech-recognition', model, {
        // Quantised weights: roughly a quarter the size, and the accuracy
        // difference on clear speech is not worth three times the download.
        quantized: true,
        progress_callback: (p) => {
          if (p && p.status === 'progress' && p.total) {
            self.postMessage({
              type: 'progress',
              file: p.file,
              loaded: p.loaded,
              total: p.total,
              percent: Math.round((p.loaded / p.total) * 100),
            });
          }
        },
      });

      loadedModel = model;
      self.postMessage({ type: 'ready', model });
      return;
    }

    if (type === 'transcribe') {
      if (!transcriber) throw new Error('The speech model has not finished loading.');

      const output = await transcriber(audio, {
        // Undefined lets Whisper detect the language itself, which matters for
        // a product used in English, French, Swahili and Arabic.
        language: language || undefined,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      self.postMessage({ type: 'result', text: String(output?.text ?? '').trim() });
      return;
    }

    if (type === 'unload') {
      transcriber = null;
      loadedModel = null;
      self.postMessage({ type: 'unloaded' });
      return;
    }

  } catch (error) {
    self.postMessage({ type: 'error', message: String(error?.message ?? error) });
  }
};