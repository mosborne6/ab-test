# Demo of A/B testing framework with Tesfy
This is purely for demonstration purposes to help illustrate how an open-source framework can be used in an EdgeWorker to provide A/B and multivariate testing.

## Extendable extension logic
jsonLogicExtensions.js can accept additional extensions to augment logic/criteria (such as using wildcards and regex in experiments).

## TTLCache
Used to allow the JS execution to temporarily cache the config.json file in memory for optimial performance.

## Config.json
Responsible for defining experiments. Could be cached on a CDN too for added performance.

## Main.js & Bundle.json
Base files used in an EdgeWorker.

## Node_Modules & _Virtual
Imported Tesfy and related dependencies for ES6 usage.
