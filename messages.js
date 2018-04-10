const chalk = require('chalk')

const error = chalk.bold.red
const warning = chalk.keyword('orange').bold
const success = chalk.green.bold

function successfullyCreatedResources (type, count, action) {
  console.log(success(`${count} ${type}(s) have been ${action}d in the target tenant\n`))
}

function failedToCreateResource (type, resource, action, errorMessage) {
  console.log(error(`Failed to ${action} the ${type} "${resource.name}" in the target tenant\n`))
  console.log(errorMessage)
}

function customDbWithConfigWarning (customDbWithConfig) {
  console.log(warning(`${Object.keys(customDbWithConfig).length} Connection(s) contain the configuration values listed below. Be sure to set the appropriate config in your target (development) tenant: \n`))
  console.log(customDbWithConfig.map(c => `${c.name}: ${c.keys.join(', ')}`).join('\n'))
  console.log('\n')
}

function conflictingResourceName (type, resources) {
  console.log(warning(`\n${resources.length} ${type}(s) with the same name have been found between the source and target tenants:\n`))
  console.log(resources.map(r => `  - ${r.name}`).join('\n'))
  console.log('\n')
}

function accessDeniedError () {
  console.log(warning('The migration assistant ran into an error while trying to obtain an access token for the Management API\n'))
  console.log(`Please ensure the credentials entered are correct and the appropriate scopes have been granted:\n`)
  console.log(`  1. Ensure that the you have correctly setup a Non-Interactive Client to access the Auth0 Management API in both your source and target tenants.`)
  console.log(`    (See: https://auth0.com/docs/api/management/v2/tokens#automate-the-process)`)
  console.log(`  2. The source (production) tenant requires that the Client is granted the following scopes: read:connections read:rules`)
  console.log(`  3. The target (development) tenant, requires that the Client is granted the following scopes: read:connections read:rules create:connections create:rules update:connections update:rules`)
  console.log('\n')
}

function migrationCompleted () {
  console.log(success('The migration has successfully been completed!\n'))

  console.log(chalk.blue.underline.bold('Next steps:\n'))
  console.log('  1. Add any configuration values that your Rules need to correctly function in your target (development) tenant')
  console.log('  2. Ensure that any Rules that reference tenant-specific variables such as Client IDs are updated accordingly')
  console.log('  3. Add any configuration values that your Custom Database scripts need to correctly function in your target (development) tenant')
  console.log('  4. Enable any Clients for the Connections that have been migrated to your target (development) tenant')
  console.log('  5. Manually copy over any Hooks from your production to development tenant')
  console.log('  6. Enable the Node 8 runtime (https://manage.auth0.com/#/tenant/advanced) and test your login flows')
  console.log('\n')
  console.log(chalk.blue.underline.bold('Helpful resources:\n'))
  console.log('  Migration Guide: https://auth0.com/docs/migrations/extensibility-node8.html')
  console.log('  Auth0 Community: https://community.auth0.com/')
  console.log('  Auth0 Support: https://support.auth0.com/')
  console.log('  Breaking changes between Node v4 LTS and v6 LTS: https://github.com/nodejs/node/wiki/Breaking-changes-between-v4-LTS-and-v6-LTS')
  console.log('  Breaking changes between v6 LTS and v8 LTS: https://github.com/nodejs/node/wiki/Breaking-changes-between-v6-LTS-and-v8-LTS')
  console.log('\n')
  console.log(chalk.bold('Report any issues with the migration assistant: https://github.com/auth0/webtask-migration-assistant/issues'))
  console.log('\n')  
}

module.exports = {
  successfullyCreatedResources,
  failedToCreateResource,
  conflictingResourceName,
  customDbWithConfigWarning,
  accessDeniedError,
  migrationCompleted
}
