# Journey, baseline d60c1a6 vs final 3d09931

Steps: open, 1->12, back to 6, forward to 10 (resizes on page 8, French switch on 7 and 9), back to tree, reopen. The /favicon.ico 404 is kept in the log but not counted as a failure (the script filters it).

| viewport | build    | steps | failed steps | passed |
| -------- | -------- | ----- | ------------ | ------ |
| desktop  | baseline | 24    | []           | True   |
| desktop  | final    | 24    | []           | True   |
| mobile   | baseline | 24    | []           | True   |
| mobile   | final    | 24    | []           | True   |

Console messages (verbatim: type, page at the time, text, url):

- desktop baseline:
  - error (page 0): Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico
  - error (page 1): Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico
- desktop final:
  - error (page 0): Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico
  - error (page 1): Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico
- mobile baseline:
  - error (page 1): Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico
- mobile final:
  - error (page 1): Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico

Console errors or warnings present final but not baseline:

- none
