/**
 * Prints the local clone → run → judge path. Does not start the server.
 * npm is the stack. There is no Makefile.
 */
console.log(`Local judge path

npm install
npm run dev
Open http://127.0.0.1:8080/console
Leave Advanced closed. Run travel agent.
Same five asks as the preview: Allow-list hotel.near, airline.near, rides.near.
Dry quote: submitted false, tx hash none, or dry quote not attached.
Intents dry quote · not an FCK vault.

After that Run, on this same process:
curl POST http://127.0.0.1:8080/api/v1/pay
curl POST http://127.0.0.1:8080/api/mcp
Before a policy is published, both return no_policy (409).

npm test
Asserted verdicts include src/lib/attack-suite.test.ts and src/lib/intents-fidelity.test.ts.

Full steps: README.md → Local judge path.
`);
