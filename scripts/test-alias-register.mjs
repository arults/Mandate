import { register } from "node:module";

register(new URL("./test-alias-hooks.mjs", import.meta.url), import.meta.url);

