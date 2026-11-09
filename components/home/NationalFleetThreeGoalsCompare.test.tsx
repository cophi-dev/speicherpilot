import { render, screen } from "@testing-library/react";

import { NationalFleetThreeGoalsCompare } from "@/components/home/NationalFleetThreeGoalsCompare";
import { buildThreeGoalsCompare } from "@/lib/nationalFleetThreeGoals";
import { loadNationalFleetBundleMeta } from "@/lib/nationalMonthFleetModel.server";

describe("NationalFleetThreeGoalsCompare", () => {
  it("renders compare figure", () => {
    const model = buildThreeGoalsCompare(loadNationalFleetBundleMeta() as never);
    render(
      <NationalFleetThreeGoalsCompare
        model={model}
        monthKey="2026-10"
        activeFactor={1}
        activeStrategy="ueberschuss"
        marktPeakFootnote="Test-Fußnote."
      />,
    );
    expect(screen.getByTestId("three-goals-compare")).toBeInTheDocument();
    expect(screen.getByText(/Test-Fußnote/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Dieselbe Flotte, drei Fahrweisen/ })).toBeInTheDocument();
  });
});
