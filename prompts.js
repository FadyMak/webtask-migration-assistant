const inquirer = require('inquirer')

async function promptForCredentials () {
  var questions = [
    {
      type: 'input',
      name: 'srcDomain',
      message: 'Source domain to copy Webtasks from (src.auth0.com)',
      validate (value) {
        if (value) return true

        return 'Please enter a source domain. It should be of the format (src.auth0.com, src.eu.auth0.com, etc...)'
      }
    },
    {
      type: 'input',
      name: 'srcClientId',
      message: 'Source Client ID',
      validate: validateClientId
    },
    {
      type: 'input',
      name: 'srcClientSecret',
      message: 'Source Client Secret',
      validate: validateClientSecret
    },
    {
      type: 'input',
      name: 'trgtDomain',
      message: 'Target domain to copy Webtasks to (trgt.auth0.com)',
      validate (value) {
        if (value) return true

        return 'Please enter a target domain. It should be of the format (target.auth0.com, target.eu.auth0.com, etc...)'
      }
    },
    {
      type: 'input',
      name: 'trgtClientId',
      message: 'Target Client ID',
      validate: validateClientId
    },
    {
      type: 'input',
      name: 'trgtClientSecret',
      message: 'Target Client Secret',
      validate: validateClientSecret
    }
  ]

  return await inquirer.prompt(questions)
}

async function promptForResources () {
  const selections = await inquirer.prompt([
    {
      type: 'checkbox',
      message: 'Select the resources you would like to copy from the source to target tenant',
      name: 'resources',
      choices: [
        {
          name: 'Rules'
        },
        {
          name: 'Connections (Custom DB and Custom Social)'
        }
      ]
    }
  ])

  return selections.resources
}

async function promptOnRuleConflicts () {
  const choices = [
    'Copy them over as new Rules (prefixed with "migrated-")',
    'Update existing rules in place',
    'Skip conflicting rules when copying'
  ]

  const response = await inquirer.prompt([
    {
      type: 'list',
      name: 'rulesConflictChoice',
      message: 'What would you like to do?',
      choices
    }
  ])

  return choices.indexOf(response.rulesConflictChoice)
}

async function promptOnConnectionConflicts () {
  const choices = [
    'Copy them over as new Connections (prefixed with "migrated-")',
    'Update existing connections in place',
    'Skip conflicting connections when copying'
  ]

  const response = await inquirer.prompt([
    {
      type: 'list',
      name: 'connectionsConflictChoice',
      message: 'What would you like to do?',
      choices
    }
  ])

  return choices.indexOf(response.connectionsConflictChoice)
}

function validateClientId (value) {
  if (value) return true

  return 'Please enter a Client ID'
}

function validateClientSecret (value) {
  if (value) return true

  return 'Please enter a Client Secret'
}

module.exports = {
  promptForCredentials,
  promptForResources,
  promptOnRuleConflicts,
  promptOnConnectionConflicts
}
