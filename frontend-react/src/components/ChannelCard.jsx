import { motion } from "framer-motion";

export default function ChannelCard({ tag, title, description, metric, metricLabel, color = "amber" }) {
  const colorMap = {
    amber: { text: "text-amber", border: "border-amber/25", bg: "bg-amber-soft" },
    cyan: { text: "text-cyan", border: "border-cyan/25", bg: "bg-cyan-soft" },
    rose: { text: "text-rose", border: "border-rose/25", bg: "bg-rose-soft" },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-2xl border ${c.border} bg-graphite-soft/60 p-6 flex flex-col gap-4`}
    >
      <div className="flex items-center justify-between">
        <span className={`channel-tag ${c.text}`}>{tag}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${c.bg}`} style={{ boxShadow: `0 0 8px currentColor` }} />
      </div>
      <h3 className="font-display italic text-2xl text-paper leading-snug">{title}</h3>
      <p className="text-sm text-dim leading-relaxed">{description}</p>
      <div className="mt-auto pt-3 border-t border-white/[0.06] flex items-baseline gap-2">
        <span className="font-mono-ui text-lg text-paper">{metric}</span>
        <span className="channel-tag text-dim">{metricLabel}</span>
      </div>
    </motion.div>
  );
}
