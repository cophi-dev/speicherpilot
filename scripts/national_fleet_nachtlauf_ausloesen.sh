#!/usr/bin/env bash
# Externer Morgen-Auslöser für den nationalen Flotten-Nachtlauf.
#
# Der GitHub-Cron (04:30 UTC = 05:30 Europe/Berlin) startete 18.–24.11.2026
# durchgängig erst gegen 13:45–16:06 Europe/Berlin (8–11 h Verzug). Deshalb
# darf die Morgen-Garantie nicht am Schedule hängen.
#
# Vorgesehen: 05:00 Europe/Berlin auslösen, z. B. cron
#   0 5 * * *  /path/to/scripts/national_fleet_nachtlauf_ausloesen.sh
# workflow_dispatch startet typischerweise zeitnah; Ziel: Kapitel 03 und
# data/auffaelligkeit-woche/tage/{gestern}.json vor 08:00 Europe/Berlin.
#
# Erfordert:
# 1) Die vorgeschlagene Datei scripts/national-fleet-nachtlauf.workflow.yml
#    liegt unter .github/workflows/national-fleet-nachtlauf.yml
#    (dafür braucht es Phillipp oder ein Token mit workflow-Scope).
#    Erst diese YAML ruft nach dem Nachtlauf scripts/auffaelligkeit_woche.py auf.
# 2) gh mit Recht actions:write zum Auslösen.
#
# Schreibt nicht selbst nach main — startet nur den Workflow.
set -euo pipefail
REPO="${REPO:-cophi-dev/speicherpilot}"
WORKFLOW="${WORKFLOW:-national-fleet-nachtlauf.yml}"

gh workflow run "$WORKFLOW" -R "$REPO"
echo "Nachtlauf per workflow_dispatch ausgelöst ($(date +%Y-%m-%dT%H:%M:%S%z))."
echo "Hinweis: Der Wochen-Schritt (tage/{gestern}.json) läuft nur, wenn die vorgeschlagene workflow.yml live liegt."
