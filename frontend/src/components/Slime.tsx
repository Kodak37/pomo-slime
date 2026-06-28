interface SlimeData {
  name: string
  hunger: number
  coins: number
  pomodoroCount: number
  status: 'happy' | 'normal' | 'hungry' | 'dying'
}

interface Props {
  slime: SlimeData
}

const SLIME_EMOJI: Record<string, string> = {
  happy:  '🟢',
  normal: '🟡',
  hungry: '🟠',
  dying:  '🔴',
}

const STATUS_TEXT: Record<string, string> = {
  happy:  'とっても元気！',
  normal: 'ふつう',
  hungry: 'おなかすいた…',
  dying:  'もうダメかも…',
}

const STATUS_COLOR: Record<string, string> = {
  happy:  'text-green-400',
  normal: 'text-yellow-400',
  hungry: 'text-orange-400',
  dying:  'text-red-400',
}

export function Slime({ slime }: Props) {
  const emoji = SLIME_EMOJI[slime.status] ?? '🟢'
  const statusText = STATUS_TEXT[slime.status] ?? ''
  const statusColor = STATUS_COLOR[slime.status] ?? 'text-green-400'
  const hungerColor = slime.hunger >= 70 ? 'bg-green-500'
    : slime.hunger >= 40 ? 'bg-yellow-500'
    : slime.hunger >= 15 ? 'bg-orange-500'
    : 'bg-red-500'

  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-gray-800 rounded-2xl shadow-xl">
      <div className="text-lg font-bold text-white">{slime.name}</div>

      {/* スライム本体 */}
      <div
        className="text-9xl select-none"
        style={{
          animation: slime.status === 'dying'
            ? 'pulse 1s infinite'
            : slime.status === 'happy'
            ? 'bounce 1s infinite'
            : 'none',
          filter: slime.status === 'dying' ? 'grayscale(0.6)' : 'none',
          transition: 'all 0.5s',
        }}
      >
        {emoji}
      </div>

      {/* ステータステキスト */}
      <div className={`text-sm font-bold ${statusColor}`}>{statusText}</div>

      {/* 空腹度バー */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>空腹度</span>
          <span>{slime.hunger}/100</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${hungerColor}`}
            style={{ width: `${slime.hunger}%` }}
          />
        </div>
      </div>

      {/* コイン */}
      <div className="flex items-center gap-2 text-yellow-400 font-bold text-xl">
        <span>🪙</span>
        <span>{slime.coins} コイン</span>
      </div>
    </div>
  )
}
