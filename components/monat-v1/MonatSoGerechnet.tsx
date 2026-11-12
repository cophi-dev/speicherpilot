import Link from "next/link";

import { SoGerechnetBlock } from "@/components/home/SoGerechnetBlock";
import { fleetPowerGwLabel } from "@/lib/fleetXkConvention";
import { formatGwAbs, formatGwReduction, MONAT_V1_GRAPH_CAPTION, MONAT_V1_KERN3 } from "@/lib/monatV1Format";
import type { MonatV1Model } from "@/lib/monatV1Model";

export function MonatSoGerechnet({ model }: { model: MonatV1Model }) {
  const cats = model.duration;
  return (
    <SoGerechnetBlock id="monat-so-gerechnet">
      <p>{model.pageFootnote}</p>
      <p>{MONAT_V1_GRAPH_CAPTION}</p>
      <p>{MONAT_V1_KERN3}</p>
      <p>
        Quellen und Annahmen:{" "}
        <Link href="/methodik#monat-konzept-ac" className="v4-text-link">
          Methodik → Monatsmodell
        </Link>
        {" · "}
        <Link href="/methodik#simulator-annahmen" className="v4-text-link">
          Simulator-Annahmen
        </Link>
        .
      </p>
      <table className="v4-monat-so-table num">
        <caption>Markt bei ×10 ohne Preisrückwirkung gerechnet.</caption>
        <thead>
          <tr>
            <th scope="col">Fahrweise</th>
            <th scope="col">×1</th>
            <th scope="col">×10</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Spitze</th>
            <td>{formatGwAbs(model.heroTable.spitzeX1, 1)}</td>
            <td>{formatGwAbs(model.heroTable.spitzeX10, 1)}</td>
          </tr>
          <tr>
            <th scope="row">Überschuss</th>
            <td>{formatGwAbs(model.heroTable.ueberschussX1, 1)}</td>
            <td>{formatGwAbs(model.heroTable.ueberschussX10, 1)}</td>
          </tr>
          <tr>
            <th scope="row">Markt</th>
            <td>{formatGwAbs(model.heroTable.marktX1, 1)}</td>
            <td>{formatGwAbs(model.heroTable.marktX10, 2)}</td>
          </tr>
        </tbody>
      </table>
      <table className="v4-monat-so-table num">
        <caption>Spitzensenkung je Dauer</caption>
        <thead>
          <tr>
            <th scope="col">Stufe</th>
            <th scope="col">1,76 h</th>
            <th scope="col">2 h</th>
            <th scope="col">4 h</th>
          </tr>
        </thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.factor}>
              <th scope="row">×{c.factor}</th>
              <td>{formatGwReduction(c.h176, 2)}</td>
              <td>{formatGwReduction(c.h2, 2)}</td>
              <td>{formatGwReduction(c.h4, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="v4-monat-so-list num">
        {model.pool.map((row) => (
          <li key={`p-${row.factor}`}>
            ×{row.factor} · {fleetPowerGwLabel(row.factor)} · Pool {row.poolLabel}
          </li>
        ))}
      </ul>
    </SoGerechnetBlock>
  );
}
