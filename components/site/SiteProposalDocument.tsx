"use client";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { AppLanguage } from "@/components/language-context";
import { formatQuantity, formatYears } from "@/lib/formatQuantity";
import type { LoadProfile, SitePlan, VoltageLevel } from "@/lib/sitePlanner";
import { registerPdfFonts } from "@/lib/pdfFonts";

registerPdfFonts();

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontFamily: "IBM Plex Sans",
    backgroundColor: "#F4F3EE",
    color: "#1C1B19",
    fontSize: 10,
  },
  kicker: {
    fontFamily: "IBM Plex Mono",
    fontSize: 9,
    letterSpacing: 1.2,
    color: "#5E5A52",
    textTransform: "uppercase",
  },
  title: { fontSize: 22, marginTop: 8, fontWeight: 500 },
  banner: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#1C1B19",
    fontFamily: "IBM Plex Mono",
    fontSize: 9,
  },
  row: { flexDirection: "row", marginTop: 16, gap: 8 },
  tile: { flex: 1, borderWidth: 1, borderColor: "#D5D1C6", borderLeftWidth: 3, borderLeftColor: "#0B6870", padding: 8 },
  tileLabel: { fontFamily: "IBM Plex Mono", fontSize: 8, color: "#5E5A52", textTransform: "uppercase" },
  tileValue: { fontFamily: "IBM Plex Mono", fontSize: 14, marginTop: 4 },
  h2: { fontSize: 12, fontWeight: 500, marginTop: 16 },
  p: { marginTop: 4, lineHeight: 1.4, color: "#3A3834" },
  line: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#D5D1C6", paddingVertical: 4 },
  muted: { color: "#5E5A52" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontFamily: "IBM Plex Mono", fontSize: 8, color: "#5E5A52" },
});

