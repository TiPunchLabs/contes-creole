# Transition durations, baseline d60c1a6 vs final 3d09931

Real clock, headless GPU Chrome (vsync-capped, nice 19), 2 fresh contexts per viewport. ms from the click on the next button to the new page text shown (page number changed and .mila-story.is-on), polled on requestAnimationFrame. A functional measure, not a perf number.

| viewport | transition | baseline run1 / run2 | final run1 / run2 | delta (mean final - mean baseline) ms |
| -------- | ---------- | -------------------- | ----------------- | ------------------------------------- |
| desktop  | 6->7       | 7650 / 7644          | 7649 / 7645       | 0.0                                   |
| desktop  | 7->8       | 5445 / 5447          | 5430 / 5448       | -7.0                                  |
| desktop  | 8->9       | 5448 / 5446          | 5446 / 5430       | -9.0                                  |
| desktop  | 9->10      | 5845 / 5846          | 5846 / 5845       | 0.0                                   |
| desktop  | 10->11     | 7647 / 7647          | 7648 / 7647       | 0.5                                   |
| mobile   | 6->7       | 7689 / 7686          | 7677 / 7680       | -9.0                                  |
| mobile   | 7->8       | 5479 / 5465          | 5480 / 5479       | 7.5                                   |
| mobile   | 8->9       | 5481 / 5461          | 5481 / 5463       | 1.0                                   |
| mobile   | 9->10      | 5878 / 5879          | 5879 / 5879       | 0.5                                   |
| mobile   | 10->11     | 7679 / 7681          | 7681 / 7680       | 0.5                                   |

Fixed fake-clock durations (TURN_MS in qa/mila-underwater.mjs): 6->7 7700, 7->8 5500, 8->9 5500, 9->10 5900, 10->11 7700 ms. See the table for the measured arrival times against these values.
