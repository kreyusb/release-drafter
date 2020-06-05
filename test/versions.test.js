const { getVersionInfo } = require('../lib/versions')
const { sortReleases } = require('../lib/releases')

describe('versions', () => {
  it('sort with a device name', () => {
    const labels = Array(
      {
        tag_name: 'Orion_v1.1.1-Dev11',
        published_at: new Date(98, 2).toString()
      },
      {
        tag_name: 'Orion_v1.1.2-Dev0',
        published_at: new Date(98, 4).toString()
      },
      {
        tag_name: 'Orion_v1.1.1-Rel12',
        published_at: new Date(98, 3).toString()
      },
      {
        tag_name: 'Orion_v1.1.1-Rel10',
        published_at: new Date(98, 1).toString()
      }
    )

    const sorted = sortReleases(labels)

    expect(sorted[0].tag_name).toEqual('Orion_v1.1.1-Rel10')
    expect(sorted[1].tag_name).toEqual('Orion_v1.1.1-Dev11')
    expect(sorted[2].tag_name).toEqual('Orion_v1.1.1-Rel12')
    expect(sorted[3].tag_name).toEqual('Orion_v1.1.2-Dev0')
  })

  it('extracts a version-like string from the last tag', () => {
    const versionInfo = getVersionInfo({
      tag_name: 'v10.0.3',
      name: 'Some release'
    })

    expect(versionInfo.$NEXT_MAJOR_VERSION.version).toEqual('11.0.0')
    expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual('10.1.0')
    expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual('10.0.4')
  })

  it('extracts a version-like string from the last release name if the tag isnt a version', () => {
    const versionInfo = getVersionInfo({
      tag_name: 'notaproperversion',
      name: '10.0.3'
    })

    expect(versionInfo.$NEXT_MAJOR_VERSION.version).toEqual('11.0.0')
    expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual('10.1.0')
    expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual('10.0.4')
  })

  it('preferences tags over release names', () => {
    const versionInfo = getVersionInfo({
      tag_name: '10.0.3',
      name: '8.1.0'
    })

    expect(versionInfo.$NEXT_MAJOR_VERSION.version).toEqual('11.0.0')
    expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual('10.1.0')
    expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual('10.0.4')
  })

  it('handles alpha/beta releases', () => {
    const versionInfo = getVersionInfo({
      tag_name: 'v10.0.3-alpha',
      name: 'Some release'
    })

    expect(versionInfo.$NEXT_MAJOR_VERSION.version).toEqual('11.0.0')
    expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual('10.1.0')
    expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual('10.0.4')
  })

  it('handles TBCT formatting', () => {
    const versionInfo = getVersionInfo({
      tag_name: 'orion_v10.0.1-alpha.3',
      name: 'orion_v10.0.1-alpha.3'
    })

    expect(versionInfo.$NEXT_MAJOR_VERSION.version).toEqual('11.0.0-alpha.0')
    expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual('10.1.0-alpha.0')
    expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual('10.0.2-alpha.0')
    expect(versionInfo.$NEXT_BUILD_VERSION.version).toEqual('10.0.1-alpha.4')

    expect(versionInfo.$NEXT_BUILD_VERSION.$BUILD).toEqual(4)
  })

  it('returns undefined if no version was found in tag or name', () => {
    const versionInfo = getVersionInfo({
      tag_name: 'nope',
      name: 'nope nope nope'
    })

    expect(versionInfo).toEqual(undefined)
  })
})
