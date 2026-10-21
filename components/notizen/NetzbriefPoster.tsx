type PosterProps = {
  frame: string;
  statement: string;
  date: string;
  source: string;
  bars: number[];
  width: number;
  height: number;
};

export function NetzbriefPoster({ frame, statement, date, source, bars, width, height }: PosterProps) {
  const landscape = width > height;
  const chartHeight = landscape ? 280 : 460;
  const barWidth = Math.floor((width - (landscape ? 144 : 112)) / Math.max(1, bars.length)) - 4;
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        background: "#F6F6F3",
        color: "#121417",
        padding: landscape ? 72 : 56,
      }}
    >
      <div style={{ display: "flex", fontSize: 18, letterSpacing: 1.5, color: "#5C6166" }}>{frame}</div>
      <div style={{ display: "flex", marginTop: 28, fontSize: landscape ? 48 : 42, lineHeight: 1.15, fontWeight: 500 }}>{statement}</div>
      <div style={{ display: "flex", alignItems: "flex-end", height: chartHeight, marginTop: 40, gap: 4 }}>
        {bars.map((bar, index) => (
          <div
            key={index}
            style={{
              width: Math.max(4, barWidth),
              height: Math.max(6, bar * chartHeight),
              background: "#0E6A70",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", marginTop: 28, fontSize: 18, color: "#5C6166" }}>
        {date} · {source}
      </div>
    </div>
  );
}
