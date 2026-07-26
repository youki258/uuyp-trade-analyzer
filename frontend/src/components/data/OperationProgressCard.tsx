import { Loader2, CircleDashed, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OperationProgressCardProps {
  title: string;
  message: string;
  tone?: "loading" | "info" | "success" | "error";
}

type Tone = NonNullable<OperationProgressCardProps["tone"]>;

/** 左侧 2px 状态竖条（语义：成功绿 / 错误红，与盈亏红绿无关） */
const barStyles: Record<Tone, string> = {
  loading: "bg-primary",
  info: "bg-white/20",
  success: "bg-emerald-400",
  error: "bg-red-400",
};

const iconStyles: Record<Tone, string> = {
  loading: "text-primary",
  info: "text-muted-foreground",
  success: "text-emerald-400",
  error: "text-red-400",
};

function toneIcon(tone: Tone) {
  switch (tone) {
    case "loading":
      return <Loader2 className="h-4 w-4 animate-spin" />;
    case "success":
      return <CheckCircle2 className="h-4 w-4" />;
    case "error":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <CircleDashed className="h-4 w-4" />;
  }
}

export function OperationProgressCard({
  title,
  message,
  tone = "info",
}: OperationProgressCardProps) {
  return (
    <section className="panel relative overflow-hidden p-4 pl-5">
      <span className={cn("absolute inset-y-0 left-0 w-0.5", barStyles[tone])} />
      <div className={cn("flex items-center gap-2 text-sm font-medium", iconStyles[tone])}>
        {toneIcon(tone)}
        <span className="text-foreground">{title}</span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{message}</p>
    </section>
  );
}
