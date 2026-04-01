import { useRef, useEffect, useState, useCallback } from 'react'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const TYPE_COLORS = {
  assignment: { bg: '#FEF3C7', dot: '#F59E0B', text: '#92400E' },
  event: { bg: '#EDE9FE', dot: '#7C3AED', text: '#4C1D95' },
}

export default function CanvasCalendar({ grouped = {}, onDayClick, onMonthChange }) {
  const canvasRef = useRef(null)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  // cell rects stored for hit-testing
  const cellsRef = useRef([])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, W, H)

    // ── Layout constants  ────────────────────────────────────────────────────
    const HEADER_H = 36       // day-of-week header row height
    const PADDING = 8         // canvas edge padding
    const CELL_GAP = 3        // gap between cells
    const COLS = 7

    const gridW = W - PADDING * 2
    const cellW = (gridW - CELL_GAP * (COLS - 1)) / COLS

    // Figure out rows needed
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const totalCells = firstDay + daysInMonth
    const ROWS = Math.ceil(totalCells / 7)
    const cellH = (H - PADDING - HEADER_H - CELL_GAP * (ROWS - 1)) / ROWS

    // ── Day-of-week labels ────────────────────────────────────────────────────
    DAY_LABELS.forEach((d, i) => {
      const x = PADDING + i * (cellW + CELL_GAP) + cellW / 2
      const y = PADDING + 14
      ctx.font = 'bold 11px Inter, system-ui, sans-serif'
      ctx.fillStyle = '#6B7280'
      ctx.textAlign = 'center'
      ctx.fillText(d, x, y)
    })

    // ── Cells ─────────────────────────────────────────────────────────────────
    const cells = []
    const today = new Date()
    let dayNum = 1

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cellIndex = r * 7 + c
        if (cellIndex < firstDay || dayNum > daysInMonth) continue

        const x = PADDING + c * (cellW + CELL_GAP)
        const y = PADDING + HEADER_H + r * (cellH + CELL_GAP)

        // Check reminders
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
        const reminders = grouped[dateStr] || []
        const hasReminders = reminders.length > 0

        const isToday =
          today.getFullYear() === year &&
          today.getMonth() === month &&
          today.getDate() === dayNum

        // Cell background
        let cellBg = '#FFFFFF'
        if (isToday) cellBg = '#FFF1F8'
        if (hasReminders && !isToday) cellBg = '#F9F5FF'

        // Draw rounded rect
        roundRect(ctx, x, y, cellW, cellH, 6, cellBg, isToday ? '#6b1142' : hasReminders ? '#A78BFA' : '#E5E7EB', isToday ? 2 : 1)

        // Day number
        ctx.font = isToday ? 'bold 12px Inter, system-ui, sans-serif' : '12px Inter, system-ui, sans-serif'
        ctx.fillStyle = isToday ? '#6b1142' : hasReminders ? '#5B21B6' : '#374151'
        ctx.textAlign = 'center'
        ctx.fillText(dayNum, x + cellW / 2, y + 15)

        // Reminder dots
        if (hasReminders) {
          const types = [...new Set(reminders.map((r) => r.type))]
          const dotSize = 5
          const totalDotW = types.length * dotSize + (types.length - 1) * 3
          let dotX = x + cellW / 2 - totalDotW / 2

          types.forEach((type) => {
            const color = TYPE_COLORS[type]?.dot || '#9CA3AF'
            ctx.beginPath()
            ctx.arc(dotX + dotSize / 2, y + cellH - 8, dotSize / 2, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
            dotX += dotSize + 3
          })

          // count badge
          if (reminders.length > 1) {
            ctx.font = 'bold 9px Inter, system-ui, sans-serif'
            ctx.fillStyle = '#6B7280'
            ctx.textAlign = 'center'
            ctx.fillText(`${reminders.length}`, x + cellW - 7, y + 13)
          }
        }

        cells.push({ x, y, w: cellW, h: cellH, day: dayNum, dateStr })
        dayNum++
      }
    }

    cellsRef.current = cells
  }, [year, month, grouped])

  // Redraw on data/size changes
  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const obs = new ResizeObserver(() => draw())
    if (canvasRef.current) obs.observe(canvasRef.current)
    return () => obs.disconnect()
  }, [draw])

  const handleClick = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    for (const cell of cellsRef.current) {
      if (mx >= cell.x && mx <= cell.x + cell.w && my >= cell.y && my <= cell.y + cell.h) {
        onDayClick?.(cell.dateStr)
        return
      }
    }
  }

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => { onMonthChange?.(y - 1, 11); return y - 1 })
    } else {
      setMonth((m) => { onMonthChange?.(year, m - 1); return m - 1 })
    }
  }
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => { onMonthChange?.(y + 1, 0); return y + 1 })
    } else {
      setMonth((m) => { onMonthChange?.(year, m + 1); return m + 1 })
    }
  }
  const goToday = () => {
    const y = new Date().getFullYear()
    const m = new Date().getMonth()
    setYear(y)
    setMonth(m)
    onMonthChange?.(y, m)
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Navigation */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition"
          >
            ‹
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition"
          >
            ›
          </button>
        </div>
        <h3 className="text-sm font-semibold text-gray-800">
          {MONTH_NAMES[month]} {year}
        </h3>
        <button
          onClick={goToday}
          className="text-xs px-2.5 py-1 rounded-lg bg-[#6b1142]/10 text-[#6b1142] hover:bg-[#6b1142]/20 font-medium transition"
        >
          Today
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', flex: 1, cursor: 'pointer', display: 'block' }}
        onClick={handleClick}
      />

      {/* Legend */}
      <div className="flex items-center gap-4 px-1 pb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block" />
          <span className="text-xs text-gray-500">Assignment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] inline-block" />
          <span className="text-xs text-gray-500">Event</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-[#6b1142] bg-[#FFF1F8] inline-block" />
          <span className="text-xs text-gray-500">Today</span>
        </div>
      </div>
    </div>
  )
}

// ── Utility: draw rounded rectangle ─────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke() }
}
