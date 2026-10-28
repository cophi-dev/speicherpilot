"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { GlossaryTip } from "@/components/GlossaryTip";
import { useLanguage } from "@/components/language-context";
import { MAP_VIEW, NetzKarte, STRAND_LABELS, TIP_LEGEND, VOLTAGE_LEGEND } from "@/components/netz/NetzKarte";
import type { AppLanguage } from "@/components/language-context";
import type { GlossaryId } from "@/lib/glossary";
import {
  activeState,
  checkedOutages,
  deriveLimits,
  nodeById,
  NOMINAL_KV,
  outagesSkipped,
  selectionQuery,
  tippingMw,
  type NetzDemoFile,
  type NetzFall,
  type NetzNodeId,
  type NetzPower,
  type NetzRichtung,
  type NetzSelection,
} from "@/lib/netzDemo";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  CASE_LABEL,
  deltaText,
  DIRECTION_LABEL,
  formatOhm,
  formatPct,
  formatPu,
  formatTip,
  kvFromPu,
  limitsItems,
  lineKind,
  NODE_LABEL,
  odblAttribution,
  odblNotice,
  outageBasis,
  outageComparison,
  outageMemory,
  outageModel,
  outageSkipped,
  pair,
  plainText,
  statusSentences,
} from "@/lib/netzTexte";

import styles from "./netz-demo.module.css";

const POWERS: NetzPower[] = [0, 2, 5, 10, 20];
const SCRIPT_URL = "https://github.com/cophi-dev/speicherpilot/blob/main/scripts/netz/build_netz_demo.py";
const CHECKER_URL = "https://github.com/cophi-dev/speicherpilot/blob/main/scripts/netz/nachrechner.py";

function WithTip({ id, language, children }: { id: GlossaryId; language: AppLanguage; children: ReactNode }) {
  return (
    <>
      {children} <GlossaryTip id={id} language={language} />
    </>
  );
}

