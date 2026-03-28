export function DeathSaveTracker({ deathSaves, onUpdate, onNat20, onNat1, isPC }) {
  if (!deathSaves) return null

  const { successes, failures } = deathSaves

  const handleSuccess = (idx) => {
    // Clicking circle N sets successes to N if > current, or N-1 if equal (toggle off)
    const newVal = idx + 1 <= successes ? idx : idx + 1
    onUpdate(newVal, failures)
  }

  const handleFailure = (idx) => {
    const newVal = idx + 1 <= failures ? idx : idx + 1
    onUpdate(successes, newVal)
  }

  const handleNat1 = () => {
    const newFailures = Math.min(3, failures + 2)
    onNat1 ? onNat1() : onUpdate(successes, newFailures)
  }

  return (
    <div className="flex items-center gap-3 py-1">
      {/* Successes */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-emerald-400/70 uppercase tracking-wider mr-0.5">Save</span>
        {[0, 1, 2].map((i) => (
          <button
            key={`s${i}`}
            className={`w-3.5 h-3.5 rounded-full border-[1.5px] transition-colors ${
              i < successes
                ? 'bg-emerald-500 border-emerald-400'
                : 'border-white/25 hover:border-emerald-400/50'
            }`}
            onClick={(e) => { e.stopPropagation(); handleSuccess(i) }}
            title={`${i + 1} success${i !== 0 ? 'es' : ''}`}
          />
        ))}
      </div>

      {/* Failures */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-red-400/70 uppercase tracking-wider mr-0.5">Fail</span>
        {[0, 1, 2].map((i) => (
          <button
            key={`f${i}`}
            className={`w-3.5 h-3.5 rounded-full border-[1.5px] transition-colors ${
              i < failures
                ? 'bg-red-500 border-red-400'
                : 'border-white/25 hover:border-red-400/50'
            }`}
            onClick={(e) => { e.stopPropagation(); handleFailure(i) }}
            title={`${i + 1} failure${i !== 0 ? 's' : ''}`}
          />
        ))}
      </div>

      {/* Nat 20 / Nat 1 buttons */}
      <div className="flex items-center gap-1 ml-1">
        <button
          className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          onClick={(e) => { e.stopPropagation(); onNat20() }}
          title={isPC ? 'Nat 20: Stabilize' : 'Nat 20: Regain 1 HP and stabilize'}
        >
          20
        </button>
        <button
          className="text-[10px] px-1.5 py-0.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          onClick={(e) => { e.stopPropagation(); handleNat1() }}
          title="Nat 1: 2 death save failures"
        >
          1
        </button>
      </div>
    </div>
  )
}
