import { useInputMode } from "../hooks/useInputMode";

/**
 * Lets anyone opt into writing with touch or a mouse instead of a stylus.
 * Every recorded point still carries its own true `pointerType`, so this
 * never mislabels data — it just widens who can contribute.
 */
export function InputModeToggle() {
  const [acceptAnyInput, setAcceptAnyInput] = useInputMode();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
      }}
    >
      <label
        className="card"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 999,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={acceptAnyInput}
          onChange={(e) => setAcceptAnyInput(e.target.checked)}
        />
        No stylus? Write with touch/mouse instead
      </label>
    </div>
  );
}
