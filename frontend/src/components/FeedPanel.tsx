interface Props {
  coins: number
  onFeed: (cost: number) => void
}

const FOODS = [
  { name: 'きのこ',   emoji: '🍄', cost: 5,  desc: '空腹度+10' },
  { name: 'おにぎり', emoji: '🍙', cost: 15, desc: '空腹度+30' },
  { name: 'ステーキ', emoji: '🥩', cost: 30, desc: '空腹度+60' },
]

export function FeedPanel({ coins, onFeed }: Props) {
  return (
    <div className="p-6 bg-gray-800 rounded-2xl shadow-xl">
      <h2 className="text-white font-bold text-lg mb-4">🍽 えさをあげる</h2>
      <div className="flex flex-col gap-3">
        {FOODS.map(food => (
          <button
            key={food.name}
            onClick={() => onFeed(food.cost)}
            disabled={coins < food.cost}
            className="flex items-center justify-between px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{food.emoji}</span>
              <div className="text-left">
                <div className="text-white font-bold">{food.name}</div>
                <div className="text-gray-400 text-xs">{food.desc}</div>
              </div>
            </div>
            <div className="text-yellow-400 font-bold text-sm">
              🪙 {food.cost}
            </div>
          </button>
        ))}
      </div>
      <p className="text-gray-500 text-xs mt-3 text-center">
        所持コイン: {coins}
      </p>
    </div>
  )
}
