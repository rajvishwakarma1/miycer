# Gemini Plan Generation Prompt Template

## User Requirement
{{requirement}}

## Codebase Context
{{codebase}}

## Output Format
- Generate a detailed, step-by-step implementation plan
- Each step should include: description, type, dependencies, estimated effort
- Use clear, actionable language
- Structure output as JSON matching the Plan and PlanStep interfaces

## Examples
- Feature addition, refactoring, bug fix, etc.

## Instructions
- Analyze the codebase context
- Break down the requirement into logical steps
- Specify dependencies and effort for each step
- Ensure plan is actionable and ready for handoff to coding agents
