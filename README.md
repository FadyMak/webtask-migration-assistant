# Webtask Migration Assistant

The Webtask Migration Assistant is a simple CLI tool that copies over your Rules, Custom Database Connection scripts, and Custom Social Connection scripts from a source tenant to a target tenant.

- **Source tenant**: your production Auth0 account
- **Target tenant**: your development Auth0 account

Once the resources have been copied over to your development tenant, it is up to you to test the login flows to ensure that scripts behave as intended after you have enabled the Node 8 runtime.

## Pre-Requisites

The Migration Assistant relies on the Management API to copy resources from one tenant to the other. As such, you will need to:

1. Ensure that the you have correctly setup a Non-Interactive Client to access the Auth0 Management API in both your source and target tenants. (See: https://auth0.com/docs/api/management/v2/tokens#automate-the-process)
2. The source (production) tenant requires that the Client is granted the following scopes: `read:connections` `read:rules`
3. The target (development) tenant, requires that the Client is granted the following scopes: `read:connections` `read:rules` `create:connections` `create:rules` `update:connections` `update:rules`

## Running the Migration Assistant

- Ensure you are using Node v8 or later
- Clone this repository
- Install the dependencies: `npm install`
- Run the Migration Assistant: `node index.js`

## Naming Conflicts

If your target (development) tenant is newly created and contains no pre-existing Rules or Connections, you do not have to worry about naming conflicts.

If your target (development) tenant contains Connections/Rules which have the same name as the source (production) tenant, then the Migration Assistant will list those resources and ask you to select one of three options:

1. Copy over the rules/connections that have the same name and prefix them with `migrated-`
2. Update the rules/connections that have the same name
3. Skip the rules/connections that have the same name when copying them between tenants

## Next Steps

After you have successfully run through the Migration Assistant, we recommend you take the following steps:

1. Add any configuration values that your Rules need to correctly function in your target (development) tenant
2. Ensure that any Rules that reference tenant-specific variables such as Client IDs are updated accordingly
3. Add any configuration values that your Custom Database scripts need to correctly function in your target (development) tenant
4. Enable any Clients for the Connections that have been migrated to your target (development) tenant
5. Manually copy over any Hooks from your production to development tenant
6. Enable the Node 8 runtime (https://manage.auth0.com/#/tenant/advanced) and test your login flows

## Helpful Resources

- [Migration Guide](https://auth0.com/docs/migrations/extensibility-node8.html)
- [Auth0 Community](https://community.auth0.com/)
- [Auth0 Support](https://support.auth0.com/)
- [Breaking changes between Node v4 LTS and v6 LTS](https://github.com/nodejs/node/wiki/Breaking-changes-between-v4-LTS-and-v6-LTS)
- [Breaking changes between v6 LTS and v8 LTS](https://github.com/nodejs/node/wiki/Breaking-changes-between-v6-LTS-and-v8-LTS)
