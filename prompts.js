const inquirer = require('inquirer')

async function promptForCredentials () {
  var questions = [
    {
      type: 'input',
      name: 'srcDomain',
      message: 'Source domain to copy Webtasks from (src.auth0.com)'
    },
    {
      type: 'input',
      name: 'srcClientId',
      message: 'Source Client ID'
    },
    {
      type: 'input',
      name: 'srcClientSecret',
      message: 'Source Client Secret'
    },
    {
      type: 'input',
      name: 'trgtDomain',
      message: 'Target domain to copy Webtasks to (trgt.auth0.com) '
    },
    {
      type: 'input',
      name: 'trgtClientId',
      message: 'Target Client ID'
    },
    {
      type: 'input',
      name: 'trgtClientSecret',
      message: 'Target Client Secret'
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
    'Skip those rules when copying'
  ]

  const response = await inquirer.prompt([
    {
      type: 'list',
      name: 'rulesConflictChoice',
      message: 'What would you like to do?',
      choices
    }
  ])

  return response.rulesConflictChoice === choices[1]
}

async function promptOnConnectionConflicts () {
  const choices = [
    'Copy them over as new Connections (prefixed with "migrated-")',
    'Skip those connections when copying'
  ]

  const response = await inquirer.prompt([
    {
      type: 'list',
      name: 'connectionsConflictChoice',
      message: 'What would you like to do?',
      choices
    }
  ])

  return response.connectionsConflictChoice === choices[1]
}

module.exports = {
  promptForCredentials,
  promptForResources,
  promptOnRuleConflicts,
  promptOnConnectionConflicts
}
