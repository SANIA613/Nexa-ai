# Nexa AI — Personal Productivity Assistant

A modern full-stack personal productivity workspace built with React, TypeScript, Tailwind CSS, Express, and Google Gemini AI.

---

## 💻 Visual Studio Code Setup & Features

This project includes first-class configurations for **Visual Studio Code**:

### 📦 Recommended Extensions (`.vscode/extensions.json`)
When opening this workspace in VS Code, you will be prompted to install recommended extensions:
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) — Class autocomplete and hover previews
- **Prettier - Code Formatter** (`esbenp.prettier-vscode`) — Auto-formatting on save
- **ESLint** (`dbaeumer.vscode-eslint`) — Real-time syntax and quality checks
- **Error Lens** (`usernamehw.errorlens`) — Inline diagnostics and type errors
- **Path IntelliSense** (`christian-kohler.path-intellisense`) — Autocomplete for file paths
- **ES7+ React/Redux/React-Native snippets** (`dsznajder.es7-react-js-snippets`)
- **Auto Rename Tag** & **Auto Close Tag** (`formulahendry.*`)

### ⚙️ Workspace Settings (`.vscode/settings.json`)
- **Format on Save**: Automatically cleans code with Prettier and organizes imports on save
- **Path Aliasing**: Seamless `@/*` module resolution matching `tsconfig.json`
- **File Nesting**: Keeps explorer tree tidy by grouping build configs and source files
- **Tailwind IntelliSense**: Enabled for `.tsx`, `.ts`, and `cn()` helper classes

### 🐞 Debugging & Launch Profiles (`.vscode/launch.json`)
Press <kbd>F5</kbd> or go to the **Run & Debug** panel to use:
- **Debug Full Stack (Client + Server)** — Launches both Express backend and Chrome browser debugger
- **Debug Server (Node/tsx)** — Debug backend API endpoints and Gemini handlers with breakpoints
- **Debug Client (Chrome)** — Debug React front-end components and state in Chrome

### ⚡ Tasks (`.vscode/tasks.json`)
Run via <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> or **Terminal > Run Task**:
- **`dev: start server`** — Starts the dev server with live output
- **`build: production build`** — Compiles client & bundles server
- **`lint: type check`** — TypeScript type verification

---

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` and fill in any required keys:
   ```bash
   cp .env.example .env
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

4. **Build for Production:**
   ```bash
   npm run build
   ```

5. **Type Check:**
   ```bash
   npm run lint
   ```
