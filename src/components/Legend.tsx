import { SHADE_COLORS } from '../lib/barcelona'

const ROWS: [string, string][] = [
  ['shade', "A l'ombra"],
  ['low-sun', 'Sol suau'],
  ['sun', 'A ple sol'],
]

export default function Legend() {
  return (
    <div className="legend">
      {ROWS.map(([key, label]) => (
        <div className="row" key={key}>
          <span className="dot" style={{ background: SHADE_COLORS[key] }} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}