export function SiteProposalDocument({
  plan,
  profile,
  language,
  enteredVoltage,
}: {
  plan: SitePlan;
  profile: LoadProfile;
  language: AppLanguage;
  enteredVoltage: VoltageLevel;
}) {
  const de = language === "de";
  const tx = (german: string, english: string) => (de ? german : english);
  const qty = (value: number, digits = 0) => formatQuantity(value, language, digits);
  const impact =
    plan.gridImpact === "reduces"
      ? tx("senkt die Spitze am Netzanschlusspunkt", "lowers the peak at the connection point")
      : plan.gridImpact === "increases"
        ? tx("hebt die Spitze am Netzanschlusspunkt", "raises the peak at the connection point")
        : tx("lässt die Spitze am Netzanschlusspunkt unverändert", "leaves the peak at the connection point unchanged");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.kicker}>SpeicherPilot · {tx("Standortvorschlag", "Site proposal")}</Text>
        <Text style={styles.title}>{tx("Speicher und Netzanschluss", "Storage and grid connection")}</Text>
        <Text style={styles.p}>
          {tx(
            "Herstellerneutraler Modellvorschlag. Keine Angebotsbinde, keine Anschlusszusage, keine Rechtsberatung.",
            "Vendor-neutral model proposal. Not a binding quote, not a connection offer, and not legal advice."
          )}
        </Text>
        {profile.synthetic ? <Text style={styles.banner}>BEISPIELDATEN · {profile.sourceNote}</Text> : null}
        <View style={styles.row}>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>{tx("Speicher", "Storage")}</Text>
            <Text style={styles.tileValue}>
              {qty(plan.energyKwh)} kWh / {qty(plan.powerKw)} kW
            </Text>
            <Text style={styles.p}>
              C-Rate {qty(plan.cRate, 2)} · {qty(plan.durationHours, 1)} h
            </Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>{tx("Bezugsspitze", "Import peak")}</Text>
            <Text style={styles.tileValue}>
              {qty(plan.peakImportBeforeKw)} → {qty(plan.peakImportAfterKw)} kW
            </Text>
            <Text style={styles.p}>{impact}</Text>
          </View>
        </View>
        <Text style={styles.h2}>{tx("Wirtschaft, Modell", "Economics, model")}</Text>
        <View style={styles.line}>
          <Text>CAPEX</Text>
          <Text>{qty(plan.capexEur)} €</Text>
        </View>
        <View style={styles.line}>
          <Text>{tx("Leistungspreis-Ersparnis", "Demand-charge saving")}</Text>
          <Text>{qty(plan.demandChargeSavingsEur)} €/a</Text>
        </View>
        <View style={styles.line}>
          <Text>{tx("Arbitrage auf 15-min-Preisen", "Arbitrage on 15-min prices")}</Text>
          <Text>{qty(plan.arbitrageEur)} €/a</Text>
        </View>
        <View style={styles.line}>
          <Text>{tx("Jahresnutzen nach OPEX", "Annual benefit after OPEX")}</Text>
          <Text>{qty(plan.annualBenefitEur)} €/a</Text>
        </View>
        <View style={styles.line}>
          <Text>{tx("Amortisation", "Payback")}</Text>
          <Text>{formatYears(plan.paybackYears, language)}</Text>
        </View>
        <View style={styles.line}>
          <Text>NPV</Text>
          <Text>{qty(plan.npvEur)} €</Text>
        </View>
        <View style={styles.line}>
          <Text>{tx("Erlösstapelung", "Revenue stacking")}</Text>
          <Text>{tx("nicht gerechnet", "not calculated")}</Text>
        </View>
        <Text style={styles.p}>{plan.assumptions.priceNote}</Text>
        <Text style={styles.h2}>{tx("Anschluss, Planungshinweis", "Connection, planning hint")}</Text>
        <View style={styles.line}>
          <Text>{tx("Angefragt (ohne Speicher)", "Requested (without storage)")}</Text>
          <Text>{qty(plan.requestedConnectionKw)} kW</Text>
        </View>
        <View style={styles.line}>
          <Text>{tx("Verfügbar, eingegeben", "Available, as entered")}</Text>
          <Text>{qty(plan.availableConnectionKw)} kW</Text>
        </View>
        <View style={styles.line}>
          <Text>{tx("Spannung, Hinweis / gewählt", "Voltage, hint / entered")}</Text>
          <Text>
            {plan.voltageSuggestion.level} · {plan.voltageSuggestion.rule} / {enteredVoltage}
          </Text>
        </View>
        <Text style={styles.p}>
          {tx(
            "Schwellen: bis 135 kW NS, darüber bis 20 MW MS, darüber HS. Verweise auf VDE-AR-N 4105, 4110 und 4120, kein Wortlaut und keine Netzanschlusszusage.",
            "Bands: up to 135 kW LV, above that up to 20 MW MV, above that HV. References to VDE-AR-N 4105, 4110 and 4120, not the wording of the rules and not a connection offer."
          )}
        </Text>
        <Text style={styles.p}>
          {tx(
            "Verteilnetzbetreiber prüfen und schließen Speicher Dritter an. Dieses Blatt unterstellt nicht, dass sie den Speicher besitzen oder betreiben.",
            "Distribution operators assess and connect third-party storage. This sheet does not assume that they own or operate the storage."
          )}
        </Text>
        <Text style={styles.h2}>{tx("Annahmen", "Assumptions")}</Text>
        <Text style={styles.p}>{plan.assumptions.sizingRule}</Text>
        <Text style={styles.p}>
          RTE {qty(plan.assumptions.roundTripEfficiency * 100)} % · OPEX {qty(plan.assumptions.opexFractionOfCapex * 100, 1)} % CAPEX ·{" "}
          {tx("Betrieb", "Operation")}: {plan.operation === "market" ? tx("marktgetrieben", "market-driven") : tx("netzdienlich", "grid-serving")}
        </Text>
        <Text style={styles.p}>
          {tx("Nicht enthalten", "Excluded")}: {plan.assumptions.excluded.join(", ")}
        </Text>
        <Text style={styles.footer}>speicherpilot.app · {tx("Modellschätzung, Beispieldaten sind gekennzeichnet", "Model estimate; example data is labelled")}</Text>
      </Page>
    </Document>
  );
}
