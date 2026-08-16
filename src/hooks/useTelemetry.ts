import { useEffect, useRef, useState } from 'react';
import { registerPlugin } from '@capacitor/core';

const CapivaraEngine = registerPlugin<any>('CapivaraEngine');

import { Device } from '@capacitor/device';

export function useTelemetry() {
  const fpsRef = useRef<HTMLSpanElement>(null);
  const batteryRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [showHUD, setShowHUD] = useState(true);

  useEffect(() => {
    // 1. Engine FPS & CPU Telemetry
    const telemetryListener = CapivaraEngine.addListener('onTelemetry', (data: any) => {
      if (fpsRef.current && data) {
        fpsRef.current.innerText = `FPS: ${data.fps?.toFixed(1) || '0.0'}`;
      }
    });

    const logListener = CapivaraEngine.addListener('onLogLine', (data: any) => {
      if (data.log) {
        setLogs(prev => {
          const newLogs = [...prev, data.log];
          if (newLogs.length > 200) newLogs.shift();
          return newLogs;
        });
      }
    });

    // 2. Browser/Device Battery API
    const updateBattery = async () => {
      try {
        const info = await Device.getBatteryInfo();
        if (batteryRef.current && info.batteryLevel !== undefined) {
          const level = Math.round(info.batteryLevel * 100);
          batteryRef.current.innerText = `🔋 ${level}%`;
        }
      } catch (e) {
        if (batteryRef.current) batteryRef.current.innerText = '🔋 ---%';
      }
    };
    updateBattery();

    // 3. Clock Timer
    const updateClock = () => {
      if (timeRef.current) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timeRef.current.innerText = `⏱️ ${timeStr}`;
      }
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 60000);

    return () => {
      telemetryListener.then((l: any) => l.remove());
      logListener.then((l: any) => l.remove());
      CapivaraEngine.stopLogStream().catch(console.error);
      clearInterval(clockInterval);
    };
  }, []);

  return {
    fpsRef,
    batteryRef,
    timeRef,
    logs,
    logsEndRef,
    showHUD,
    setShowHUD
  };
}
