import { Lightbulb, Zap, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { ReactNode } from 'react';

type CalloutType = 'tldr' | 'insight' | 'warning' | 'tip' | 'stat';

const config: Record<
  CalloutType,
  { wrapper: string; header: string; Icon: typeof Zap; label: string }
> = {
  tldr: {
    wrapper: 'bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-6 my-8',
    header: 'text-blue-700 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2',
    Icon: Zap,
    label: 'TL;DR',
  },
  insight: {
    wrapper: 'bg-amber-50 border-l-4 border-amber-400 pl-4 pr-4 py-4 sm:pl-6 sm:pr-5 sm:py-5 my-6 rounded-r-xl',
    header: 'text-amber-700 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2',
    Icon: Lightbulb,
    label: 'Key Insight',
  },
  warning: {
    wrapper: 'bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 my-6',
    header: 'text-red-700 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2',
    Icon: AlertTriangle,
    label: 'Watch Out',
  },
  tip: {
    wrapper: 'bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 my-6',
    header: 'text-emerald-700 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2',
    Icon: CheckCircle,
    label: 'Builder Tip',
  },
  stat: {
    wrapper: 'bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 my-6',
    header: 'text-slate-600 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2',
    Icon: Info,
    label: 'By the numbers',
  },
};

interface Props {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

export default function Callout({ type = 'insight', title, children }: Props) {
  const c = config[type];
  const { Icon } = c;
  return (
    <div className={c.wrapper}>
      <div className={c.header}>
        <Icon size={13} />
        {title ?? c.label}
      </div>
      <div className="text-slate-800 text-sm sm:text-base leading-relaxed">{children}</div>
    </div>
  );
}
