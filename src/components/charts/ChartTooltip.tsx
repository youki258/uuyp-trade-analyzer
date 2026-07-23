import type { TooltipContentProps } from "recharts";

interface ChartTooltipProps extends Partial<TooltipContentProps<number, string>> {
  formatValue?: (value: number) => string;
  formatLabel?: (label: unknown) => string;
}

/** 全站共享图表 Tooltip：深底 #16181C + hairline 描边 + text-xs + 数值 tnum */
export function ChartTooltip({ active, payload, label, formatValue, formatLabel }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const items = payload.filter(
    (item) => item.name && item.value !== undefined && item.value !== null
  );
  if (items.length === 0) return null;

  const title = formatLabel ? formatLabel(label) : label;

  return (
    <div className="rounded-lg border border-hairline bg-[#16181C] px-3 py-2 text-xs">
      {title !== undefined && title !== null && title !== "" && (
        <p className="mb-1.5 text-muted-foreground">{String(title)}</p>
      )}
      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  (item.payload as { fill?: string } | undefined)?.fill ??
                  item.color ??
                  "#8A8F98",
              }}
            />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="ml-auto pl-3 tnum text-foreground">
              {formatValue ? formatValue(Number(item.value)) : String(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
