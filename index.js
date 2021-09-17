// Lambda@Edge function, (re)writing first-party user UUIDs
// Author: Krisjan Oldekamp / Stacktonic.com
// Email: krisjan@stacktonic.com

'use strict';

const { v4: uuidv4 } = require('uuid');
const cookie = require('cookie');
const cookieName = 'FPD'; // Cookie name containing first-party identifier
const cookieLifetime = 730; // Cookie expiration of user UUID in days (2 years) 

exports.handler = async (event, context) => {
    
    const request = event.Records[0].cf.request;
    const response = event.Records[0].cf.response;

    try {
    
        const requestHeaders = request.headers;
        const responseHeaders = response.headers;

        // Generate random UUID.
        let uuid = uuidv4();
        let setCookie = false;

        if (requestHeaders.cookie) {
            // Get all cookie information from request headers
            let cookies = cookie.parse(requestHeaders.cookie[0].value);
            
            // Check if user UUID cookie is present and get existing UUID value from requestheaders.
            if (cookies[cookieName] !== undefined) {
                uuid = cookies[cookieName];
            } 
            
            // Check for presence of user UUID cookie. If not present, (re)write cookie
            if (cookies[cookieName] === undefined) {
                setCookie = true;
            }
           
        } else {
            setCookie = true;
        }

        // Set or extend cookies when neccesarry.
        if (setCookie === true) {
            let domainTld = (requestHeaders.host[0].value).split(/\./).slice(-2).join('.');

            // Build user cookie string with user UUID.
            let cookieStringUser = cookie.serialize(cookieName, String(uuid), {
                domain: '.' + domainTld,
                path: '/',
                secure: true,
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * cookieLifetime 
            });

            // Set HTTP cookies in response.
            responseHeaders['set-cookie'] = [{
                key: 'set-cookie',
                value: cookieStringUser
            }];
        }
        return response;
    } catch(err) {
        console.log(`Error handling response: ${err}`)
    }
    return response;
};