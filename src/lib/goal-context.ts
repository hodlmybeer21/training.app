// Turns a team's active goals into the context line the practice AI is given.
// Used by GET /api/goals (shown to the rep) and by the server-built practice prompt.
type GoalRow = {
  goal_text?: string | null;
  product_sku?: string | null;
  target_cases?: number | null;
  target_pods?: number | null;
  target_date?: string | null;
};

export function buildGoalContext(goals: GoalRow[] | null | undefined): string {
  if (!goals || goals.length === 0) return '';
  const lines = goals.map((g) => {
    let line = `- ${g.goal_text}`;
    if (g.product_sku) line += ` | SKU focus: ${g.product_sku}`;
    if (g.target_cases) line += ` | Target: ${g.target_cases} cases`;
    if (g.target_pods) line += ` | Target: ${g.target_pods} PODs`;
    if (g.target_date) line += ` | Due: ${g.target_date}`;
    return line;
  });
  return `ACTIVE SALES TARGETS (from your manager):\n${lines.join('\n')}`;
}
