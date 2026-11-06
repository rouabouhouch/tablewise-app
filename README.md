# Tablewise

[Open Tablewise on GitHub Pages](https://rouabouhouch.github.io/tablewise-app/)

Open a CSV to chart relationships, inspect data quality and train a model in your browser. Start with the synthetic bike-trip sample or select **Open CSV** to explore your own records.

## Published files

| Path | Purpose |
| --- | --- |
| `data/` | CSV parsing, profiling, descriptive statistics and the synthetic sample |
| `ml/` | Data splits, preprocessing, regression, classification and new-row inference |
| `app/` | Workspace state, browser interactions and training-worker management |
| `ui/` | Screen renderers, reusable charts, shared components and HTML reports |
| `styles/` | Layout, component and responsive styles |
| `core.js` | Public API for importing the data and ML functions without the UI |
| `app.js`, `worker.js` | Browser and training-worker entry points |

To run this release locally, serve the repository root with `python3 -m http.server 8080` and open `http://localhost:8080`. GitHub Pages publishes the root of `main` at the link above.
