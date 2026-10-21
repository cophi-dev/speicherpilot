"use client";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { AppLanguage } from "@/components/language-context";
import { formatQuantity, formatYears } from "@/lib/formatQuantity";
import { type LoadProfile, type SitePlan, type VoltageLevel } from "@/lib/sitePlanner";
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
  kind = "offer",
}: {
  plan: SitePlan;
  profile: LoadProfile;
  language: AppLanguage;
  enteredVoltage: VoltageLevel;
  kind?: "offer" | "connection";
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
        <Text style={styles.kicker}>SpeicherPilot · {kind === "connection" ? tx("Anschlussprüfung", "Connection check") : tx("Angebot", "Offer")}</Text>
        <Text style={styles.title}>{kind === "connection" ? tx("Netzanschluss", "Grid connection") : tx("Speicher und Netzanschluss", "Storage and grid connection")}</Text>
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
        {kind === "connection" ? (
          <>
            <Text style={styles.h2}>{tx("Netzlast", "Grid load")}</Text>
            <View style={styles.line}>
              <Text>{tx("Überschreitung ohne / mit Speicher", "Hours above the limit, without / with storage")}</Text>
              <Text>
                {qty(plan.exceedanceHoursBefore, 0)} h → {qty(plan.exceedanceHoursAfter, 0)} h
              </Text>
            </View>
            <View style={styles.line}>
              <Text>{tx("Einschätzung netzdienlich", "Grid-support estimate")}</Text>
              <Text>
                {plan.gridSupport.status} · {qty(plan.gridSupport.dischargeShareInPeaks * 100, 0)} %
              </Text>
            </View>
            <Text style={styles.p}>
              {tx(
                "Ob netzdienlicher Speicherbetrieb im örtlichen Verteilnetz Netzausbau vermeidet, kann nur der Netzbetreiber beurteilen; ihm steht dabei ein Entscheidungsspielraum zu. Die Bundesnetzagentur durfte ihre Vorgaben (Positionspapier 2009, Leistungspreismodell) als angemessen ansehen. BGH, Beschluss vom 15.07.2025, EnVR 1/24, Pressemitteilung 129/2025, https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025129.html. Stand 21.10.2026. Schwellen 90 %, 60 % und 30 % sind vorläufig.",
                "Whether grid-supportive storage operation avoids network expansion in the local distribution network can only be judged by the network operator; that operator has a margin of decision. The Federal Network Agency was entitled to regard its requirements (2009 position paper, capacity-price model) as appropriate. BGH, decision of 15 July 2025, EnVR 1/24, press release 129/2025, https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025129.html. As of 21 October 2026. The 90%, 60% and 30% thresholds are provisional."
              )}
            </Text>
          </>
        ) : null}
        {kind === "offer" ? <Text style={styles.h2}>{tx("Wirtschaft, Modell", "Economics, model")}</Text> : <Text style={styles.h2}>{tx("Modellhinweis", "Model note")}</Text>}
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
          {tx("Betrieb", "Operation")}: {plan.operation === "market" ? tx("marktgetrieben", "market-driven") : tx("netzorientiert", "grid-oriented")}
        </Text>
        <Text style={styles.p}>
          {tx("Nicht enthalten", "Excluded")}: {plan.assumptions.excluded.join(", ")}
        </Text>
        <Text style={styles.footer}>speicherpilot.app · {tx("Modellschätzung, Beispieldaten sind gekennzeichnet", "Model estimate; example data is labelled")}</Text>
      </Page>
    </Document>
  );
}
