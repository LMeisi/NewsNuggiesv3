// Use in setting timeout limit for fetching
import { TIMEOUT_SEC } from "./config.js";

//Timeout function
//Below function will return a rejected promise after a certain # of secs
// e.g. timeout(3) means after 3 seconds, timeout function returns a rejected promise with the specified error message
// Note below promise will never return a resolved value (_, reject)
export const timeout = function (s) {
  return new Promise(function (_, reject) {
    setTimeout(function () {
      reject(new Error(`Request took too long! Timeout after ${s} second`));
    }, s * 1000);
  });
};
