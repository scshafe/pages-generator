export function ShortcutsPanel() {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Shortcuts</h2>
        <p>Reserved shortcuts for authoring workflows.</p>
      </div>
      <div className="section-card">
        <strong>Planned shortcuts</strong>
        <ul className="muted">
          <li>Create sub group: Hyper + G</li>
          <li>Open add unit menu: Hyper + U</li>
          <li>Insert unit in place: Hyper + P</li>
          <li>Open style menu: Hyper + L</li>
          <li>Toggle configuration panel: Hyper + T</li>
          <li>Focus next: Hyper + K</li>
          <li>Focus previous: Hyper + J</li>
          <li>Move out before group: Hyper + O then J</li>
          <li>Move out after group: Hyper + O then K</li>
          <li>Move in next sub group: Hyper + I then K</li>
          <li>Move in previous sub group: Hyper + I then J</li>
          <li>Jump to end of unit: Hyper + ]</li>
          <li>Jump to start of unit: Hyper + [</li>
        </ul>
      </div>
    </div>
  );
}
