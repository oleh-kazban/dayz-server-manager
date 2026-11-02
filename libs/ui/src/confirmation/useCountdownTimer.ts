import { useEffect, useState } from 'react';

export interface UseCountdownTimerReturn {
  remainingTime: number;
  isCountingDown: boolean;
}

export function useCountdownTimer(timerValue: number = 0): UseCountdownTimerReturn {
  const [prevTimerValue, setPrevTimerValue] = useState(timerValue);
  const [remainingTime, setRemainingTime] = useState(timerValue);

  if (timerValue !== prevTimerValue) {
    setPrevTimerValue(timerValue);
    setRemainingTime(timerValue);
  }

  useEffect(() => {
    if (timerValue <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerValue]);

  return {
    remainingTime,
    isCountingDown: remainingTime > 0,
  };
}
