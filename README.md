# Mini-Traycer

A VS Code extension that acts as a planning layer for coding agents. Generate, refine, and export detailed implementation plans for coding tasks before execution.

## Features
- Analyze codebase structure and context
- Generate step-by-step plans using Gemini 2.5 Pro
- Interactive plan editor and tree view
- Export plans for handoff to other coding agents (Claude, Cursor, etc.)
- Seamless integration with VS Code workflows

## Installation
1. Clone this repo
2. Run `npm install`
3. Add your Gemini API key to `.env` (see `.env.example`)
4. Run and debug in VS Code (see `.vscode/launch.json`)

## Usage
- Open command palette: `Mini-Traycer: Create Plan`
- Enter your coding task/feature
- Review and refine the generated plan
- Export plan via `Mini-Traycer: Export Plan`

## API Key Setup
Create a `.env` file:
```
GEMINI_API_KEY=your-key-here
```
Get your key from Google AI Studio.

## Development
- TypeScript, VS Code extension API
- See `.vscode/tasks.json` for build tasks
- Debug using `.vscode/launch.json`

## Example Plan
```
{
  "title": "Add user authentication",
  "description": "Implement login, registration, and session management.",
  "steps": [
    { "description": "Analyze existing user model", "type": "ANALYSIS" },
    { "description": "Design authentication flow", "type": "IMPLEMENTATION" },
    { "description": "Implement login UI", "type": "IMPLEMENTATION" },
    { "description": "Write tests", "type": "TESTING" }
  ]
}
```

## Vision
Mini-Traycer demonstrates the Traycer AI concept: a planning layer that generates actionable, iterative plans for coding agents.

## License
MIT
