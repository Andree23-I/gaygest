import React, { useRef, useState, useEffect } from 'react';
import {
  PenTool,
  Square,
  Circle,
  Type,
  Eraser,
  Trash2,
  Download,
  Users,
  Undo2,
  MousePointer2
} from 'lucide-react';
import { supabase } from './supabase';

export type ToolType = 'pen' | 'line' | 'rect' | 'circle' | 'text' | 'eraser';

export interface DrawElement {
  id: string;
  tool: ToolType;
  color: string;
  size: number;
  points?: { x: number; y: number }[]; // For pen / eraser
  x?: number;                          // For rect, circle, text, line
  y?: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  text?: string;
  author?: string;
}

interface CursorPosition {
  x: number;
  y: number;
  name: string;
  color: string;
}

interface WhiteboardProps {
  channelId: string;
  userName?: string;
}

const COLORS = [
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b'
];

export const Whiteboard: React.FC<WhiteboardProps> = ({
  channelId,
  userName = 'Dev_' + Math.floor(100 + Math.random() * 900)
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#3b82f6');
  const [strokeSize, setStrokeSize] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<DrawElement | null>(null);

  // Realtime Presence / Cursors
  const [remoteCursors, setRemoteCursors] = useState<Record<string, CursorPosition>>({});
  const [userColor] = useState(() => COLORS[Math.floor(Math.random() * COLORS.length)]);
  const channelRef = useRef<any>(null);

  // Load existing whiteboard state and connect Realtime Broadcast
  useEffect(() => {
    let isMounted = true;

    // Load persisted whiteboard data if table exists
    async function loadBoard() {
      try {
        const { data } = await supabase
          .from('whiteboards')
          .select('elements')
          .eq('id', channelId)
          .single();

        if (data && data.elements && isMounted) {
          setElements(data.elements);
        }
      } catch (err) {
        // Table might not exist yet; gracefully handled via broadcast
      }
    }

    loadBoard();

    // Setup Supabase Realtime channel for drawing strokes & cursor presence
    const channel = supabase.channel(`board_${channelId}`, {
      config: { broadcast: { self: false }, presence: { key: userName } }
    });

    channel
      .on('broadcast', { event: 'new_element' }, ({ payload }) => {
        if (!isMounted) return;
        setElements(prev => [...prev, payload]);
      })
      .on('broadcast', { event: 'clear_board' }, () => {
        if (!isMounted) return;
        setElements([]);
      })
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        if (!isMounted) return;
        setRemoteCursors(prev => ({
          ...prev,
          [payload.senderId]: payload
        }));
      })
      .on('presence', { event: 'sync' }, () => {
        // presence sync
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          channel.track({ name: userName, color: userColor });
        }
      });

    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelId, userName, userColor]);

  // Persist board to supabase helper (debounced in state)
  const persistBoard = async (newElements: DrawElement[]) => {
    try {
      await supabase.from('whiteboards').upsert({
        id: channelId,
        elements: newElements,
        updated_at: new Date().toISOString()
      });
    } catch {
      // ignore table missing
    }
  };

  // Re-draw canvas whenever elements or currentDrawing changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Subtle Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 24;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const renderElement = (el: DrawElement) => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = el.size;
      ctx.strokeStyle = el.tool === 'eraser' ? '#0f172a' : el.color;
      ctx.fillStyle = el.color;

      if ((el.tool === 'pen' || el.tool === 'eraser') && el.points && el.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.tool === 'line' && el.x !== undefined && el.y !== undefined && el.endX !== undefined && el.endY !== undefined) {
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.endX, el.endY);
        ctx.stroke();
      } else if (el.tool === 'rect' && el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
        ctx.strokeRect(el.x, el.y, el.width, el.height);
      } else if (el.tool === 'circle' && el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
        ctx.beginPath();
        const rx = Math.abs(el.width) / 2;
        const ry = Math.abs(el.height) / 2;
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.tool === 'text' && el.x !== undefined && el.y !== undefined && el.text) {
        ctx.font = `${Math.max(14, el.size * 4)}px sans-serif`;
        ctx.fillText(el.text, el.x, el.y);
      }
      ctx.restore();
    };

    // Draw all confirmed elements
    elements.forEach(renderElement);

    // Draw current active drawing element
    if (currentDrawing) {
      renderElement(currentDrawing);
    }
  }, [elements, currentDrawing]);

  // Adjust canvas size to parent container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = Math.max(650, window.innerHeight - 250);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (currentTool === 'text') {
      const text = prompt('Inserisci testo per la lavagna:');
      if (text && text.trim()) {
        const textEl: DrawElement = {
          id: 'text-' + Date.now(),
          tool: 'text',
          color: currentColor,
          size: strokeSize,
          x,
          y,
          text: text.trim(),
          author: userName
        };
        const updated = [...elements, textEl];
        setElements(updated);
        persistBoard(updated);
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'new_element',
            payload: textEl
          });
        }
      }
      return;
    }

    setIsDrawing(true);

    if (currentTool === 'pen' || currentTool === 'eraser') {
      setCurrentDrawing({
        id: 'stroke-' + Date.now(),
        tool: currentTool,
        color: currentColor,
        size: currentTool === 'eraser' ? strokeSize * 5 : strokeSize,
        points: [{ x, y }],
        author: userName
      });
    } else {
      setCurrentDrawing({
        id: 'shape-' + Date.now(),
        tool: currentTool,
        color: currentColor,
        size: strokeSize,
        x,
        y,
        width: 0,
        height: 0,
        endX: x,
        endY: y,
        author: userName
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    // Broadcast cursor position to others
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor_move',
        payload: {
          senderId: userName,
          name: userName,
          color: userColor,
          x,
          y
        }
      });
    }

    if (!isDrawing || !currentDrawing) return;

    if (currentTool === 'pen' || currentTool === 'eraser') {
      setCurrentDrawing(prev => {
        if (!prev) return null;
        return {
          ...prev,
          points: [...(prev.points || []), { x, y }]
        };
      });
    } else if (currentTool === 'rect' || currentTool === 'circle') {
      setCurrentDrawing(prev => {
        if (!prev || prev.x === undefined || prev.y === undefined) return null;
        return {
          ...prev,
          width: x - prev.x,
          height: y - prev.y
        };
      });
    } else if (currentTool === 'line') {
      setCurrentDrawing(prev => {
        if (!prev) return null;
        return {
          ...prev,
          endX: x,
          endY: y
        };
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentDrawing) return;
    setIsDrawing(false);

    const completed = currentDrawing;
    setCurrentDrawing(null);

    const updated = [...elements, completed];
    setElements(updated);
    persistBoard(updated);

    // Broadcast element to other connected clients
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'new_element',
        payload: completed
      });
    }
  };

  const clearBoard = () => {
    if (!confirm('Vuoi cancellare l\'intera lavagna per tutti?')) return;
    setElements([]);
    persistBoard([]);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'clear_board',
        payload: {}
      });
    }
  };

  const undoLast = () => {
    const updated = elements.slice(0, -1);
    setElements(updated);
    persistBoard(updated);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `whiteboard-${channelId}-${new Date().toISOString().split('T')[0]}.png`;
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {/* Toolbar */}
      <div
        className="ui-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '8px 14px',
          backgroundColor: 'var(--bg-panel)'
        }}
      >
        {/* Tool selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { id: 'pen', icon: PenTool, label: 'Penna' },
            { id: 'line', icon: Square, label: 'Linea' },
            { id: 'rect', icon: Square, label: 'Rettangolo' },
            { id: 'circle', icon: Circle, label: 'Cerchio' },
            { id: 'text', icon: Type, label: 'Testo' },
            { id: 'eraser', icon: Eraser, label: 'Gomma' }
          ].map(t => {
            const Icon = t.icon;
            const active = currentTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setCurrentTool(t.id as ToolType)}
                className="ui-button"
                style={{
                  padding: '6px 10px',
                  backgroundColor: active ? 'var(--color-primary)' : 'var(--bg-surface)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  border: active ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px'
                }}
                title={t.label}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Colors Palette & Stroke Size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setCurrentColor(c)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: currentColor === c ? '2px solid #fff' : '1px solid #475569',
                  cursor: 'pointer',
                  transform: currentColor === c ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 0.1s'
                }}
              />
            ))}
          </div>

          <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }} />

          {/* Stroke size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Spessore:</span>
            <input
              type="range"
              min="1"
              max="16"
              value={strokeSize}
              onChange={e => setStrokeSize(Number(e.target.value))}
              style={{ width: '70px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', color: '#fff', width: '16px' }}>{strokeSize}px</span>
          </div>
        </div>

        {/* Board Actions & Online Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}
          >
            <Users size={12} />
            <span>Multiplayer Realtime</span>
          </div>

          <button onClick={undoLast} className="ui-button" title="Annulla ultimo tratto">
            <Undo2 size={13} />
          </button>

          <button onClick={clearBoard} className="ui-button" style={{ color: 'var(--color-danger)' }} title="Pulisci lavagna">
            <Trash2 size={13} />
          </button>

          <button onClick={downloadImage} className="ui-button" title="Salva immagine lavagna PNG">
            <Download size={13} /> Salva
          </button>
        </div>
      </div>

      {/* Canvas Area with Live Cursors */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            display: 'block',
            width: '100%',
            height: '650px',
            cursor: currentTool === 'eraser' ? 'crosshair' : currentTool === 'text' ? 'text' : 'crosshair',
            touchAction: 'none'
          }}
        />

        {/* Remote Cursors Overlay */}
        {Object.entries(remoteCursors).map(([id, cursor]) => {
          if (id === userName) return null;
          return (
            <div
              key={id}
              style={{
                position: 'absolute',
                left: cursor.x,
                top: cursor.y,
                pointerEvents: 'none',
                transition: 'all 0.05s ease-out',
                zIndex: 20
              }}
            >
              <MousePointer2 size={16} color={cursor.color || '#38bdf8'} />
              <div
                style={{
                  marginLeft: '12px',
                  marginTop: '-4px',
                  backgroundColor: cursor.color || '#38bdf8',
                  color: '#000',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap'
                }}
              >
                {cursor.name || 'Collaboratore'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
