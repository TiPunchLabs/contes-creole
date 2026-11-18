# Regression suites against the final build 3d09931

Commands: QA_CHANNEL=chrome SITE=http://localhost:4197/ OUT=<dir> nice -n 19 node qa/<suite>.mjs for qa/mila.mjs, qa/mila-nav.mjs, qa/mila-lang.mjs (headless GPU Chrome). Baseline lists are from the d60c1a6 runs made earlier (port 4198).

## mila

- final: 143/150 checks passed
- baseline: 143/150 checks passed
- failing assertions, final:
  - FAIL desktop no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found) | console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL mobile no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL landscape no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL keys no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL reduced no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL kannot-desktop no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL kannot-mobile no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
- failing on final but not on baseline (exact line match):
  - none
- failing on baseline but not on final:
  - none

## mila-nav

- final: 87/110 checks passed
- baseline: 87/110 checks passed
- failing assertions, final:
  - FAIL survey-mila-desktop no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found) | console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL survey-kannot-desktop no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL survey-mila-laptop no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL survey-kannot-laptop no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL survey-mila-tablet no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL survey-kannot-tablet no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL survey-mila-mobile no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL survey-kannot-mobile no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL survey-mila-narrow no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL survey-kannot-narrow no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL survey-mila-landscape no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL survey-kannot-landscape no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL journey-desktop no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL journey-mobile no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL rapid no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL rapid-reduced no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL crab no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL crab-reduced no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL swipe-mobile no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL swipe-landscape no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL kannot-desktop no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL kannot-mobile swipe
  - FAIL kannot-mobile no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
- failing on final but not on baseline (exact line match):
  - none
- failing on baseline but not on final:
  - none

## mila-lang

- final: 48/60 checks passed
- baseline: 48/60 checks passed
- failing assertions, final:
  - FAIL text no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found) | console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL scene no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL flight no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL flight-reduced no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL session no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL layout-desktop no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL layout-mobile no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL layout-narrow no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL layout-landscape no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL overflow-narrow no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL overflow-landscape no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
  - FAIL kannot no-errors — console: Failed to load resource: the server responded with a status of 404 (Not Found)
- failing on final but not on baseline (exact line match):
  - none
- failing on baseline but not on final:
  - none
