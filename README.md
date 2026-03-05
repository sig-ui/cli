# @sig-ui/cli

CLI for SigUI scaffolding, token generation, config checks, and component template installation.

## Install

```bash
bun add -d @sig-ui/cli
```

Run without installing:

```bash
bunx sigui --help
```

## Commands

### `sigui init`

Creates `sigui.config.js`, bootstraps `src/sigui/`, and generates initial CSS.

```bash
bunx sigui init
bunx sigui init --brand=#e11d48
```

### `sigui build`

Generates token output files from config.

```bash
bunx sigui build
bunx sigui build --watch
```

### `sigui check`

Runs config and quality checks.

```bash
bunx sigui check
bunx sigui check --layout
bunx sigui check --full
bunx sigui check --json
```

### `sigui add`

Copies component templates from the SigUI registry.

```bash
bunx sigui add button card stack
bunx sigui add --list
bunx sigui add dialog --dry-run
bunx sigui add card --dir=src/ui/components
```

Useful flags: `--overwrite`, `--from=local`, `--registry=<url>`.

## Config typing

```js
/** @type {import("@sig-ui/theme").SiguiConfig} */
const config = { brand: "#6366f1" };

export default config;
```
