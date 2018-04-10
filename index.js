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
  const action = skipConflicts === 1 ? 'update' : 'create'

  for (let srcRule of srcRawRules) {
    if (!conflicts[srcRule.id] || action === 'update') {
      rulesToCreate.push(srcRule)
    } else if (!skipConflicts) {
      srcRule.name = `migrated-${srcRule.name}`
      rulesToCreate.push(srcRule)
    }
  }

  // maintain relative ordering of rules in target tenant
  rulesToCreate.sort((a, b) => a.order - b.order)

  let failedRules = []
  let successfulRules = []

  // create/update rules in target tenant
  for (let rule of rulesToCreate) {
    try {
      const ruleId = rule.id
      delete rule.id
      // All new Rules will be added to the end of the Rules list in the target tenant
      delete rule.order

      if (action === 'update' && conflicts[ruleId]) {
        const ruleUpdateData = { ...rule }
        const ruleUpdateParams = { id: conflicts[ruleId] }
        delete ruleUpdateData.stage
        await auth0Target.rules.update(ruleUpdateParams, ruleUpdateData)
      } else {
        await auth0Target.rules.create(rule)
      }

      successfulRules.push(rule)
    } catch (e) {
      failedRules.push({
        rule,
        message: e.message
      })
      messages.failedToCreateResource('Rule', rule, action, e.message)
    }
  }

  messages.successfullyCreatedResources('Rules', successfulRules.length, action)
}

async function createConnectionsInTarget (srcRawCxns, conflicts, skipConflicts) {
  let cxnsToCreate = []
  let conflictingCxnIds = Object.keys(conflicts)
  const action = skipConflicts === 1 ? 'update' : 'create'

  for (let srcCxn of srcRawCxns) {
    if (!conflicts[srcCxn.id] || action === 'update') {
      cxnsToCreate.push(srcCxn)
    } else if (!skipConflicts) {
      srcCxn.name = `migrated-${srcCxn.name}`

      // update the realms to match the updated name
      if (srcCxn.realms) {
        srcCxn.realms = srcCxn.realms.map(realm => {
          return `migrated-${realm}`
        })
      }

      cxnsToCreate.push(srcCxn)
    }
  }

  let customDbWithConfig = []

  let failedCxns = []
  let successfulCxns = []

  // create Connections in target tenant
  for (let cxn of cxnsToCreate) {
    try {
      const cxnId = cxn.id
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

      if (action === 'update' && conflicts[cxnId]) {
        const cxnUpdateData = { ...cxn }
        const cxnUpdateParams = { id: conflicts[cxnId] }
        delete cxnUpdateData.name
        delete cxnUpdateData.strategy
        await auth0Target.connections.update(cxnUpdateParams, cxnUpdateData)
      } else {
        await auth0Target.connections.create(cxn)
      }

      successfulCxns.push(cxn)
    } catch (e) {
      failedCxns.push({
        cxn,
        message: e.message
      })
      messages.failedToCreateResource('Connection', cxn, action, e.message)
    }
  }

  messages.successfullyCreatedResources('Connections', successfulCxns.length, action)

  if (Object.keys(customDbWithConfig).length > 0) {
    messages.customDbWithConfigWarning(customDbWithConfig)
  }
}

function processRules (srcRawRules, trgtRawRules) {
  let conflicts = {}

  if (srcRawRules.length > 0 && trgtRawRules.length > 0) {
    for (let trgtRule of trgtRawRules) {
      srcRawRules
        .filter(srcRule => trgtRule.name === srcRule.name)
        .forEach(srcRule => {
          conflicts[srcRule.id] = trgtRule.id
        })
    }
  }

  return conflicts
}

function processConnections (srcRawConnections, trgtRawConnections) {
  let cxnConflicts = {}

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
    customConnections
      .filter(srcCxn => trgtCxn.name === srcCxn.name)
      .forEach(srcCxn => {
        cxnConflicts[srcCxn.id] = trgtCxn.id
      })
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
    scope: 'read:connections read:rules create:connections create:rules update:connections update:rules',
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
    let skipConflictingRules = 0

    const conflictingRuleIds = Object.keys(ruleConflicts)
    if (conflictingRuleIds.length > 0) {
      messages.conflictingResourceName('Rule', srcRawRules.filter(r => conflictingRuleIds.includes(r.id)))
      skipConflictingRules = await prompts.promptOnRuleConflicts()
    }

    await createRulesInTarget(srcRawRules, ruleConflicts, skipConflictingRules)
  }

  if (resources.includes('Connections (Custom DB and Custom Social)')) {
    const {
      customConnections,
      cxnConflicts
    } = processConnections(srcRawConnections, trgtRawConnections)

    let skipConflictingCxns = 0

    const conflictingCxnIds = Object.keys(cxnConflicts)
    if (conflictingCxnIds.length > 0) {
      messages.conflictingResourceName('Connection', srcRawConnections.filter(c => conflictingCxnIds.includes(c.id)))
      skipConflictingCxns = await prompts.promptOnConnectionConflicts()
    }

    await createConnectionsInTarget(customConnections, cxnConflicts, skipConflictingCxns)
  }

  messages.migrationCompleted()
})();
