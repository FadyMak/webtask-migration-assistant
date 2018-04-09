const ManagementClient = require('auth0').ManagementClient
const prompts = require('./prompts')
const messages = require('./messages')

let auth0Source = null
let auth0Target = null

async function getResources () {
  const resources = await Promise.all([
    auth0Source.getRules(),
    auth0Source.getConnections(),
    auth0Target.getRules(),
    auth0Target.getConnections()
  ])

  return resources
}

async function createRulesInTarget (srcRawRules, conflicts, skipConflicts) {
  let rulesToCreate = []
  let conflictingRuleIds = conflicts.map(c => c.id)

  for (let srcRule of srcRawRules) {
    if (conflictingRuleIds.includes(srcRule.id)) {
      if (!skipConflicts) {
        srcRule.name = `migrated-${srcRule.name}`
        rulesToCreate.push(srcRule)
      }
    } else {
      rulesToCreate.push(srcRule)
    }
  }

  // maintain relative ordering of rules in target tenant
  rulesToCreate.sort((a, b) => a.order - b.order)

  let failedRules = []
  let successfulRules = []

  // create rules in target tenant
  for (let rule of rulesToCreate) {
    try {
      delete rule.id

      // All new Rules will be added to the end of the Rules list in the target
      // tenant
      delete rule.order

      await auth0Target.rules.create(rule)
      successfulRules.push(rule)
    } catch (e) {
      failedRules.push({
        rule,
        message: e.message
      })
      messages.failedToCreateResource('Rule', rule, e.message)
    }
  }

  messages.successfullyCreatedResources('Rules', successfulRules.length)
}

async function createConnectionsInTarget (srcRawCxns, conflicts, skipConflicts) {
  let cxnsToCreate = []
  let conflictingCxnIds = conflicts.map(c => c.id)

  for (let srcCxn of srcRawCxns) {
    if (conflictingCxnIds.includes(srcCxn.id)) {
      if (!skipConflicts) {
        srcCxn.name = `migrated-${srcCxn.name}`

        // update the realms to match the updated name
        if (srcCxn.realms) {
          srcCxn.realms = srcCxn.realms.map(realm => {
            return `migrated-${realm}`
          })
        }

        cxnsToCreate.push(srcCxn)
      }
    } else {
      cxnsToCreate.push(srcCxn)
    }
  }

  let customDbWithConfig = []

  let failedCxns = []
  let successfulCxns = []

  // create Connections in target tenant
  for (let cxn of cxnsToCreate) {
    try {
      delete cxn.id
      delete cxn.enabled_clients

      // delete `realms` for Custom Social Connections
      if (cxn.strategy === 'oauth2' && cxn.realms) {
        delete cxn.realms
      }

      // add any Connections with `configuration` values to remind the user
      // to copy it from their prod to dev tenant manually
      if (cxn.options && cxn.options.configuration) {
        customDbWithConfig.push({
          name: cxn.name,
          keys: Object.keys(cxn.options.configuration)
        })
      }

      // delete configuration values since they're encrypted using the source
      // tenant's private key and will not be usable by the target tenant
      if (cxn.options && cxn.options.configuration) {
        delete cxn.options.configuration
      }

      await auth0Target.connections.create(cxn)
      successfulCxns.push(cxn)
    } catch (e) {
      failedCxns.push({
        cxn,
        message: e.message
      })
      messages.failedToCreateResource('Connection', cxn, e.message)
    }
  }

  messages.successfullyCreatedResources('Connections', successfulCxns.length)

  if (Object.keys(customDbWithConfig).length > 0) {
    messages.customDbWithConfigWarning(customDbWithConfig)
  }
}

function processRules (srcRawRules, trgtRawRules) {
  let conflicts = []

  if (srcRawRules.length > 0 && trgtRawRules.length > 0) {
    for (let trgtRule of trgtRawRules) {
      const matchingRules = srcRawRules.filter(srcRule => {
        return trgtRule.name === srcRule.name
      })
      conflicts = [...conflicts, ...matchingRules]
    }
  }

  return conflicts
}

function processConnections (srcRawConnections, trgtRawConnections) {
  let cxnConflicts = []

  const customConnections = srcRawConnections.filter(connection => {
    return (
      (
        connection.strategy === 'auth0' &&
        connection.options.enabledDatabaseCustomization &&
        connection.options.customScripts
      ) || (connection.strategy === 'oauth2')
    )
  })

  for (let trgtCxn of trgtRawConnections) {
    const matchingCxns = customConnections.filter(srcCxn => {
      return trgtCxn.name === srcCxn.name
    })
    cxnConflicts = [...cxnConflicts, ...matchingCxns]
  }

  return { customConnections, cxnConflicts }
}

(async function () {
  const creds = await prompts.promptForCredentials()

  auth0Source = new ManagementClient({
    domain: creds.srcDomain,
    clientId: creds.srcClientId,
    clientSecret: creds.srcClientSecret,
    scope: 'read:connections read:rules',
  })

  auth0Target = new ManagementClient({
    domain: creds.trgtDomain,
    clientId: creds.trgtClientId,
    clientSecret: creds.trgtClientSecret,
    scope: 'read:connections read:rules create:connections create:rules',
  })

  let srcRawRules, srcRawConnections, trgtRawRules, trgtRawConnections = []

  try {
    [
      srcRawRules,
      srcRawConnections,
      trgtRawRules,
      trgtRawConnections
    ] = await getResources()
  } catch (e) {
    if (e.name && e.name === 'access_denied') {
      messages.accessDeniedError()
    } else {
      console.log(e)
    }
    process.exit()
  }

  const resources = await prompts.promptForResources()

  if (resources.includes('Rules')) {
    const ruleConflicts = processRules(srcRawRules, trgtRawRules)
    let skipConflictingRules = false

    if (ruleConflicts.length > 0) {
      messages.conflictingResourceName('Rule', ruleConflicts)
      skipConflictingRules = await prompts.promptOnRuleConflicts()
    }

    await createRulesInTarget(srcRawRules, ruleConflicts, skipConflictingRules)
  }

  if (resources.includes('Connections (Custom DB and Custom Social)')) {
    const {
      customConnections,
      cxnConflicts
    } = processConnections(srcRawConnections, trgtRawConnections)

    let skipConflictingCxns = false

    if (cxnConflicts.length > 0) {
      messages.conflictingResourceName('Connection', cxnConflicts)
      skipConflictingCxns = await prompts.promptOnConnectionConflicts()
    }

    await createConnectionsInTarget(customConnections, cxnConflicts, skipConflictingCxns)
  }

  messages.migrationCompleted()
})();
