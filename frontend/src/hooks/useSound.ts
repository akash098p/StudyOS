import * as React from 'react'

const SOUND_STORAGE_KEY = 'studyos.soundEnabled'

type SoundType = 'success' | 'warning' | 'error'

function playTone(type: SoundType, enabled: boolean): void {
  if (!enabled) return
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.connect(gain)
    gain.connect(context.destination)

    if (type === 'success') {
      ;[523, 659, 784].forEach((frequency, index) => {
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.08)
        gain.gain.setValueAtTime(0.0001, now + index * 0.08)
        gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.08 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.15)
      })
      oscillator.start(now)
      oscillator.stop(now + 0.45)
      window.setTimeout(() => void context.close(), 600)
    } else if (type === 'warning') {
      ;[440, 554].forEach((frequency, index) => {
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.12)
        gain.gain.setValueAtTime(0.0001, now + index * 0.12)
        gain.gain.exponentialRampToValueAtTime(0.14, now + index * 0.12 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.18)
      })
      oscillator.start(now)
      oscillator.stop(now + 0.42)
      window.setTimeout(() => void context.close(), 600)
    } else {
      oscillator.frequency.setValueAtTime(180, now)
      oscillator.frequency.exponentialRampToValueAtTime(120, now + 0.25)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
      oscillator.start(now)
      oscillator.stop(now + 0.3)
      window.setTimeout(() => void context.close(), 500)
    }
  } catch {
    /* Audio may be blocked until user interaction. */
  }
}

async function playLongTone(
  enabled: boolean,
  melody: number[],
  peakVolume: number,
  waveform: OscillatorType = 'sine'
): Promise<void> {
  if (!enabled) return
  let context: AudioContext | undefined
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    context = new AudioContextClass()
    if (context.state === 'suspended') await context.resume()
    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const noteDuration = 0.5
    const duration = melody.length * noteDuration

    oscillator.type = waveform
    oscillator.connect(gain)
    gain.connect(context.destination)
    melody.forEach((frequency, index) => {
      const start = now + index * noteDuration
      oscillator.frequency.setValueAtTime(frequency, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.linearRampToValueAtTime(peakVolume, start + 0.04)
      gain.gain.setValueAtTime(peakVolume, start + noteDuration * 0.55)
      gain.gain.linearRampToValueAtTime(0.0001, start + noteDuration * 0.9)
    })
    oscillator.start(now)
    oscillator.stop(now + duration)
    window.setTimeout(() => void context?.close(), (duration + 0.2) * 1000)
  } catch {
    if (context && context.state !== 'closed') await context.close()
  }
}

function playFocusCompleteTone(enabled: boolean): void {
  const alarmPattern = [784, 988, 784, 988, 784, 988, 784, 988, 784, 988]
  void playLongTone(enabled, [...alarmPattern, ...alarmPattern], 0.24, 'triangle')
}

function playTaskReminderTone(enabled: boolean): void {
  const motif = [880, 659, 880, 1046, 880, 659, 784, 988, 784, 659]
  void playLongTone(enabled, [...motif, ...motif], 0.34)
}

function playTaskTimeUpTone(enabled: boolean): void {
  const motif = [784, 784, 659, 784, 880, 880, 698, 880, 988, 988]
  void playLongTone(enabled, [...motif, ...motif], 0.34)
}

export function useSound() {
  const [enabled, setEnabled] = useSoundEnabled()

  function play(type: SoundType): void {
    playTone(type, enabled)
  }

  function toggle(): boolean {
    const next = !enabled
    setEnabled(next)
    return next
  }

  function playFocusComplete(): void {
    playFocusCompleteTone(enabled)
  }

  function playTaskReminder(): void {
    playTaskReminderTone(enabled)
  }

  function playTaskTimeUp(): void {
    playTaskTimeUpTone(enabled)
  }

  return { enabled, play, playFocusComplete, playTaskReminder, playTaskTimeUp, toggle }
}

function useSoundEnabled(): [boolean, (next: boolean) => void] {
  const [value, setValue] = React.useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(SOUND_STORAGE_KEY)
      return raw === null ? true : raw === 'true'
    } catch {
      return true
    }
  })

  React.useEffect(() => {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(value))
    } catch {
      /* localStorage may be unavailable. */
    }
  }, [value])

  return [value, setValue]
}
