<!-- source: https://json-render.dev/docs -->
# json-render Introduction

json-render is "a framework for Generative UI — AI-generated interfaces that are safe, predictable, and render natively on any platform."

## Key Distinction

Unlike traditional AI integrations where interfaces remain static and AI fills in data, json-render enables AI to generate the interface structure itself—determining which components appear, their arrangement, data connections, and actions.

## Core Workflow

The framework operates in three steps:

1. **Define a catalog** specifying available components and actions with typed properties
2. **AI generates a JSON spec** constrained to that catalog, describing the UI structure
3. **Components render the spec** natively using a registry mapping catalog types to platform implementations

## Central Concepts

- **Catalog**: Defines the contract between app and AI
- **Registry**: Maps catalog types to platform-specific implementations
- **Specs**: JSON output describing UI structure as a flat element tree
- **Streaming**: Enables progressive rendering as AI responds
- **Data Binding**: Connects props to runtime data and state
- **Visibility**: Conditionally shows/hides elements based on state

This approach maintains AI creativity within developer-controlled boundaries, eliminating hallucinations and unsafe code execution.
