/** خلفية ثابتة بسيطة. التصميم الجديد هيستبدلها. */
export function AppBackground() {
  return (
    <div className="app-bg" aria-hidden="true">
      <div
        className="app-bg__glow"
        style={{ insetInlineStart: "10%", insetBlockStart: "-10%" }}
      />
    </div>
  );
}
