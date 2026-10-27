import { writeFileSync } from "fs";
import path from "path";

import { buildBeispieltageFile } from "@/lib/beispieltageBuild";

const target = path.join(process.cwd(), "data", "beispieltage.json");
const file = buildBeispieltageFile();
writeFileSync(target, `${JSON.stringify(file, null, 2)}\n`);
const days = file.days.map((day) => `${day.dateBerlin} ${day.revenueEur.x1}`).join(", ");
console.log(`Wrote ${target} (${days}), median ${file.medianDayRevenueX1}`);
