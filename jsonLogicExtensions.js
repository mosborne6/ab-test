import { l as logicExports } from './_virtual/logic.js';

// Add a wildcard match function
logicExports.add_operation("wildcard", (value, pattern) => {
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  return regex.test(value);
});

// Add a regex match function
logicExports.add_operation("regex", (value, pattern, flags = "") => {
  if (typeof value !== "string" || typeof pattern !== "string") {
    return false;
  }
  const regex = new RegExp(pattern, flags);
  return regex.test(value);
});
