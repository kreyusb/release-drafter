const semver = require('semver')

const splitSemVer = (input, versionKey = 'version') => {
  if (!input[versionKey]) {
    return null
  }

  var version = input.inc
    ? semver.inc(input[versionKey], input.inc, true)
    : semver.parse(input[versionKey])

  // If this was a patch and pre-release was on hit it again or
  //   it will not increment properly
  if (input.inc == 'patch' && input[versionKey].prerelease.length != 0) {
    version = input.inc
      ? semver.inc(version, input.inc, true)
      : semver.parse(input[versionKey])
  }

  // Always append the pre-release version if available
  if (input.inc != 'prerelease' && input[versionKey].prerelease.length == 2) {
    version += '-' + input[versionKey].prerelease[0] + '.0'
  }

  const prerelease =
    semver.prerelease(version) && semver.prerelease(version).length == 2
      ? semver.prerelease(version)[1]
      : 0

  return {
    ...input,
    version,
    $MAJOR: semver.major(version),
    $MINOR: semver.minor(version),
    $PATCH: semver.patch(version),
    $BUILD: prerelease
  }
}

const getTemplatableVersion = input => {
  const templatableVersion = {
    $NEXT_MAJOR_VERSION: splitSemVer({ ...input, inc: 'major' }),
    $NEXT_MINOR_VERSION: splitSemVer({ ...input, inc: 'minor' }),
    $NEXT_PATCH_VERSION: splitSemVer({ ...input, inc: 'patch' }),
    $NEXT_BUILD_VERSION: splitSemVer({ ...input, inc: 'prerelease' }),
    $INPUT_VERSION: splitSemVer(input, 'inputVersion'),
    $RESOLVED_VERSION: null
  }

  templatableVersion.$RESOLVED_VERSION =
    templatableVersion.$INPUT_VERSION || templatableVersion.$NEXT_PATCH_VERSION

  if (!templatableVersion.$NEX) return templatableVersion
}

const coerceVersion = input => {
  if (!input) {
    return null
  }

  return typeof input === 'object'
    ? semver.parse(input.tag_name.substr(input.tag_name.search(/\d/)), {
        includePrerelease: true
      }) ||
        semver.parse(input.name.substr(input.name.search(/\d/)), {
          includePrerelease: true
        })
    : semver.coerce(input)
}

module.exports.getVersionInfo = (release, template, inputVersion = null) => {
  const version = coerceVersion(release)
  inputVersion = coerceVersion(inputVersion)

  if (!version && !inputVersion) {
    return undefined
  }

  return {
    ...getTemplatableVersion({
      version,
      template,
      inputVersion
    })
  }
}
