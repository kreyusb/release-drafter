const { getConfig } = require('./lib/config')
const { isTriggerableBranch } = require('./lib/triggerable-branch')
const {
  findReleases,
  generateReleaseInfo,
  createRelease,
  updateRelease
} = require('./lib/releases')
const { findCommitsWithAssociatedPullRequests } = require('./lib/commits')
const { sortPullRequests } = require('./lib/sort-pull-requests')
const log = require('./lib/log')
const core = require('@actions/core')

module.exports = app => {
  app.on('push', async context => {
    const config = await getConfig({
      app,
      context,
      configName: core.getInput('config-name')
    })

    const deviceName = core.getInput('device-name')

    if (config === null) return

    // GitHub Actions merge payloads slightly differ, in that their ref points
    // to the PR branch instead of refs/heads/master
    const ref = process.env['GITHUB_REF'] || context.payload.ref

    const branch = ref.replace(/^refs\/heads\//, '')

    if (!isTriggerableBranch({ branch, app, context, config })) {
      return
    }

    const { draftRelease, lastRelease } = await findReleases({
      app,
      context,
      deviceName
    })
    const {
      commits,
      pullRequests: mergedPullRequests
    } = await findCommitsWithAssociatedPullRequests({
      app,
      context,
      branch,
      lastRelease
    })

    const sortedMergedPullRequests = sortPullRequests(
      mergedPullRequests,
      config['sort-by'],
      config['sort-direction']
    )

    const releaseInfo = generateReleaseInfo({
      commits,
      config,
      lastRelease,
      mergedPullRequests: sortedMergedPullRequests,
      version: core.getInput('version') || undefined,
      tag: core.getInput('tag') || undefined,
      name: core.getInput('name') || undefined,
      deviceName: core.getInput('device-name') || undefined
    })

    const shouldDraft = core.getInput('publish').toLowerCase() !== 'true'

    let createOrUpdateReleaseResponse
    if (!draftRelease) {
      log({ app, context, message: 'Creating new release' })

      createOrUpdateReleaseResponse = await createRelease({
        context,
        releaseInfo,
        shouldDraft,
        config
      })
    } else {
      log({ app, context, message: 'Updating existing release' })
      createOrUpdateReleaseResponse = await updateRelease({
        context,
        draftRelease,
        releaseInfo,
        shouldDraft,
        config
      })
    }

    var outputTag = ''
    if (releaseInfo && releaseInfo.tag) {
      outputTag = releaseInfo.tag
    } else if (draftRelease && draftRelease.tag_name) {
      outputTag = draftRelease.tag_name
    } else {
      outputTag = undefined
    }

    setActionOutput(createOrUpdateReleaseResponse, outputTag)
  })
}

function setActionOutput(releaseResponse, releaseTag) {
  const {
    data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
  } = releaseResponse
  if (releaseTag) core.setOutput('release_tag', releaseTag)
  if (releaseId && Number.isInteger(releaseId))
    core.setOutput('id', releaseId.toString())
  if (htmlUrl) core.setOutput('html_url', htmlUrl)
  if (uploadUrl) core.setOutput('upload_url', uploadUrl)
}
