import { useCountdown } from '../hooks/useCountdown'

interface CountdownTimerProps {
  targetDate: string
  theme?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  onEnd?: () => void
}

/** 优雅的数字单位块 */
function Unit({ value, label, theme, size }: {
  value: number
  label: string
  theme: 'dark' | 'light'
  size: 'sm' | 'md' | 'lg'
}) {
  const str = String(value).padStart(2, '0')
  const sizeMap = {
    sm: { num: 'text-[22px] leading-none', lbl: 'text-[10px] mt-1' },
    md: { num: 'text-[36px] leading-none', lbl: 'text-[11px] mt-1.5' },
    lg: { num: 'text-[56px] leading-none', lbl: 'text-[13px] mt-2' },
  }
  const { num, lbl } = sizeMap[size]
  const numColor = theme === 'dark' ? 'text-white' : 'text-[#1d1d1f]'
  const lblColor = theme === 'dark' ? 'text-white/50' : 'text-[#86868b]'

  return (
    <div className="flex flex-col items-center min-w-[2ch]">
      <span
        className={`countdown-digit font-semibold tracking-tight tabular-nums ${num} ${numColor}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {str}
      </span>
      <span className={`font-normal ${lbl} ${lblColor}`}>{label}</span>
    </div>
  )
}

function Colon({ theme, size }: { theme: 'dark' | 'light'; size: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'text-[18px] mb-3', md: 'text-[28px] mb-4', lg: 'text-[44px] mb-5' }
  const color = theme === 'dark' ? 'text-white/20' : 'text-[#d2d2d7]'
  return (
    <span className={`font-light tracking-tight leading-none ${sizeMap[size]} ${color}`}>:</span>
  )
}

export function CountdownTimer({
  targetDate,
  theme = 'light',
  size = 'md',
  showLabel = true,
  onEnd,
}: CountdownTimerProps) {
  const { hours, minutes, seconds, days, isEnded } = useCountdown({ targetDate, onEnd })

  if (isEnded) {
    const color = theme === 'dark' ? 'text-white/50' : 'text-[#86868b]'
    return <p className={`text-[15px] ${color}`}>活动已结束</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {showLabel && (
        <p className={`text-[13px] font-normal ${theme === 'dark' ? 'text-white/60' : 'text-[#86868b]'}`}>
          距活动结束
        </p>
      )}
      <div className="flex items-end gap-2">
        {days > 0 && (
          <>
            <Unit value={days} label="天" theme={theme} size={size} />
            <Colon theme={theme} size={size} />
          </>
        )}
        <Unit value={hours} label="时" theme={theme} size={size} />
        <Colon theme={theme} size={size} />
        <Unit value={minutes} label="分" theme={theme} size={size} />
        <Colon theme={theme} size={size} />
        <Unit value={seconds} label="秒" theme={theme} size={size} />
      </div>
    </div>
  )
}

/** 紧凑行内倒计时，用于卡片 */
export function InlineCountdown({ targetDate, theme = 'light' }: { targetDate: string; theme?: 'dark' | 'light' }) {
  const { hours, minutes, seconds, isEnded } = useCountdown({ targetDate })
  if (isEnded) return <span className="text-[#86868b] text-[13px]">已结束</span>

  const color = theme === 'dark' ? 'text-white/70' : 'text-[#6e6e73]'
  return (
    <span className={`text-[13px] tabular-nums countdown-digit ${color}`}>
      {String(hours).padStart(2,'0')}:{String(minutes).padStart(2,'0')}:{String(seconds).padStart(2,'0')}
    </span>
  )
}
