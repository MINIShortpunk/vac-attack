#!/bin/bash
set -e
OUTPUT=$(node scripts/check-rankings.mjs)
echo "$OUTPUT"
if echo "$OUTPUT" | grep -q "RANK_CHANGES_DETECTED"; then
echo "has_changes=true" >> "$GITHUB_OUTPUT"
echo "$OUTPUT" | sed -n '/RANK_CHANGES_DETECTED/,$p' | tail -n +2 > changes.json
else
echo "has_changes=false" >> "$GITHUB_OUTPUT"
fi
