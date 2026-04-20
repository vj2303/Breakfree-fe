'use client';

import React, { useState, useEffect, useRef } from 'react';

interface TimerProps {
  totalMinutes: number; // Total time in minutes (readTime + exerciseTime)
  activityId: string;
  onTimeUp?: () => void;
  disablePause?: boolean; // If true, hide pause/resume control and always run timer
  /** When true, pausing shows a full-screen overlay so the participant cannot interact with the page until they resume */
  blockPageWhenPaused?: boolean;
}

const Timer: React.FC<TimerProps> = ({
  totalMinutes,
  activityId,
  onTimeUp,
  disablePause = false,
  blockPageWhenPaused = false,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  const storageKey = `timer_${activityId}`;

  useEffect(() => {
    // Load saved timer state from localStorage
    const savedState = localStorage.getItem(storageKey);

    // If pause is disabled for this activity/page, always start fresh and never allow resuming a paused state.
    if (disablePause) {
      localStorage.removeItem(storageKey);
    }

    if (savedState) {
      try {
        const { remaining: savedRemaining, pausedTime, startTime } = JSON.parse(savedState);
        const now = Date.now();
        
        if (disablePause) {
          const totalSeconds = totalMinutes * 60;
          setTimeRemaining(totalSeconds);
          setIsPaused(false);
          setIsExpired(false);
          startTimeRef.current = Date.now();
        } else if (startTime && !pausedTime) {
          // Timer was running, calculate remaining time
          const elapsed = Math.floor((now - startTime) / 1000);
          const remaining = Math.max(0, savedRemaining - elapsed);
          setTimeRemaining(remaining);
          startTimeRef.current = now;
        } else {
          // Timer was paused or not started
          setTimeRemaining(savedRemaining);
          pausedTimeRef.current = pausedTime;
          setIsPaused(pausedTime > 0);
          if (savedRemaining > 0) {
            startTimeRef.current = now;
          }
        }
      } catch {
        // Invalid saved state, start fresh
        const totalSeconds = totalMinutes * 60;
        setTimeRemaining(totalSeconds);
        startTimeRef.current = Date.now();
      }
    } else {
      // No saved state, start fresh
      const totalSeconds = totalMinutes * 60;
      setTimeRemaining(totalSeconds);
      startTimeRef.current = Date.now();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [totalMinutes, activityId, storageKey, disablePause]);

  useEffect(() => {
    if (isPaused || isExpired || timeRemaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Save state to localStorage
    const saveState = () => {
      localStorage.setItem(storageKey, JSON.stringify({
        remaining: timeRemaining,
        pausedTime: isPaused ? Date.now() : 0,
        startTime: startTimeRef.current
      }));
    };

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          if (onTimeUp) {
            onTimeUp();
          }
          localStorage.removeItem(storageKey);
          return 0;
        }
        const newTime = prev - 1;
        saveState();
        return newTime;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, isExpired, timeRemaining, storageKey, onTimeUp]);

  const showPauseOverlay =
    blockPageWhenPaused && !disablePause && isPaused && !isExpired;

  useEffect(() => {
    if (!showPauseOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showPauseOverlay]);

  const togglePause = () => {
    if (disablePause) return;
    if (isExpired) return;
    
    setIsPaused((prev) => {
      const newPaused = !prev;
      if (newPaused) {
        pausedTimeRef.current = Date.now();
      } else {
        // Resuming - adjust start time
        if (pausedTimeRef.current > 0) {
          const pauseDuration = Date.now() - pausedTimeRef.current;
          if (startTimeRef.current) {
            startTimeRef.current += pauseDuration;
          }
          pausedTimeRef.current = 0;
        }
      }
      return newPaused;
    });
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSeconds = totalMinutes * 60;
  const progress = totalSeconds > 0 ? (timeRemaining / totalSeconds) * 100 : 0;
  const isWarning = timeRemaining <= 300 && timeRemaining > 0; // 5 minutes
  const isCritical = timeRemaining <= 60 && timeRemaining > 0; // 1 minute

  return (
    <>
      {showPauseOverlay && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/95 p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="timer-paused-title"
        >
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-lg">
            <h2 id="timer-paused-title" className="text-lg font-semibold text-gray-900">
              Timer paused
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your activity is paused. You cannot continue until you resume the timer.
            </p>
            <div className="my-6 text-3xl font-bold tabular-nums text-gray-900">
              {formatTime(timeRemaining)}
            </div>
            <button
              type="button"
              onClick={togglePause}
              className="inline-flex items-center justify-center rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Resume
            </button>
          </div>
        </div>
      )}
    <div className={`fixed top-3 right-3 z-50 bg-white rounded shadow border p-3 min-w-[180px] ${
      isExpired ? 'border-red-500 bg-red-50' :
      isCritical ? 'border-red-500 bg-red-50 animate-pulse' :
      isWarning ? 'border-orange-500 bg-orange-50' :
      'border-gray-300'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium text-gray-700">Time Remaining</span>
        </div>
        {!isExpired && (
          !disablePause && (
            <button
              onClick={togglePause}
              className="text-gray-600 hover:text-black transition-colors"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              )}
            </button>
          )
        )}
      </div>
      
      <div className="text-center mb-1.5">
        <div className={`text-2xl font-bold ${
          isExpired ? 'text-red-600' :
          isCritical ? 'text-red-600' :
          isWarning ? 'text-orange-600' :
          'text-black'
        }`}>
          {isExpired ? '00:00' : formatTime(timeRemaining)}
        </div>
        {isExpired && (
          <p className="text-xs text-red-600 font-medium mt-0.5">Time&apos;s Up!</p>
        )}
        {isCritical && !isExpired && (
          <p className="text-xs text-red-600 font-medium mt-0.5">Less than 1 minute left!</p>
        )}
        {isWarning && !isCritical && !isExpired && (
          <p className="text-xs text-orange-600 font-medium mt-0.5">Less than 5 minutes left!</p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-1000 ${
            isExpired ? 'bg-red-500' :
            isCritical ? 'bg-red-500' :
            isWarning ? 'bg-orange-500' :
            'bg-gray-800'
          }`}
          style={{ width: `${Math.max(0, progress)}%` }}
        />
      </div>

      <div className="text-xs text-gray-600 text-center">
        {Math.round(progress)}% remaining
      </div>
    </div>
    </>
  );
};

export default Timer;

