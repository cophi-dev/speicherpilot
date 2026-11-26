import { fireEvent, render, screen } from "@testing-library/react";

import { BessKarteCanvas3d } from "@/components/bess-netzbetreiber/BessKarteCanvas3d";
import { type Camera3d, DEFAULT_CAMERA_3D } from "@/lib/bessKarte3d/projection3d";
import type { BundeslaenderGeoJson, KarteSite } from "@/lib/bessKarte3d/types";

const SAMPLE_GEO: BundeslaenderGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Bayern" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [9.5, 47.5],
            [13.0, 47.5],
            [13.0, 50.0],
            [9.5, 50.0],
            [9.5, 47.5],
          ],
        ],
      },
    },
  ],
};

const SAMPLE_SITES: KarteSite[] = [
  {
    lok: "LOK-TEST-1",
    name: "Testspeicher",
    bl: "BY",
    lk: "München",
    lat: 48.14,
    lng: 11.58,
    nettoMw: 50,
    bruttoMw: 55,
    kapMwh: 100,
    unitsCount: 1,
    einspeisung: "voll",
    geprueftAlle: true,
    geprueftCount: 1,
    span: "Hochspannung",
    earliestIbn: "2025-01-01",
    latestIbn: "2025-01-01",
    einheiten: [],
  },
];

function pointerEvent(
  type: "pointerdown" | "pointermove" | "pointerup",
  init: { pointerId: number; clientX: number; clientY: number; pointerType?: string },
) {
  const ev = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX,
    clientY: init.clientY,
  });
  Object.defineProperty(ev, "pointerId", { value: init.pointerId });
  Object.defineProperty(ev, "pointerType", { value: init.pointerType ?? "touch" });
  return ev;
}

describe("BessKarteCanvas3d Touch-Gesten (Mobil)", () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null);
    HTMLCanvasElement.prototype.setPointerCapture = jest.fn();
    HTMLCanvasElement.prototype.releasePointerCapture = jest.fn();
    HTMLCanvasElement.prototype.hasPointerCapture = jest.fn(() => true);
  });

  it("lässt einen Finger die Kamera unangetastet und zoomt/dreht mit zwei Fingern", () => {
    let cam: Camera3d = DEFAULT_CAMERA_3D;
    const onCameraChange = jest.fn((next: Camera3d) => {
      cam = next;
    });
    const onResetCamera = jest.fn();

    render(
      <BessKarteCanvas3d
        hero
        touchFriendly
        geoJson={SAMPLE_GEO}
        bundeslaender={[]}
        sites={SAMPLE_SITES}
        modus="mw"
        maxScaleValue={140}
        showAbregelung={false}
        selectedLok={null}
        onSelectSite={jest.fn()}
        camera={cam}
        onCameraChange={onCameraChange}
        onResetCamera={onResetCamera}
      />,
    );

    const canvas = screen.getByRole("img");
    expect(canvas.tagName).toBe("CANVAS");
    expect(canvas.className).toContain("canvas3d");

    // Ein Finger zieht: keine Kamerabewegung (Seite darf scrollen, wie #156).
    fireEvent(canvas, pointerEvent("pointerdown", { pointerId: 1, clientX: 100, clientY: 200 }));
    fireEvent(canvas, pointerEvent("pointermove", { pointerId: 1, clientX: 160, clientY: 250 }));
    fireEvent(canvas, pointerEvent("pointerup", { pointerId: 1, clientX: 160, clientY: 250 }));

    expect(onCameraChange).not.toHaveBeenCalled();
    expect(cam.yawDeg).toBe(DEFAULT_CAMERA_3D.yawDeg);
    expect(cam.tiltDeg).toBe(DEFAULT_CAMERA_3D.tiltDeg);
    expect(cam.zoom).toBeCloseTo(DEFAULT_CAMERA_3D.zoom, 5);

    // Zwei Finger spreizen -> zoomt hinein; seitliche Bewegung dreht.
    const zoomBefore = cam.zoom;
    fireEvent(canvas, pointerEvent("pointerdown", { pointerId: 2, clientX: 100, clientY: 200 }));
    fireEvent(canvas, pointerEvent("pointerdown", { pointerId: 3, clientX: 200, clientY: 200 }));
    fireEvent(canvas, pointerEvent("pointermove", { pointerId: 3, clientX: 280, clientY: 200 }));
    fireEvent(canvas, pointerEvent("pointerup", { pointerId: 3, clientX: 280, clientY: 200 }));
    fireEvent(canvas, pointerEvent("pointerup", { pointerId: 2, clientX: 100, clientY: 200 }));

    expect(cam.zoom).toBeGreaterThan(zoomBefore);

    // Reset-Knopf (⌂) ruft onResetCamera auf
    fireEvent.click(screen.getByRole("button", { name: "Ansicht zurücksetzen" }));
    expect(onResetCamera).toHaveBeenCalledTimes(1);
  });
});