function Choice<T extends string | number>({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string;
  legend: ReactNode;
  value: T;
  options: Array<{ value: T; label: string; tip?: GlossaryId }>;
  onChange: (value: T) => void;
}) {
  const { language } = useLanguage();
  return (
    <fieldset className={styles.field}>
      <legend>{legend}</legend>
      <div className={styles.segments}>
        {options.map((option) => (
          <label key={String(option.value)} className={styles.seg}>
            <input type="radio" name={name} value={String(option.value)} checked={value === option.value} onChange={() => onChange(option.value)} />
            <span>{option.label}</span>
            {option.tip ? (
              <span className={styles.segTip}>
                <GlossaryTip id={option.tip} language={language} />
              </span>
            ) : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Mark({ fill, shape, radius = 5 }: { fill: string; shape: "circle" | "down" | "up" | "cross"; radius?: number }) {
  if (shape === "down") {
    return <svg className={styles.swatch} viewBox="0 0 14 14" aria-hidden="true"><polygon points="7,12 2,3 12,3" fill={fill} /></svg>;
  }
  if (shape === "up") {
    return <svg className={styles.swatch} viewBox="0 0 14 14" aria-hidden="true"><polygon points="7,2 12,11 2,11" fill={fill} /></svg>;
  }
  if (shape === "cross") {
    return <svg className={styles.swatch} viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3 L11 11 M11 3 L3 11" stroke={fill} strokeWidth="1.6" /></svg>;
  }
  return <svg className={styles.swatch} viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r={Math.min(6, radius)} fill={fill} /></svg>;
}

function Histogram({ values, mark, language }: { values: number[]; mark: number; language: AppLanguage }) {
  const bins = Array.from({ length: 10 }, () => 0);
  for (const value of values) {
    bins[Math.min(9, Math.max(0, Math.floor(value)))] += 1;
  }
  const peak = Math.max(...bins, 1);
  const markIndex = Math.min(9, Math.max(0, Math.floor(mark)));
  const here = mark >= 100 ? (language === "de" ? "mindestens 100 MW" : "at least 100 MW") : `${formatTip(mark, language)} MW`;
  const caption = language === "de" ? `Kipppunkt von 0 bis 10 MW. Dieser Knoten: ${here}.` : `Tipping point from 0 to 10 MW. This node: ${here}.`;
  return (
    <figure className={styles.hist}>
      <svg role="img" aria-label={caption} viewBox="0 0 160 78">
        {bins.map((count, index) => {
          const height = (count / peak) * 56;
          return <rect key={index} x={index * 16 + 2} y={64 - height} width={12} height={Math.max(height, 0)} rx={2} fill={index === markIndex ? "#7DFCE6" : "#8CA3BA"} />;
        })}
        <text x={markIndex * 16 + 8} y={10} textAnchor="middle" fill="#7DFCE6" fontSize="11" fontFamily="ui-monospace, monospace">
          {mark >= 100 ? "100" : formatTip(mark, language)}
        </text>
      </svg>
      <div className={styles.axis} aria-hidden="true">
        <span>0</span>
        <span>5</span>
        <span>10 MW</span>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function parseElement(token: string): { kind: "line" | "trafo"; id: number } | null {
  const match = /^(line|trafo):(\d+)$/.exec(token);
  if (!match) return null;
  return { kind: match[1] === "trafo" ? "trafo" : "line", id: Number(match[2]) };
}

function elementRows(tokens: string[], data: NetzDemoFile, language: AppLanguage) {
  return tokens
    .map(parseElement)
    .filter((item): item is { kind: "line" | "trafo"; id: number } => item != null)
    .sort((a, b) => a.id - b.id || a.kind.localeCompare(b.kind))
    .map((item) => {
      if (item.kind === "trafo") {
        const trafo = data.trafos.find((entry) => entry.id === item.id);
        return {
          key: `trafo-${item.id}`,
          name: language === "de" ? `Transformator ${item.id}` : `Transformer ${item.id}`,
          detail: trafo ? `${formatQuantity(trafo.snMva, language, 0)} MVA` : "—",
          length: "—",
        };
      }
      const line = data.lines.find((entry) => entry.id === item.id);
      return {
        key: `line-${item.id}`,
        name: language === "de" ? `Leitung ${item.id}` : `Line ${item.id}`,
        detail: line ? lineKind(line.kind, language) : "—",
        length: line ? `${formatQuantity(line.km, language, line.km < 10 ? 2 : 1)} km` : "—",
      };
    });
}

function Kpi({ label, value, delta, nowrap = false }: { label: ReactNode; value: string; delta: string; nowrap?: boolean }) {
  return (
    <div className={styles.kpi}>
      <span className={nowrap ? styles.kpiLabelNowrap : styles.kpiLabel}>{label}</span>
      <b>{value}</b>
      <small>{delta}</small>
    </div>
  );
}

export function NetzDemo({ data, selection: initialSelection }: { data: NetzDemoFile; selection: NetzSelection }) {
  const { language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [selection, setSelection] = useState(initialSelection);
  const [seenSelection, setSeenSelection] = useState(initialSelection);
  const [picture, setPicture] = useState<"karte" | "tabelle">("karte");
  const [mapMode, setMapMode] = useState<"spannung" | "kipp">("spannung");
  if (seenSelection !== initialSelection) {
    setSeenSelection(initialSelection);
    setSelection(initialSelection);
  }

  function update(next: NetzSelection) {
    setSelection(next);
    const params = new URLSearchParams(window.location.search);
    const query = new URLSearchParams(selectionQuery(next));
    const lang = params.get("lang");
    if (lang) query.set("lang", lang);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  }

  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const node = nodeById(data, selection.knoten);
  const { state, base } = activeState(data, selection);
  const derived = deriveLimits(state);
  const baseDerived = deriveLimits(base);
  const tip = tippingMw(data, selection.fall, selection.richtung, node.bus);
  const tips = data.tipping[`${selection.fall}|${selection.richtung}`] ?? [];
  const storageOn = selection.pMw > 0;
  const baseN1 = checkedOutages(base);
  const stateN1 = checkedOutages(state);
  const sentences = plainText({
    language,
    basis: !storageOn,
    fall: selection.fall,
    richtung: selection.richtung,
    knoten: selection.knoten,
    pMw: selection.pMw,
    derived,
    vmin: state.vmin,
    vmax: state.vmax,
    lineMax: state.lineMax,
    baseLine: base.lineMax,
    tip,
  });
  const status = statusSentences(language, derived);
  const nodeName = `${tx("Knoten", "Node")} ${node.id}, ${pair(language, NODE_LABEL[node.id])}`;

  const topLines =
    state.loading == null
      ? []
      : data.lines
          .map((line, index) => ({ line, loading: state.loading?.[index] ?? 0 }))
          .filter((item) => !item.line.openEnd)
          .sort((a, b) => b.loading - a.loading || a.line.id - b.line.id)
          .slice(0, 5);
  let minIndex = 0;
  let maxIndex = 0;
  state.u?.forEach((value, index) => {
    if (state.u && value < (state.u[minIndex] ?? value)) minIndex = index;
    if (state.u && value > (state.u[maxIndex] ?? value)) maxIndex = index;
  });
  const mapTitle = !derived.converged
    ? tx(
        "Strangbild des Testnetzes. Der Lastfluss konvergiert nicht. Keine Spannungen.",
        "Feeder diagram of the test grid. The load flow does not converge. No voltages."
      )
    : mapMode === "kipp"
      ? tx(
          `Strangbild, eingefärbt nach Kipppunkt. Engster Wert ${formatTip(Math.min(...tips), language)} MW.`,
          `Feeder diagram coloured by tipping point. Tightest value ${formatTip(Math.min(...tips), language)} MW.`
        )
      : tx(
          `Strangbild. Spannung ${formatPu(state.vmin ?? 0, language)} bis ${formatPu(state.vmax ?? 0, language)} p.u. Höchste Leitung ${formatPct(state.lineMax ?? 0, language)} %.`,
          `Feeder diagram. Voltage ${formatPu(state.vmin ?? 0, language)} to ${formatPu(state.vmax ?? 0, language)} p.u. Highest line ${formatPct(state.lineMax ?? 0, language)} %.`
        );
  const mapDescription = topLines
    .map((item) => `${tx("Leitung", "Line")} ${item.line.id}: ${formatPct(item.loading, language)} %`)
    .join(", ");

  const tightest = data.mvBusIds
    .map((bus, index) => ({ bus, tip: tips[index] ?? 0, strand: data.tree.find((item) => item.bus === bus)?.strang ?? 0 }))
    .sort((a, b) => a.tip - b.tip || a.bus - b.bus)
    .slice(0, 5);

  function numberOrDash(value: number | undefined, digits: number, suffix: string) {
    if (!derived.converged || value == null) return "—";
    return `${formatQuantity(value, language, digits)} ${suffix}`;
  }

  function deltaOrDash(value: number | undefined, baseValue: number | undefined, digits: number) {
    if (!derived.converged || !baseDerived.converged || value == null || baseValue == null) return "—";
    return deltaText(value, baseValue, language, digits);
  }

  return (
    <div className={styles.stage}>
      <p className={styles.banner} role="note">
        <WithTip id="testnetz" language={language}>
          {tx("Testnetz, kein reales Netz", "Test grid, not a real grid")}
        </WithTip>
        <span className={styles.chip}>{tx("MODELL", "MODEL")}</span>
      </p>
      <div className={styles.inner}>
        <header className={styles.intro}>
          <div>
            <p className={styles.kicker}>{tx("Szenarien rechnen im Testnetz", "Run scenarios in the test grid")}</p>
            <h1 className={styles.title}>{tx("Netzwirkung im Testnetz", "Grid effect in a test grid")}</h1>
            <p className={styles.purpose}>
              {tx("Ein Speicher wird an einen Knoten gesetzt. Die Seite zeigt den ", "A storage unit is placed at a node. The page shows the ")}
              <WithTip id="lastfluss" language={language}>
                {tx("Lastfluss", "load flow")}
              </WithTip>
              {tx(", die Auslastung, den Einzelausfall und den Kipppunkt.", ", the loading, the single outage and the tipping point.")}
            </p>
          </div>
          <Histogram values={tips} mark={tip} language={language} />
        </header>

        <div className={styles.work}>
          <div className={styles.side}>
          <form className={styles.inputs} onSubmit={(event) => event.preventDefault()}>
            <Choice
              name="netz-fall"
              legend={tx("Lastfall", "Load case")}
              value={selection.fall}
              options={[
                { value: "hL" as NetzFall, label: pair(language, CASE_LABEL.hL), tip: "starklast" },
                { value: "lPV" as NetzFall, label: pair(language, CASE_LABEL.lPV), tip: "schwachlast-pv" },
              ]}
              onChange={(fall) => update({ ...selection, fall })}
            />
            <Choice
              name="netz-richtung"
              legend={tx("Richtung", "Direction")}
              value={selection.richtung}
              options={(["laden", "entladen"] as NetzRichtung[]).map((richtung) => ({
                value: richtung,
                label: pair(language, DIRECTION_LABEL[richtung]),
              }))}
              onChange={(richtung) => update({ ...selection, richtung })}
            />
            <label className={styles.field}>
              <span className={styles.controlLabel}>{tx("Speicherknoten", "Storage node")}</span>
              <select
                className={styles.select}
                value={selection.knoten}
                onChange={(event) => update({ ...selection, knoten: event.target.value as NetzNodeId })}
              >
                {data.nodes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} · {pair(language, NODE_LABEL[item.id])} · {formatOhm(item.zOhm, language)} Ω
                  </option>
                ))}
              </select>
            </label>
            <Choice
              name="netz-leistung"
              legend={tx("Leistung", "Power")}
              value={selection.pMw}
              options={POWERS.map((power) => ({
                value: power,
                label: power === 0 ? tx("Ohne Speicher", "Without storage") : `${power} MW`,
              }))}
              onChange={(pMw) => update({ ...selection, pMw })}
            />
            <p className={styles.note}>{tx("Gerechnet sind 2, 5, 10 und 20 MW. Dazwischen wird nicht interpoliert.", "Calculated powers are 2, 5, 10 and 20 MW. Values in between are not interpolated.")}</p>
          </form>
          <div className={styles.plain} role="status" aria-live="polite" aria-atomic="true">
            {status.map((sentence) => (
              <p key={sentence}>{sentence}</p>
            ))}
            {sentences.map((sentence) => (
              <p key={sentence}>{sentence}</p>
            ))}
          </div>
          </div>
          <div className={styles.mapBlock}>
            <h2 id="netz-ergebnis">{tx("Ergebnis", "Result")}</h2>
            <div className={styles.toolbar}>
              <Choice
                name="netz-bild"
                legend={tx("Darstellung", "View")}
                value={picture}
                options={[
                  { value: "karte" as const, label: tx("Karte", "Map") },
                  { value: "tabelle" as const, label: tx("Tabelle", "Table") },
                ]}
                onChange={setPicture}
              />
              <Choice
                name="netz-ansicht"
                legend={tx("Karteninhalt", "Map content")}
                value={mapMode}
                options={[
                  { value: "spannung" as const, label: tx("Spannung", "Voltage") },
                  { value: "kipp" as const, label: tx("Kipppunkt", "Tipping point") },
                ]}
                onChange={setMapMode}
              />
            </div>
            {!derived.converged ? (
              <h3 className={styles.alarm}><span aria-hidden="true">×</span> {tx("Kein Betriebspunkt", "No operating point")}</h3>
            ) : !derived.ok ? (
              <h3 className={styles.alarm}><span aria-hidden="true">▲</span> {tx("Grenze verletzt", "Limit violated")}</h3>
            ) : null}
            <p className={styles.caption}>
              {storageOn
                ? tx(`Speicher an ${nodeName}, ${selection.pMw} MW ${pair(language, DIRECTION_LABEL[selection.richtung])}.`, `Storage at ${nodeName}, ${selection.pMw} MW ${pair(language, DIRECTION_LABEL[selection.richtung])}.`)
                : tx(`Ohne Speicher. Gewählter Knoten: ${nodeName}.`, `Without storage. Selected node: ${nodeName}.`)}
            </p>
            {picture === "karte" ? (
              <>
              <div className={styles.mapRow}>
                <div className={styles.strandCol} aria-hidden="true">
                  {STRAND_LABELS.map((strand, index) => (
                    <span key={strand} className={styles.strandLabel} style={{ top: `${((MAP_VIEW.padTop + index * MAP_VIEW.row) / MAP_VIEW.height) * 100}%` }}>
                      S{strand}
                    </span>
                  ))}
                </div>
                <div className={styles.mapScroll} role="region" tabIndex={0} aria-label={tx("Strangbild, seitlich wischen", "Feeder diagram, swipe sideways")}>
                  <div className={styles.mapFrame}>
                    <NetzKarte
                      data={data}
                      state={state}
                      mode={mapMode}
                      tipping={tips}
                      storageBus={storageOn ? node.bus : null}
                      title={mapTitle}
                      description={mapDescription}
                    />
                  </div>
                </div>
              </div>
              <p className={styles.swipeHint}>{tx("← wischen →", "← swipe →")}</p>
              <button type="button" className={styles.tableLink} onClick={() => setPicture("tabelle")}>
                {tx("Als Tabelle ansehen", "View as a table")}
              </button>
              </>
            ) : (
              <div className={styles.tableWrap}>
                <table>
                  <caption>{tx("Spannung der Mittelspannungsknoten", "Voltage of the medium-voltage nodes")}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{tx("Knoten", "Node")}</th>
                      <th scope="col">{tx("Strang", "Feeder")}</th>
                      <th scope="col">{tx("Spannung p.u.", "Voltage p.u.")}</th>
                      <th scope="col">{tx("Band", "Band")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.mvBusIds.map((bus, index) => {
                      const tree = data.tree.find((item) => item.bus === bus);
                      const voltage = state.u?.[index];
                      const named = data.nodes.find((item) => item.bus === bus);
                      const band =
                        voltage == null
                          ? "—"
                          : voltage < 0.965
                            ? tx("unter dem Band", "below the band")
                            : voltage > 1.055
                              ? tx("über dem Band", "above the band")
                              : tx("im Band", "inside the band");
                      return (
                        <tr key={bus}>
                          <th scope="row">{named ? named.id : bus}</th>
                          <td>{tree?.strang ?? "—"}</td>
                          <td>{voltage == null ? "—" : formatPu(voltage, language)}</td>
                          <td>{band}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <table>
                  <caption>{tx("Auslastung der Leitungen", "Loading of the lines")}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{tx("Leitung", "Line")}</th>
                      <th scope="col">{tx("Art", "Kind")}</th>
                      <th scope="col">{tx("Länge", "Length")}</th>
                      <th scope="col">{tx("Auslastung", "Loading")}</th>
                      <th scope="col">{tx("Schalter", "Switch")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((line, index) => (
                      <tr key={line.id}>
                        <th scope="row">{line.id}</th>
                        <td>{lineKind(line.kind, language)}</td>
                        <td>{formatQuantity(line.km, language, 2)} km</td>
                        <td>{state.loading == null ? "—" : `${formatPct(state.loading[index] ?? 0, language)} %`}</td>
                        <td>{line.openEnd ? tx("offen", "open") : tx("geschlossen", "closed")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <ul className={styles.legend}>
              {(mapMode === "kipp" ? TIP_LEGEND : VOLTAGE_LEGEND).map((item) => (
                <li key={item.de}>
                  <Mark fill={item.fill} shape={item.shape} radius={"radius" in item ? item.radius : 5} />
                  {pair(language, item)}
                </li>
              ))}
              {mapMode === "spannung" ? (
                <>
                  <li><Mark fill="rgb(102, 115, 127)" shape="circle" />{tx("Leitung unter 80 %", "Line below 80 %")}</li>
                  <li><Mark fill="#E1E6EA" shape="circle" />{tx("Leitung 80 bis 100 %", "Line 80 to 100 %")}</li>
                  <li><Mark fill="#FFFFFF" shape="circle" />{tx("Leitung über 100 %, gestrichelt", "Line above 100 %, dashed")}</li>
                  <li><Mark fill="rgb(102, 115, 127)" shape="cross" />{tx("offene Trennstelle", "open tie switch")}</li>
                </>
              ) : (
                <li><Mark fill="rgb(102, 115, 127)" shape="cross" />{tx("offene Trennstelle", "open tie switch")}</li>
              )}
            </ul>
          </div>
          <div className={styles.metrics}>
            <div className={styles.kpis}>
              <Kpi
                label={tx(`Spannung min, p.u. und kV (Bezug ${NOMINAL_KV} kV)`, `Voltage min, p.u. and kV (base ${NOMINAL_KV} kV)`)}
                value={derived.converged && state.vmin != null ? `${formatPu(state.vmin, language)} · ${formatQuantity(kvFromPu(state.vmin), language, 2)} kV` : "—"}
                delta={deltaOrDash(state.vmin, base.vmin, 4)}
              />
              <Kpi
                label={tx("Spannung max, p.u. und kV", "Voltage max, p.u. and kV")}
                value={derived.converged && state.vmax != null ? `${formatPu(state.vmax, language)} · ${formatQuantity(kvFromPu(state.vmax), language, 2)} kV` : "—"}
                delta={deltaOrDash(state.vmax, base.vmax, 4)}
              />
              <Kpi
                label={
                  <>
                    <WithTip id="auslastung" language={language}>{tx("Höchste Leitung", "Highest line")}</WithTip>
                  </>
                }
                value={numberOrDash(state.lineMax, 1, "%")}
                delta={deltaOrDash(state.lineMax, base.lineMax, 1)}
                nowrap
              />
              <Kpi label={tx("Höchster Transformator", "Highest transformer")} value={numberOrDash(state.trafoMax, 1, "%")} delta={deltaOrDash(state.trafoMax, base.trafoMax, 1)} />
              <Kpi
                label={tx("Bezug aus dem Hochspannungsnetz, MW. Negativ heißt Rückspeisung.", "Import from the high-voltage grid, MW. Negative means export.")}
                value={numberOrDash(state.pExtMw, 3, "MW")}
                delta={deltaOrDash(state.pExtMw, base.pExtMw, 3)}
              />
              <Kpi label={tx("Verluste, MW", "Losses, MW")} value={numberOrDash(state.lossesMw, 3, "MW")} delta={deltaOrDash(state.lossesMw, base.lossesMw, 3)} />
            </div>
            <p className={styles.note}>
              {tx(
                `Zwei Transformatoren, je ${formatQuantity(data.trafos[0]?.snMva ?? 40, language, 0)} MVA. Gezeigt wird die höchste Auslastung der beiden.`,
                `Two transformers, ${formatQuantity(data.trafos[0]?.snMva ?? 40, language, 0)} MVA each. The figure is the higher loading of the two.`
              )}
            </p>
            {derived.converged && mapMode === "spannung" ? (
              <div className={styles.tableWrap}>
                <table>
                  <caption>
                    {tx("Textalternative: fünf höchste Leitungen und die Spannungsränder", "Text alternative: five highest lines and the voltage edges")}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{tx("Leitung", "Line")}</th>
                      <th scope="col">{tx("Art", "Kind")}</th>
                      <th scope="col" className={styles.numCell}>{tx("Länge", "Length")}</th>
                      <th scope="col" className={styles.numCell}>{tx("Auslastung", "Loading")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topLines.map((item) => (
                      <tr key={item.line.id}>
                        <th scope="row">{item.line.id}</th>
                        <td>{lineKind(item.line.kind, language)}</td>
                        <td className={styles.numCell}>{formatQuantity(item.line.km, language, 2)} km</td>
                        <td className={styles.numCell}>{formatPct(item.loading, language)} %</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={styles.note}>
                  {tx(
                    `Niedrigste Spannung an Knoten ${data.mvBusIds[minIndex]}: ${formatPu(state.u?.[minIndex] ?? 0, language)} p.u. Höchste Spannung an Knoten ${data.mvBusIds[maxIndex]}: ${formatPu(state.u?.[maxIndex] ?? 0, language)} p.u.`,
                    `Lowest voltage at node ${data.mvBusIds[minIndex]}: ${formatPu(state.u?.[minIndex] ?? 0, language)} p.u. Highest voltage at node ${data.mvBusIds[maxIndex]}: ${formatPu(state.u?.[maxIndex] ?? 0, language)} p.u.`
                  )}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <section className={styles.block} aria-labelledby="netz-n1">
          <h2 id="netz-n1">
            <WithTip id="n-1" language={language}>{tx("(n-1) im Testnetz", "(n-1) in the test grid")}</WithTip>
          </h2>
          {storageOn && stateN1 && baseN1 ? (
            <p>{outageComparison({ language, baseFailed: baseN1.failed, failed: stateN1.failed, newly: stateN1.newlyFailed.length, noLonger: stateN1.noLongerFailed.length })}</p>
          ) : null}
          {!storageOn && baseN1 ? <p>{outageBasis(language, baseN1.failed)}</p> : null}
          {outagesSkipped(state) ? <p>{outageSkipped(language)}</p> : null}
          {baseN1 ? <p>{outageMemory(language, baseN1.failed)}</p> : null}
          <p>
            {outageModel(language)} <GlossaryTip id="trennstelle" language={language} />
          </p>
          {storageOn && stateN1 ? (
            <div className={styles.tableWrap}>
              <ElementTable title={tx("Neu betroffen", "Newly affected")} tokens={stateN1.newlyFailed} data={data} language={language} />
              <ElementTable title={tx("Nicht mehr betroffen", "No longer affected")} tokens={stateN1.noLongerFailed} data={data} language={language} />
            </div>
          ) : null}
        </section>

        <section className={styles.block} aria-labelledby="netz-kipp">
          <h2 id="netz-kipp">
            <WithTip id="hosting-capacity" language={language}>{tx("Kipppunkt", "Tipping point")}</WithTip>
          </h2>
          <p>
            {tip >= 100
              ? tx(`${nodeName} hält im Normalbetrieb mindestens 100 MW. Das ist die Rechengrenze.`, `${nodeName} holds at least 100 MW in normal operation. That is the calculation limit.`)
              : tx(`${nodeName} hält im Normalbetrieb bis etwa ${formatTip(tip, language)} MW.`, `${nodeName} holds up to about ${formatTip(tip, language)} MW in normal operation.`)}
          </p>
          <p>{tx("Kipppunkt heißt: größte Leistung, bei der im Normalbetrieb alle angenommenen Grenzen halten. Er sagt nichts über (n-1).", "Tipping point means the largest power at which all assumed limits still hold in normal operation. It says nothing about (n-1).")}</p>
          <div className={styles.tableWrap}>
            <table>
              <caption>{tx("Fünf engste Knoten in diesem Fall und dieser Richtung", "Five tightest nodes in this case and direction")}</caption>
              <thead>
                <tr>
                  <th scope="col">{tx("Knoten", "Node")}</th>
                  <th scope="col">{tx("Strang", "Feeder")}</th>
                  <th scope="col">{tx("Kipppunkt", "Tipping point")}</th>
                </tr>
              </thead>
              <tbody>
                {tightest.map((item) => {
                  const named = data.nodes.find((entry) => entry.bus === item.bus);
                  return (
                    <tr key={item.bus}>
                      <th scope="row">{named ? `${named.id} (${item.bus})` : item.bus}</th>
                      <td>{item.strand}</td>
                      <td>{item.tip >= 100 ? tx("mindestens 100 MW", "at least 100 MW") : `${formatTip(item.tip, language)} MW`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${styles.block} ${styles.limits}`} aria-labelledby="netz-grenzen">
          <h2 id="netz-grenzen">{tx("Grenzen dieser Rechnung", "Limits of this calculation")}</h2>
          <ol>
            {limitsItems(language).map((item, index) => (
              <li key={item}>
                {item}
                {index === 1 ? <> <GlossaryTip id="stufensteller" language={language} /></> : null}
                {index === 0 ? (
                  <>
                    {" "}
                    <WithTip id="spannung-pu" language={language}>{tx("Spannung in p.u.", "Voltage in p.u.")}</WithTip>
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <section className={`${styles.block} ${styles.sources}`} aria-labelledby="netz-entstehung">
          <h2 id="netz-entstehung">{tx("So entstanden die Zahlen", "How the figures were made")}</h2>
          <p>{tx("Die Seite schlägt vorab gerechnete Zustände nach. Im Browser wird nichts gerechnet.", "The page looks up states that were calculated in advance. Nothing is calculated in the browser.")}</p>
          <p>
            <a href="/methodik#netz">{tx("Annahmen, Formeln und Handrechnung in der Methodik", "Assumptions, formulas and the hand calculation in the method")}</a>
          </p>
          <p>
            <a href={SCRIPT_URL}>{tx("Erzeugungsskript im Repository", "Generation script in the repository")}</a>
            {" · "}
            <a href={CHECKER_URL}>{tx("Unabhängiger Nachrechner", "Independent checker")}</a>
          </p>
          <p>{tx("Die Ergebnisdatei wird nur von dieser Seite geladen. Sie wird nicht als Download angeboten, weil nicht abschließend belegt ist, ob sie eine abgeleitete Datenbank ist.", "The result file is loaded only by this page. It is not offered for download, because it is not conclusively established whether it is a derivative database.")}</p>
          <h2>{tx("Quellen", "Sources")}</h2>
          <ul>
            <li><a href="https://doi.org/10.3390/en13123290">Meinecke et al., Energies 13(12), 3290, 2020</a></li>
            <li><a href="https://doi.org/10.1109/TPWRS.2018.2829021">Thurner et al., IEEE Trans. Power Systems 33(6), 2018</a></li>
            <li><a href="https://doi.org/10.34890/752">Meinecke et al., CIRED 2019, Paper 0139</a></li>
          </ul>
          <p className={styles.odbl}>
            {odblNotice(language)} {odblAttribution(language)}{" "}
            <a href="https://simbench.de">simbench.de</a>
            {" · "}
            <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>
          </p>
        </section>
      </div>
    </div>
  );
}

function ElementTable({ title, tokens, data, language }: { title: string; tokens: string[]; data: NetzDemoFile; language: AppLanguage }) {
  const rows = elementRows(tokens, data, language);
  const preview = rows.slice(0, 5);
  return (
    <div className={styles.tableWrap}>
      <table>
        <caption>{title}</caption>
        <ElementHead language={language} />
        <tbody>
          {preview.length === 0 ? (
            <tr>
              <td colSpan={3}>{language === "de" ? "Keine." : "None."}</td>
            </tr>
          ) : (
            preview.map((row) => <ElementRow key={row.key} row={row} />)
          )}
        </tbody>
      </table>
      {rows.length > 5 ? (
        <details>
          <summary>{language === "de" ? `Alle ${rows.length} anzeigen` : `Show all ${rows.length}`}</summary>
          <table>
            <ElementHead language={language} />
            <tbody>
              {rows.map((row) => <ElementRow key={`all-${row.key}`} row={row} />)}
            </tbody>
          </table>
        </details>
      ) : null}
    </div>
  );
}

function ElementHead({ language }: { language: AppLanguage }) {
  return (
    <thead>
      <tr>
        <th scope="col">{language === "de" ? "Betriebsmittel" : "Element"}</th>
        <th scope="col" className={styles.colWide}>{language === "de" ? "Art" : "Kind"}</th>
        <th scope="col" className={styles.colWide}>{language === "de" ? "Länge" : "Length"}</th>
      </tr>
    </thead>
  );
}

function ElementRow({ row }: { row: { key: string; name: string; detail: string; length: string } }) {
  return (
    <tr>
      <th scope="row">{row.name}</th>
      <td className={styles.colWide}>{row.detail}</td>
      <td className={styles.colWide}>{row.length}</td>
    </tr>
  );
}
