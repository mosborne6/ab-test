/*
Note: this is sample code for the purposes of getting started quickly in a POC-style environment.
Akamai makes no assurances that this code is 'production-ready' and would be [customer] responsibility to functionally test and apply the EdgeWorker according to good practices.
Akamai Professional Services can help assist and provide guidance with designing for optimal performance, failures etc.
Please see our online documentation for more details:
 - Best Practices: https://techdocs.akamai.com/edgeworkers/docs/best-practices
 - Designing for Failure: https://techdocs.akamai.com/edgeworkers/docs/site-failover
 - Limitations: https://techdocs.akamai.com/edgeworkers/docs/limitations
*/

// Import modules
import { logger } from 'log';
import { Cookies, SetCookie } from 'cookies';
import { experiments } from 'export_experiments.js';

const cookieName = "Cohort";
let arrExperimentURLs = [];
let randomValue = null;

export function onClientRequest(request) {
  let experimentID = "";
  let experimentVariant = "";
  let experimentOptions = "";
  let percentGtrThan = null;
  let percentLessOrEqThan = null;
  let bExperimentURLFound = false;
  let bExperimentTriggered = false;
  
  // define arrays for the request headers (to cater to multiple experiments being stored into custom headers)
  let arrExperimentIds = [];
  let arrExperimentVariants = [];
  let arrExperimentOptions = [];

  // Check for previously hit experiment variants stored in cookie
  const cookies = new Cookies(request.getHeader('Cookie'));
  randomValue = cookies.get(cookieName);

  // check if cookie exists and use that percentage value.
  // if does not exist, generate random value.
  if (randomValue == null || randomValue == "") {
    randomValue = Math.random().toFixed(2);
  }
  logger.info("rand:" + randomValue.toString());
  
  // LOAD IN EXPERIMENTS FROM JSON/JS file.
  
  // for each experiment...build and run through experiment logic.
  for(let e = 0; e < experiments.length; e++) {
    if(experiments[e]) {

      // extract values from JSON for experiment
      experimentID = experiments[e].id
      experimentVariant = experiments[e].variant
      experimentOptions = experiments[e].options
      percentGtrThan = experiments[e].percentGtrThan / 100
      percentLessOrEqThan = experiments[e].percentLessOrEqThan / 100
      arrExperimentURLs = experiments[e].urls
      bExperimentURLFound = false;

      // first visit experiment logic OR if experiment variant found in cookie
      // e.g. 50-100% requests OR already in experiment, check if requested URL matches experiment and apply headers for origin
      if (randomValue > percentGtrThan && randomValue <= percentLessOrEqThan) {
        logger.info("exp: " + experimentID);
        // check requested url matches experiment URLs in scope
        if (arrExperimentURLs != null && arrExperimentURLs != "") {
          if (experimentURLExists(request.path)) {
            bExperimentURLFound = true;
            logger.info("exp url triggered");
          } else {
            // requested URL not in experiment scope (despite percentage falling into experiment).
            // skip this experiment.
            bExperimentURLFound = false;
          }
        } else {
          // no URLs specified - applies to all. So force true.
          bExperimentURLFound = true;
          logger.info("exp url triggered");
        }
      }
            
      // if URL matches experiment or experiment found in cookie, add headers to array for origin use.
      if (bExperimentURLFound) {
        arrExperimentIds.push(experimentID); // could trigger something in app-stack...
        arrExperimentVariants.push(experimentID+"="+experimentVariant); // could trigger something in app-stack...
        arrExperimentOptions.push(experimentOptions); // could trigger something in app-stack...
        bExperimentTriggered = true;
      }

    } else {
      logger.info("no exps found");
    }
  } // end of for-loop for experiments.

  // if any experiments triggered - add array values to headers for origin signalling.
  if (bExperimentTriggered) {
    request.setHeader('X-Experiment-Id', arrExperimentIds.join('|'));
    request.setHeader('X-Experiment-Variant', arrExperimentVariants.join(';'));
    request.setHeader('X-Experiment-Options', arrExperimentOptions.join(';'));
    request.setHeader('X-Experiment-Cohort', randomValue.toString());

    request.setVariable('PMUSER_PAGE_VARIATION', arrExperimentVariants.join(';'));
    request.cacheKey.includeVariable('PMUSER_PAGE_VARIATION');

  } else {
    // no experiments triggered for this request - ask origin to maintain cookie value anyway to keep consistent experience for session.
    request.setHeader('X-Experiment-Cohort', randomValue.toString());
  }

}

export function onClientResponse(request, response) {
  // set session persistence for returning visits to ensure same experience
  // ignore BMP JS path (if EW is running on EMPTY_STRING extensions/pages by checking first 30 chars of path)
  let bmpjspath = request.getVariable('PMUSER_BMP_JS').toLowerCase().substr(0,30);
  if (!request.path.toLowerCase().includes(bmpjspath)) {
     // Create or extend ab-variant cookie
     let variantId = randomValue.toString();
     if (variantId) {
         let expDate = new Date();
         expDate.setDate(expDate.getDate() + 1);
         let setCohortCookie = new SetCookie({name: "Cohort", value: randomValue.toString(), expires: expDate});
         response.addHeader('Set-Cookie', setCohortCookie.toHeader());
     }
  }
}

function experimentURLExists(req_url) {
  for (const expURL of arrExperimentURLs) {
    const regex = new RegExp('^' + expURL.replace(/\*/g, '.*') + '$');
    if (regex.test(req_url.toLowerCase())) {
      return true;
    }
  }
  return false;
  //return arrExperimentURLs.includes(req_url.toLowerCase());
}






// Some headers aren't safe to forward from the origin response through an EdgeWorker on to the client
// For more information see the tech doc on create-response: https://techdocs.akamai.com/edgeworkers/docs/create-response
export const UNSAFE_RESPONSE_HEADERS = ['content-length', 'transfer-encoding', 'connection', 'vary',
  'accept-encoding', 'content-encoding', 'keep-alive',
  'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'upgrade'];

function getSafeResponseHeaders(headers) {
  for (let unsafeResponseHeader of UNSAFE_RESPONSE_HEADERS) {
      if (unsafeResponseHeader in headers) {
          delete headers[unsafeResponseHeader]
      }
  }
  return headers;
}

