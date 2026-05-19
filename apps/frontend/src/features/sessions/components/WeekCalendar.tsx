import { useMemo, useState } from 'react';
import type { SessionDto, GroupDto } from '@academiaplaton/shared';
import type { Teacher } from '@/features/teachers/types';
import {
  addDays,
  minutesToTime,
  teacherColor,
  timeToMinutes,
  toIsoDate,
} from '../lib/week';

interface Props {
  weekStart: Date; // lunes
  sessions: SessionDto[];
  groups: GroupDto[];
  teachers: Teacher[];
  dayCount?: number; // por defecto 6 (L-S)
  startHour?: number; // por defecto 8
  endHour?: number; // por defecto 22 (exclusivo en el bottom edge)
  onCellClick: (args: { date: string; startTime: string }) => void;
  onSessionClick: (session: SessionDto) => void;
  // Llamado al soltar un bloque de sesión arrastrado sobre otro slot.
  // El padre aplica conflict-check y actualiza el estado.
  onSessionDrop?: (args: { sessionId: string; date: string; startTime: string }) => void;
}

const DRAG_MIME = 'application/x-session-id';

const SLOT_MINUTES = 30;
const SLOT_HEIGHT_PX = 28;
const HEADER_HEIGHT_PX = 56;
const GUTTER_WIDTH_PX = 64;

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function WeekCalendar({
  weekStart,
  sessions,
  groups,
  teachers,
  dayCount = 6,
  startHour = 8,
  endHour = 22,
  onCellClick,
  onSessionClick,
  onSessionDrop,
}: Props) {
  const startMin = startHour * 60;
  const endMin = endHour * 60;
  const slots = (endMin - startMin) / SLOT_MINUTES;
  const gridHeight = slots * SLOT_HEIGHT_PX;
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const teacherById = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);

  const days = useMemo(
    () =>
      Array.from({ length: dayCount }, (_, i) => {
        const d = addDays(weekStart, i);
        return { date: d, iso: toIsoDate(d), label: DAY_LABELS[i] ?? '' };
      }),
    [weekStart, dayCount],
  );

  // Agrupar sesiones por iso de fecha
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionDto[]>();
    for (const s of sessions) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [sessions]);

  // Filas de horas (cabecera de cada hora en punto en la gutter)
  const hourMarks = useMemo(() => {
    const arr: number[] = [];
    for (let h = startHour; h < endHour; h++) arr.push(h);
    return arr;
  }, [startHour, endHour]);

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Cabecera de días */}
      <div
        className="grid bg-muted border-b"
        style={{
          gridTemplateColumns: `${GUTTER_WIDTH_PX}px repeat(${dayCount}, minmax(0, 1fr))`,
          height: HEADER_HEIGHT_PX,
        }}
      >
        <div />
        {days.map((d) => {
          const isToday = toIsoDate(new Date()) === d.iso;
          return (
            <div
              key={d.iso}
              className="flex flex-col items-center justify-center border-l text-xs"
            >
              <span className="font-medium text-muted-foreground">{d.label}</span>
              <span
                className={
                  isToday
                    ? 'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold'
                    : 'mt-0.5 text-sm font-semibold'
                }
              >
                {d.date.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Cuerpo: gutter + columnas */}
      <div
        className="grid relative overflow-x-auto"
        style={{
          gridTemplateColumns: `${GUTTER_WIDTH_PX}px repeat(${dayCount}, minmax(0, 1fr))`,
          height: gridHeight,
        }}
      >
        {/* Gutter de horas */}
        <div className="relative border-r">
          {hourMarks.map((h) => (
            <div
              key={h}
              className="absolute right-1 text-[11px] text-muted-foreground tabular-nums"
              style={{ top: (h - startHour) * 2 * SLOT_HEIGHT_PX - 6 }}
            >
              {minutesToTime(h * 60)}
            </div>
          ))}
        </div>

        {/* Columnas de cada día */}
        {days.map((d) => {
          const daySessions = sessionsByDay.get(d.iso) ?? [];
          return (
            <DayColumn
              key={d.iso}
              dateIso={d.iso}
              startMin={startMin}
              endMin={endMin}
              gridHeight={gridHeight}
              sessions={daySessions}
              groupById={groupById}
              teacherById={teacherById}
              onCellClick={onCellClick}
              onSessionClick={onSessionClick}
              draggingId={draggingId}
              setDraggingId={setDraggingId}
              onSessionDrop={onSessionDrop}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayColumn({
  dateIso,
  startMin,
  endMin,
  gridHeight,
  sessions,
  groupById,
  teacherById,
  onCellClick,
  onSessionClick,
  draggingId,
  setDraggingId,
  onSessionDrop,
}: {
  dateIso: string;
  startMin: number;
  endMin: number;
  gridHeight: number;
  sessions: SessionDto[];
  groupById: Map<string, GroupDto>;
  teacherById: Map<string, Teacher>;
  onCellClick: (args: { date: string; startTime: string }) => void;
  onSessionClick: (s: SessionDto) => void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  onSessionDrop?: (args: { sessionId: string; date: string; startTime: string }) => void;
}) {
  const slotsCount = (endMin - startMin) / SLOT_MINUTES;
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  function handleSlotDragOver(e: React.DragEvent<HTMLButtonElement>, slotIdx: number) {
    if (!onSessionDrop) return;
    // Aceptamos el drop sólo si el dragstart era de una sesión
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSlot !== slotIdx) setDragOverSlot(slotIdx);
  }

  function handleSlotDragLeave(slotIdx: number) {
    if (dragOverSlot === slotIdx) setDragOverSlot(null);
  }

  function handleSlotDrop(e: React.DragEvent<HTMLButtonElement>, slotIdx: number) {
    if (!onSessionDrop) return;
    const sessionId = e.dataTransfer.getData(DRAG_MIME);
    setDragOverSlot(null);
    setDraggingId(null);
    if (!sessionId) return;
    e.preventDefault();
    const slotStart = startMin + slotIdx * SLOT_MINUTES;
    // Snap a 15 min: mitad superior del slot = inicio del slot; mitad inferior = +15
    const offsetY = e.nativeEvent.offsetY;
    const half = SLOT_HEIGHT_PX / 2;
    const dropStartMin = offsetY > half ? slotStart + 15 : slotStart;
    onSessionDrop({
      sessionId,
      date: dateIso,
      startTime: minutesToTime(dropStartMin),
    });
  }

  return (
    <div className="relative border-l">
      {/* Slots clicables de 30 min como fondo */}
      {Array.from({ length: slotsCount }, (_, i) => {
        const slotStartMin = startMin + i * SLOT_MINUTES;
        const isHourMark = slotStartMin % 60 === 0;
        const isDragOver = dragOverSlot === i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onCellClick({ date: dateIso, startTime: minutesToTime(slotStartMin) })}
            onDragOver={(e) => handleSlotDragOver(e, i)}
            onDragLeave={() => handleSlotDragLeave(i)}
            onDrop={(e) => handleSlotDrop(e, i)}
            aria-label={`Crear sesión ${dateIso} ${minutesToTime(slotStartMin)}`}
            className={
              'absolute inset-x-0 transition-colors ' +
              (isDragOver ? 'bg-primary/15 ring-1 ring-inset ring-primary/40 ' : 'hover:bg-muted/40 ') +
              (isHourMark ? 'border-t border-border' : 'border-t border-border/40')
            }
            style={{ top: i * SLOT_HEIGHT_PX, height: SLOT_HEIGHT_PX }}
          />
        );
      })}

      {/* Bloques de sesión */}
      {sessions.map((s) => {
        const startMinAbs = timeToMinutes(s.startTime);
        const endMinAbs = timeToMinutes(s.endTime);
        const top = ((startMinAbs - startMin) / SLOT_MINUTES) * SLOT_HEIGHT_PX;
        const height = Math.max(
          SLOT_HEIGHT_PX - 2,
          ((endMinAbs - startMinAbs) / SLOT_MINUTES) * SLOT_HEIGHT_PX - 2,
        );
        const group = groupById.get(s.groupId);
        const teacher = teacherById.get(s.teacherId);
        const color = teacherColor(s.teacherId);

        // Clip si la sesión sale del rango visible
        const visibleTop = Math.max(0, top);
        const visibleHeight = Math.min(gridHeight - visibleTop, height + Math.min(0, top));

        if (visibleHeight <= 0) return null;

        const isDragging = draggingId === s.id;
        const draggable = !!onSessionDrop;
        return (
          <button
            key={s.id}
            type="button"
            draggable={draggable}
            onDragStart={(e) => {
              if (!draggable) return;
              e.dataTransfer.setData(DRAG_MIME, s.id);
              e.dataTransfer.effectAllowed = 'move';
              setDraggingId(s.id);
            }}
            onDragEnd={() => setDraggingId(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSessionClick(s);
            }}
            className={
              'absolute left-1 right-1 rounded-md border text-left px-2 py-1 overflow-hidden shadow-sm hover:shadow transition-shadow z-10 ' +
              (draggable ? 'cursor-grab active:cursor-grabbing ' : '') +
              (isDragging ? 'opacity-40' : '')
            }
            style={{
              top: visibleTop,
              height: visibleHeight,
              backgroundColor: color.bg,
              borderColor: color.border,
              color: color.text,
            }}
            aria-label={`${group?.name ?? 'Sesión'} ${s.startTime}–${s.endTime}`}
          >
            <div className="text-[11px] font-semibold leading-tight truncate">
              {group?.name ?? 'Grupo eliminado'}
            </div>
            {group?.subject && (
              <div className="text-[10px] opacity-80 leading-tight truncate">
                {group.subject}
              </div>
            )}
            <div className="text-[10px] opacity-70 leading-tight tabular-nums truncate">
              {s.startTime}–{s.endTime}
              {teacher && ` · ${teacher.firstName.charAt(0)}. ${teacher.lastName}`}
            </div>
          </button>
        );
      })}
    </div>
  );
}
