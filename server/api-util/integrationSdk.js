const sharetribeIntegrationSdk = require('sharetribe-flex-integration-sdk');

// The Integration API application (Console → Build → Advanced → Applications)
// gives the server operator-level access — used for cart stock adjustments and
// transaction metadata. These env vars must never be exposed to the browser.
const CLIENT_ID = process.env.INTEGRATION_CLIENT_ID;
const CLIENT_SECRET = process.env.INTEGRATION_CLIENT_SECRET;

exports.hasIntegrationCredentials = () => !!CLIENT_ID && !!CLIENT_SECRET;

exports.getIntegrationSdk = () => {
  if (!exports.hasIntegrationCredentials()) {
    const error = new Error(
      'Integration API credentials are missing. Set INTEGRATION_CLIENT_ID and INTEGRATION_CLIENT_SECRET in the environment.'
    );
    error.status = 500;
    error.statusText = 'integration-credentials-missing';
    error.data = {};
    throw error;
  }
  return sharetribeIntegrationSdk.createInstance({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
  });
};
