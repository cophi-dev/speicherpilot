#!/usr/bin/env bash
# Externer Morgen-Auslöser für den nationalen Flotten-Nachtlauf.
#
# Der GitHub-Cron (04:30 UTC = 05:30 Europe/Berlin) startete 18.–24.11.2026
# durchgängig erst gegen 13:45–16:06 Europe/Berlin (8–11 h Verzug). Deshalb
# darf die Morgen-Garantie nicht am Schedule hängen.
#
# Vorgesehen: vor 06:00 Europe/Berlin auslösen, z. B. cron
#   0 5 * * *  /path/to/scripts/national_fleet_nachtlauf_ausloesen.sh
# workflow_dispatch startet typischerweise zeitnah; Ziel: Kapitel 03 für
# /tag/{gestern} vor 08:00 Europe/Berlin.
#
# Erfordert: gh (repo+actions), Authentifizierung mit Recht "actions:write".
# Schreibt nicht selbst nach main — startet nur den bestehenden Workflow.
set -euo pipefail
REPO="${REPO:-cophi-dev/speicherpilot}"
WORKFLOW="${WORKFLOW:-national-fleet-nachtlauf.yml}"

gh workflow run "$WORKFLOW" -R "$REPO"
echo "Nachtlauf per workflow_dispatch ausgelöst ($(date +%Y-%m-%dT%H:%M:%S%z))."
