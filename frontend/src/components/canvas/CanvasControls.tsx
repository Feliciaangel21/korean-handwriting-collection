interface CanvasControlsProps {
  onUndo: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function CanvasControls({ onUndo, onClear, disabled }: CanvasControlsProps) {
  return (
    <div className="button-row">
      <button type="button" className="button button--secondary button--small" onClick={onUndo} disabled={disabled}>
        Undo Last Stroke
      </button>
      <button type="button" className="button button--secondary button--small" onClick={onClear} disabled={disabled}>
        Clear
      </button>
      <button type="button" className="button button--secondary button--small" onClick={onClear} disabled={disabled}>
        Rewrite
      </button>
    </div>
  );
}
