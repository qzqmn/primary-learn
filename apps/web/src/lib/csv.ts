/** CSV 輸出：加 BOM 讓 Excel 正確顯示中文；以「'」中和 = + - @ 開頭的儲存格，防止試算表公式注入 */
export function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const toCsv = (rows: unknown[][]) => '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
export const csvResponse = (name: string, rows: unknown[][]) =>
  new Response(toCsv(rows), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${name.replace(/[^\w.-]/g, '_')}"`, 'cache-control': 'no-store' } });
