import { httpRequest } from 'http-request';
import { Cookies, SetCookie } from 'cookies';
import { logger } from 'log';
import { Engine } from './node_modules/tesfy/dist/tesfy.esm.js';
import './jsonLogicExtensions.js';
import TTLCache from './TTLCache.js';

function generateQuickGuid() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const configCache = new TTLCache();

async function onClientRequest (request) {

    // We use a generated "userid" cookie as the user id
    // Perhaps one already exists, like JSESSIONID that
    // we can use instead?
    const cookies = new Cookies(request.getHeader('Cookie'));
    const userid = cookies.get("userid") || generateQuickGuid();

    // Store the user if so we can use it later when setting 
    // the cookie. This isn't required if we're not sending a
    // Set-Cookie
    request.setVariable("PMUSER_USERID", userid);

    // Load up our profile with all the params that we want to 
    // use to match on in the experiment
    // TODO: Add more stuff in here
    const profile = {
        useragent: request.getHeader("User-Agent"),
        force: cookies.get("force"),
        is_mobile: request.device.isMobile,
        is_tablet: request.device.isTablet,
        mobile_browser: request.device.mobileBrowser,
        os: request.device.os,
        brandname: request.device.brandName,
        country: request.userLocation.country,
        timezone: request.userLocation.timezone,
        continent: request.userLocation.continent,
        method: request.method,
        path: request.path,
    };

    logger.debug(JSON.stringify(profile, null, 2));

    // Find the config url
    const configurl = request.getVariable("PMUSER_CONFIGURL") || '/config.json';

    logger.debug(`configurl is ${configurl}`);

    // Try to obtain the config from memory cache
    let datafile = configCache.get(configurl);

    // If we don't have the config file in our memory cache,
    // let's go grab it from origin (or from Akamai cache)
    if (!datafile) {
        logger.debug("Cache miss, requesting config from origin");
        const response = await httpRequest(configurl, {});
        if (response.status === 200) {
            const text = await response.text();
            datafile = JSON.parse(text);
            const timeout = +request.getVariable("PMUSER_TIMEOUT") || 10000;
            configCache.put(configurl, datafile, timeout); 
        } else {
            logger.debug(`HTTP error ${response.status} when trying to obtain config file`);
        }
    }

    // If we have our config now, let's run the experiments
    if (datafile) {

        // Create the Tesfy engine and ask it for a list of cohorts
        // for this user
        const tesfy = new Engine({ datafile });
        const cohorts = tesfy.getVariationIds(userid, profile);
        const filteredCohorts = Object.fromEntries(
            Object.entries(cohorts).filter(([_, value]) => value !== null)
        );

        // The output is sent to origin as a header and we also insert 
        // into the cache key
        request.setHeader('X-Cohorts', JSON.stringify(filteredCohorts));
        request.setVariable("PMUSER_COHORTS", JSON.stringify(filteredCohorts));
        request.cacheKey.includeVariable('PMUSER_COHORTS');

    } else {
        logger.error("Can't get the config file!");
    }
}

function onClientResponse (request, response) {
    // Set the "userid" cookie. Perhaps this is not needed
    // if we're using an existing cookie instead	
    const cookies = new Cookies(request.getHeader('Cookie'));
    const submittedUserid = cookies.get("userid");
    const userid = request.getVariable("PMUSER_USERID");
    if (!submittedUserid && userid) {
        const cookie = new SetCookie();
        cookie.name = 'userid';
        cookie.value = userid;
        response.setHeader('Set-Cookie', cookie.toHeader());
    }
    response.setHeader('X-Cohorts', request.getVariable("PMUSER_COHORTS"));
}

export { onClientRequest, onClientResponse };
