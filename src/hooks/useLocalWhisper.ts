'use client';

/**
 * --- useLocalWhisper ---
 * On-device speech recognition. Nothing is sent anywhere.
 *
 * The browser's own SpeechRecognition is easier, but in Chrome it streams the
 * audio to Google. This records locally, runs Whisper in a worker, and
 * discards the audio afterwards. The only network request is the one-time
 * model download, cached by the browser after that.
 *
 * REQUIRES public/aura-whisper-worker.js
 *
 * The trade is honest: roughly 40 MB on first use, a second or two of thinking
 * after each sentence, and it needs a reasonably modern machine. In exchange,
 * a director dictating figures is not sending them to a third party.
 *
 * USAGE
 *   const stt = useLocalWhisper({
 *     enabled: privateMode,
 *     model: 'Xenova/whisper-tiny',
 *     onFinal: (text) => { ... },
 *   });
 *   stt.start();   // begins recording, stops itself on silence
 *   stt.stop();    // stop early
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface LocalWhisperOptions {
  enabled: boolean;
  model?: string;
  language?: string;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
}

// whisper-tiny is multilingual, which matters for a product used in English,
// French, Swahili and Arabic. whisper-base is noticeably better and roughly
// three times the download; swap it here if accuracy matters more than weight.
const DEFAULT_MODEL = 'Xenova/whisper-tiny';

const SILENCE_RMS = 0.012;        // below this counts as room noise
const SILENCE_HOLD_MS = 1300;     // silence after speech before we stop
const MAX_RECORDING_MS = 25000;   // hard ceiling
const MIN_SPEECH_MS = 400;        // ignore a cough or a door

export function useLocalWhisper(opts: LocalWhisperOptions) {
  const { enabled, model = DEFAULT_MODEL, language, onFinal, onError } = opts;

  const [supported, setSupported] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [modelLoading, setModelLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const vadTimerRef = useRef<any>(null);
  const hardStopRef = useRef<any>(null);
  const spokeRef = useRef(false);

  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSupported(
      typeof Worker !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined',
    );
  }, []);

  /** Spins up the worker and downloads the model. Safe to call repeatedly. */
  const warmUp = useCallback(() => {
    if (!enabled || !supported || workerRef.current) return;

    try {
      const worker = new Worker('/aura-whisper-worker.js', { type: 'module' });

      worker.onmessage = (e: MessageEvent) => {
        const d = e.data || {};
        if (d.type === 'progress') {
          setModelLoading(true);
          setLoadingPercent(d.percent ?? 0);
        } else if (d.type === 'ready') {
          setModelLoading(false);
          setLoadingPercent(100);
          setReady(true);
        } else if (d.type === 'result') {
          setThinking(false);
          const text = String(d.text ?? '').trim();
          // Whisper emits these for silence or noise. Sending them as a
          // question would have Aura answer a sound.
          const junk = /^(\[.*\]|\(.*\)|you|thank you\.?|thanks\.?|\.|,)$/i;
          if (text && !junk.test(text)) onFinalRef.current?.(text);
        } else if (d.type === 'error') {
          setThinking(false);
          setModelLoading(false);
          onErrorRef.current?.(d.message || 'Speech recognition failed.');
        }
      };

      worker.onerror = () => {
        setModelLoading(false);
        onErrorRef.current?.('The speech worker could not start. Check that public/aura-whisper-worker.js exists.');
      };

      workerRef.current = worker;
      setModelLoading(true);
      worker.postMessage({ type: 'load', model });
    } catch (e) {
      onErrorRef.current?.((e as Error).message);
    }
  }, [enabled, supported, model]);

  useEffect(() => {
    if (enabled) warmUp();
  }, [enabled, warmUp]);

  const cleanupCapture = useCallback(() => {
    clearTimeout(vadTimerRef.current);
    clearTimeout(hardStopRef.current);
    try { recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop(); } catch (e) { /* already stopped */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch (e) { /* already released */ }
    try { audioCtxRef.current?.close(); } catch (e) { /* already closed */ }
    recorderRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
  }, []);

  /** Decodes to 16 kHz mono float, which is the only shape Whisper accepts. */
  const toWhisperAudio = useCallback(async (blob: Blob): Promise<Float32Array> => {
    const buf = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const decoded = await ctx.decodeAudioData(buf);
    await ctx.close();

    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  }, []);

  const stop = useCallback(() => {
    clearTimeout(vadTimerRef.current);
    clearTimeout(hardStopRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch (e) { /* already stopping */ }
    }
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    if (!enabled || !supported || listening) return;
    if (!workerRef.current) warmUp();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      spokeRef.current = false;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        cleanupCapture();
        setListening(false);

        if (!spokeRef.current || blob.size < 2000) return;   // nothing said

        try {
          setThinking(true);
          const audio = await toWhisperAudio(blob);
          workerRef.current?.postMessage({ type: 'transcribe', audio, language }, [audio.buffer]);
        } catch (e) {
          setThinking(false);
          onErrorRef.current?.(`Could not process the recording: ${(e as Error).message}`);
        }
      };

      // Voice activity detection. Without it the director has to press stop
      // after every sentence, which is not a conversation.
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      let lastLoudAt = Date.now();
      const startedAt = Date.now();

      const poll = () => {
        if (!audioCtxRef.current) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);

        if (rms > SILENCE_RMS) {
          lastLoudAt = Date.now();
          if (Date.now() - startedAt > MIN_SPEECH_MS) spokeRef.current = true;
        }

        if (spokeRef.current && Date.now() - lastLoudAt > SILENCE_HOLD_MS) {
          stop();
          return;
        }
        vadTimerRef.current = setTimeout(poll, 120);
      };
      poll();

      hardStopRef.current = setTimeout(stop, MAX_RECORDING_MS);

      recorder.start();
      setListening(true);

    } catch (e) {
      cleanupCapture();
      setListening(false);
      const msg = (e as Error).name === 'NotAllowedError'
        ? 'Microphone access was blocked. Allow it in the address bar and try again.'
        : (e as Error).message;
      onErrorRef.current?.(msg);
    }
  }, [enabled, supported, listening, warmUp, toWhisperAudio, cleanupCapture, stop, language]);

  useEffect(() => () => {
    cleanupCapture();
    try { workerRef.current?.terminate(); } catch (e) { /* already gone */ }
    workerRef.current = null;
  }, [cleanupCapture]);

  return { supported, ready, modelLoading, loadingPercent, listening, thinking, start, stop, warmUp };
}

export default useLocalWhisper;