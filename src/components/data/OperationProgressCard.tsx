import { Loader2, CircleDashed, CheckCircle2, AlertCircle } from "lucide-react";

interface OperationProgressCardProps {
  title: string;
  message: string;
  tone?: "loading" | "info" | "success" | "error";
}

const toneStyles: Record<
  NonNullable<OperationProgressCardProps["tone"]>,
  string
> = {
  loading: "border-primary/30 bg-primary/5 text-primary",
  info: "border-white/10 bg-white/[0.03] text-foreground",
  success: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  error: "border-red-500/30 bg-red-500/5 text-red-400",
};

function toneIcon(tone: NonNullable<OperationProgressCardProps["tone"]>) {
  switch (tone) {
    case "loading":
      return <Loader2 className="w-5 h-5 animate-spin" />;
    case "success":
      return <CheckCircle2 className="w-5 h-5" />;
    case "error":
      return <AlertCircle className="w-5 h-5" />;
    default:
      return <CircleDashed className="w-5 h-5" />;
  }
}

export function OperationProgressCard({
  title,
  message,
  tone = "info",
}: OperationProgressCardProps) {
  return (
    <section className={`glass-card p-4 space-y-2 border ${toneStyles[tone]}`}>
      <div className="flex items-center gap-2 font-semibold">
        {toneIcon(tone)}
        <span>{title}</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
    </section>
  );
}
