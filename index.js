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
    let config = await getConfig({
      app,
      context,
      configName: core.getInput('config-name')
    })

    const deviceName = core.getInput('device-name')
    const buildType = core.getInput('build-type')
    const tagTemplate = core.getInput('version-bump')

    // If we have a device name and build type use that for the template
    if (deviceName && buildType) {
      config['version-template'] =
        deviceName + '_v$MAJOR.$MINOR.$PATCH-' + buildType + '.$BUILD'
    }

    if (tagTemplate) {
      switch (tagTemplate.toLowerCase()) {
        case 'build':
          config['name-template'] = '$NEXT_BUILD_VERSION'
          config['tag-template'] = '$NEXT_BUILD_VERSION'
          break
        case 'patch':
          config['name-template'] = '$NEXT_PATCH_VERSION'
          config['tag-template'] = '$NEXT_PATCH_VERSION'
          break
        case 'minor':
          config['name-template'] = '$NEXT_MINOR_VERSION'
          config['tag-template'] = '$NEXT_MINOR_VERSION'
          break
        case 'major':
          config['name-template'] = '$NEXT_MAJOR_VERSION'
          config['tag-template'] = '$NEXT_MAJOR_VERSION'
      }
    }
    if (config === null) return

    // GitHub Actions merge payloads slightly differ, in that their ref points
    // to the PR branch instead of refs/heads/master
    const ref = process.env['GITHUB_REF'] || context.payload.ref

    const branch = ref.replace(/^refs\/heads\//, '')

    if (!isTriggerableBranch({ branch, app, context, config })) {
      return
    }

    const { draftRelease, lastRelease, lastTaggedRelease } = await findReleases(
      {
        app,
        context,
        deviceName,
        buildType
      }
    )

    const {
      commits,
      pullRequests: mergedPullRequests
    } = await findCommitsWithAssociatedPullRequests({
      app: app,
      context: context,
      branch: branch,
      lastRelease: lastRelease
    })

    const sortedMergedPullRequests = sortPullRequests(
      mergedPullRequests,
      config['sort-by'],
      config['sort-direction']
    )

    const releaseInfo = generateReleaseInfo({
      commits: commits,
      config: config,
      lastRelease: lastTaggedRelease,
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
